import { randomBytes } from 'node:crypto';
import db from '../models/db.model.js';
import { hashToken } from './auth.tokens.js';
import { getAppUrl } from './mail.utils.js';
import { removeProfileImageIfUnused } from './player.images.js';

/**
 * Claim links: with one a player without a login takes over their player with
 * an account of their own, with all their games, statistics and badges. An
 * admin shows or prints it (as a QR code) on a club night; the mails to a
 * player whose address the club keeps carry one too.
 */

export const CLAIM_DAYS = 30;

/**
 * A new claim link of a player, valid for CLAIM_DAYS days.
 */
export const claimLink = async (player, clubId, createdBy, days = CLAIM_DAYS) => {
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await db.playerClaim.create({ player: player._id, club: clubId, tokenHash: hashToken(token), expiresAt, createdBy });
    return `${getAppUrl()}/claim/${token}`;
};

// the open claims of a player: how many, and until when the last one works
export const claimsOf = async (playerId) => {
    const claims = await db.playerClaim.find({ player: playerId, expiresAt: { $gt: new Date() } }, 'expiresAt').lean();
    return { count: claims.length, until: claims.reduce((last, claim) => (!last || claim.expiresAt > last ? claim.expiresAt : last), null) };
};

/**
 * The claim of a token, with its player and club, or null when it is
 * unknown, expired, or its player has a login already.
 */
export const findClaim = async (token) => {
    if (typeof token !== 'string' || token.length < 20) return null;
    const claim = await db.playerClaim.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).lean();
    if (!claim) return null;
    const [player, club] = await Promise.all([
        db.player.findById(claim.player),
        db.club.findById(claim.club, 'name logo'),
    ]);
    if (!player || player.user || !club) return null;
    return { claim, player, club };
};

/**
 * Links a player to an account: the account plays as them from now on, with
 * its name, and one picture for all its players. Resolves to an error text
 * when the account plays as someone else in one of the player's clubs.
 */
export const linkPlayerToAccount = async (player, user) => {
    // one account is one player per club, also in the player's other clubs
    const other = await db.player.findOne({ clubs: { $in: player.clubs }, user: user._id, _id: { $ne: player._id } });
    if (other) return `This account already plays as ${other.nickname} in a club of this player.`;

    player.user = user._id;
    player.guest = false;
    player.firstname = user.firstname;
    player.lastname = user.lastname;
    const pictured = await db.player.findOne({ user: user._id, _id: { $ne: player._id }, profileImg: { $nin: ['', null] } }, 'profileImg');
    if (pictured) {
        const previousImg = player.profileImg;
        player.profileImg = pictured.profileImg;
        await player.save();
        if (previousImg && previousImg !== player.profileImg) await removeProfileImageIfUnused(previousImg);
    } else {
        await player.save();
        if (player.profileImg) await db.player.updateMany({ user: user._id, _id: { $ne: player._id } }, { $set: { profileImg: player.profileImg } });
    }
    // with a login of their own, the claim links and the address the club kept are no longer needed
    await Promise.all([
        db.playerClaim.deleteMany({ player: player._id }),
        db.playerContact.deleteMany({ player: player._id }),
    ]);
    return null;
};
