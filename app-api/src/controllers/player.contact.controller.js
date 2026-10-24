import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { LANGUAGES } from '../models/user.model.js';
import { CONTACT_TOPICS } from '../rules/notifications.js';
import { CLAIM_DAYS, claimLink, claimsOf, findClaim, linkPlayerToAccount } from '../utils/player.claims.js';
import { issuePasswordLink, INVITE_TOKEN_HOURS } from '../utils/auth.tokens.js';
import { sendClubWelcomeMail } from '../utils/mail.service.js';
import { isMailConfigured } from '../utils/mail.utils.js';
import { isGlobalAdminAccount, NO_CLUB_FOR_GLOBAL_ADMINS } from '../utils/global.admins.js';

/**
 * Players without a login: the address their club keeps for them (with
 * their consent, for the mails its admins chose), the links to take over
 * their player with a login of their own, and sending an unused invitation
 * again. For the club's admins; taking a player over is for the one with
 * the link.
 */

const TOPIC_IDS = CONTACT_TOPICS.map(topic => topic.id);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loadPlayer = async (req, res) => {
    const player = db.mongoose.isValidObjectId(req.params.id)
        ? await db.player.findOne({ _id: req.params.id, clubs: req.club._id })
        : null;
    if (!player) res.status(404).json({ message: 'Player not found.' });
    return player;
};

const contactView = (contact, consentByName = '') => (contact ? {
    email: contact.email,
    language: contact.language,
    topics: contact.topics,
    consentAt: contact.consentAt,
    consentByName,
    unsubscribedAt: contact.unsubscribedAt ?? null,
} : null);

/**
 * The address the club keeps for a player without a login, and their open
 * claim links: { contact, claims: { count, until }, mailEnabled }.
 */
export const getContact = async (req, res) => {
    const player = await loadPlayer(req, res);
    if (!player) return;
    const contact = await db.playerContact.findOne({ player: player._id }).lean();
    const by = contact?.consentBy ? await db.user.findById(contact.consentBy, 'firstname lastname').lean() : null;
    res.json({
        contact: contactView(contact, by ? `${by.firstname} ${by.lastname}` : ''),
        claims: await claimsOf(player._id),
        mailEnabled: isMailConfigured(),
    });
};

/**
 * Keeps an address for a player without a login: { email, topics, language,
 * consent: true } (the admin confirms the player agreed). Saving it again
 * starts the mails again after the player asked for no more only with
 * consent once more.
 */
export const saveContact = async (req, res) => {
    const player = await loadPlayer(req, res);
    if (!player) return;
    if (player.user) return res.status(409).json({ message: 'This player has a login: they choose their notifications themselves.' });
    if (player.guest) return res.status(409).json({ message: 'Make this guest a club member first.' });
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) return res.status(422).json({ errors: ['Enter a valid email address.'] });
    if (req.body.consent !== true) return res.status(422).json({ errors: ['Confirm that the player agreed to get these mails.'] });
    const topics = (Array.isArray(req.body.topics) ? req.body.topics : []).filter(topic => TOPIC_IDS.includes(topic));
    const language = LANGUAGES.includes(req.body.language) ? req.body.language : (req.user.language ?? 'en');
    const contact = await db.playerContact.findOneAndUpdate(
        { player: player._id },
        { $set: { email, topics, language, consentBy: req.user._id, consentAt: new Date(), unsubscribedAt: null } },
        { upsert: true, new: true },
    );
    logger.info(`${req.user.email} keeps an address for player "${player.nickname}" of club "${req.club.name}"`);
    res.json({ contact: contactView(contact.toObject(), `${req.user.firstname} ${req.user.lastname}`), claims: await claimsOf(player._id), mailEnabled: isMailConfigured() });
};

export const removeContact = async (req, res) => {
    const player = await loadPlayer(req, res);
    if (!player) return;
    await db.playerContact.deleteOne({ player: player._id });
    res.json({ contact: null, claims: await claimsOf(player._id), mailEnabled: isMailConfigured() });
};

/**
 * A new claim link of a player without a login: { link, expiresAt }, to show
 * as a QR code, print or pass on.
 */
export const createClaim = async (req, res) => {
    const player = await loadPlayer(req, res);
    if (!player) return;
    if (player.user) return res.status(409).json({ message: 'This player has a login already.' });
    const link = await claimLink(player, req.club._id, req.user._id);
    res.status(201).json({ link, days: CLAIM_DAYS, expiresAt: new Date(Date.now() + CLAIM_DAYS * 24 * 60 * 60 * 1000), claims: await claimsOf(player._id) });
};

// every open claim link of the player stops working
export const revokeClaims = async (req, res) => {
    const player = await loadPlayer(req, res);
    if (!player) return;
    await db.playerClaim.deleteMany({ player: player._id });
    res.json({ claims: await claimsOf(player._id) });
};

/**
 * Sends the invitation of a player's login again, with a new link to choose
 * the password, while the account was never used.
 */
export const resendInvite = async (req, res) => {
    const player = await loadPlayer(req, res);
    if (!player) return;
    const user = player.user ? await db.user.findById(player.user) : null;
    if (!user) return res.status(404).json({ message: 'This player has no login.' });
    if (user.lastLoginAt) return res.status(409).json({ message: 'This login was used already.' });
    if (!isMailConfigured()) return res.status(503).json({ message: 'Email sending is not set up. Ask an admin to reset your password.' });
    const link = issuePasswordLink(user, INVITE_TOKEN_HOURS);
    await user.save();
    sendClubWelcomeMail(user, link, 'player', { club: req.club.name, inviter: `${req.user.firstname} ${req.user.lastname}`, nickname: player.nickname, validHours: INVITE_TOKEN_HOURS, language: req.user.language });
    res.json({ message: 'The invitation was sent again.' });
};

// ---------------------------------------------------------------------------
// Taking over a player with a claim link
// ---------------------------------------------------------------------------

/**
 * Who a claim link is for, before logging in: { nickname, firstname, club }.
 */
export const claimInfo = async (req, res) => {
    const found = await findClaim(req.params.token);
    if (!found) return res.status(404).json({ message: 'This link is not valid any more. Ask an admin of your club for a new one.' });
    const { player, club } = found;
    res.json({ nickname: player.nickname, firstname: player.firstname, club: { id: String(club._id), name: club.name, logo: club.logo ?? '' } });
};

/**
 * Takes over the player of a claim link with the logged-in account.
 */
export const claim = async (req, res) => {
    const found = await findClaim(req.params.token);
    if (!found) return res.status(404).json({ message: 'This link is not valid any more. Ask an admin of your club for a new one.' });
    if (isGlobalAdminAccount(req.user)) return res.status(409).json({ message: NO_CLUB_FOR_GLOBAL_ADMINS });
    const refused = await linkPlayerToAccount(found.player, req.user);
    if (refused) return res.status(409).json({ message: refused });
    logger.info(`${req.user.email} took over player "${found.player.nickname}" of club "${found.club.name}" with a claim link`);
    res.json({ club: String(found.club._id), player: String(found.player._id), nickname: found.player.nickname });
};

/**
 * After registering with a claim link: the new account takes over the player.
 * Resolves to true when it did.
 */
export const claimOnRegister = async (token, user) => {
    const found = await findClaim(token);
    if (!found) return false;
    return !(await linkPlayerToAccount(found.player, user));
};
