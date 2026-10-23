import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { BADGES, BADGE_CATEGORIES, SHAME_BADGES, currentWeekStreak, getBadge } from '../utils/badges.js';
import { clubShameHolders, isShameChild, personalShame, shameCountsFrom, shameMinAgeOf } from '../utils/shame.js';
import { gameModelOf, syncPlayerBadges, syncGameBadges } from '../utils/badge.service.js';
import { knownInClub } from '../models/player.model.js';

const shameEnabled = (club) => club?.shameBadges !== false;
const getShame = (id) => SHAME_BADGES.find(badge => badge.id === id) ?? { id, title: id, description: '', wash: '' };
// eslint-disable-next-line no-unused-vars
export const publicShameBadge = ({ metric, washMetric, ...badge }) => badge;

/**
 * All badges for one player: the earned ones with their date and the open
 * ones with the progress towards them.
 */
export const getPlayerBadges = async (req, res) => {
    logger.debug('player badges called');
    const player = db.mongoose.isValidObjectId(req.params.id)
        ? await db.player.findOne({ _id: req.params.id, ...knownInClub(req.club._id) })
        : null;
    if (!player) return res.status(404).json({ message: 'Player not found.' });
    const { metrics } = await syncPlayerBadges(player);
    const earnedById = new Map(player.badges.map(entry => [entry.badge, entry]));

    res.json({
        player: {
            id: String(player._id),
            firstname: player.firstname,
            lastname: player.lastname,
            nickname: player.nickname,
            profileImg: player.profileImg,
        },
        categories: BADGE_CATEGORIES,
        weekStreak: { current: currentWeekStreak(metrics), best: metrics.bestWeekStreak },
        earnedCount: BADGES.filter(badge => earnedById.has(badge.id)).length,
        // the Hall of Shame, unless the club switched it off or leaves this child out
        shame: shameEnabled(req.club) && !isShameChild(player, shameMinAgeOf(req.club))
            ? personalShame(player, { from: shameCountsFrom(player, shameMinAgeOf(req.club)) }).map(entry => ({ ...publicShameBadge(getShame(entry.id)), ...entry }))
            : null,
        total: BADGES.length,
        badges: BADGES.map(badge => {
            const earned = earnedById.get(badge.id);
            return {
                ...badge,
                earned: earned ? { earnedAt: earned.earnedAt, sourceType: earned.sourceType, sourceId: earned.sourceId } : null,
                // for "lower" badges (fewest darts) the best so far, 0 when there is none yet
                progress: badge.lower ? Math.floor(metrics[badge.metric] ?? 0) : Math.min(Math.floor(metrics[badge.metric] ?? 0), badge.target),
            };
        }),
    });
};

/**
 * The badges each player earned in one particular game. Also makes sure the
 * badges of a just finished game are worked out, whoever asks first.
 */
export const getGameBadges = async (req, res) => {
    logger.debug('game badges called');
    const { type, id } = req.params;
    const model = gameModelOf(type);
    const game = model && db.mongoose.isValidObjectId(id)
        ? await model().findOne({ _id: id, club: req.club._id }).lean()
        : null;
    if (!game) return res.status(404).json({ message: 'Game not found.' });

    if (game.hasWinner) await syncGameBadges(req.club._id, game);

    const ids = (game.players ?? []).filter(playerId => db.mongoose.isValidObjectId(playerId));
    const players = await db.player.find({ _id: { $in: ids }, ...knownInClub(req.club._id) }, 'badges dateOfBirth shame shameWashes').lean();

    res.json({
        finished: Boolean(game.hasWinner),
        players: players
            .map(player => ({
                player: String(player._id),
                badges: (player.badges ?? []).filter(entry => entry.sourceId === id).map(entry => getBadge(entry.badge)).filter(Boolean),
            }))
            .filter(entry => entry.badges.length > 0),
        // the Hall of Shame of this game: what each player got in it and what they washed off
        shame: shameEnabled(req.club) ? gameShame(players, id, shameMinAgeOf(req.club)) : [],
    });
};

/**
 * Per player the shame badges they got in one game and the ones they washed
 * off in it. Children of a club that leaves them out are not listed.
 */
export const gameShame = (players, gameId, minAge) => players
    .filter(player => !isShameChild(player, minAge))
    .map(player => {
        const from = shameCountsFrom(player, minAge);
        return {
            player: String(player._id),
            got: (player.shame ?? [])
                .filter(entry => entry.sourceId === gameId && (!from || new Date(entry.at) >= from))
                .map(entry => ({ ...publicShameBadge(getShame(entry.badge)), count: entry.count ?? 1 })),
            washed: (player.shameWashes ?? [])
                .filter(entry => entry.sourceId === gameId)
                .map(entry => publicShameBadge(getShame(entry.badge))),
        };
    })
    .filter(entry => entry.got.length > 0 || entry.washed.length > 0);

const LATEST_BADGES = 3;

const RECENT_BADGES = 12;
const RARE_BADGES = 8;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Badge overview of the club: every player with how many badges they have
 * and the ones they earned most recently; the badges earned lately in the
 * club, the rarest ones (one or two players have them) and those nobody has
 * yet (easiest first), and how many were earned in all and lately.
 */
export const clubBadgeOverview = (players, now = new Date()) => {
    const ref = (player) => ({ id: String(player._id), nickname: player.nickname, firstname: player.firstname, lastname: player.lastname, profileImg: player.profileImg });
    const earnedOf = (player) => (player.badges ?? []).filter(entry => getBadge(entry.badge));
    const holders = new Map();
    const all = [];
    for (const player of players) {
        for (const entry of earnedOf(player)) {
            all.push({ player, entry });
            holders.set(entry.badge, [...(holders.get(entry.badge) ?? []), player]);
        }
    }
    const since = now.getTime() - 30 * DAY;
    const tierOf = (badge) => badge.tier ?? 1;

    return {
        total: BADGES.length,
        earned: all.length,
        earnedLast30Days: all.filter(({ entry }) => new Date(entry.earnedAt).getTime() >= since).length,
        collectors: players.filter(player => earnedOf(player).length > 0).length,
        players: players
            .map(player => {
                const earned = earnedOf(player);
                return {
                    id: String(player._id),
                    firstname: player.firstname,
                    lastname: player.lastname,
                    nickname: player.nickname,
                    profileImg: player.profileImg,
                    earnedCount: earned.length,
                    weekStreak: {
                        current: player.activity ? currentWeekStreak(player.activity) : 0,
                        best: player.activity?.bestWeekStreak ?? 0,
                    },
                    latest: [...earned].sort((a, b) => b.earnedAt - a.earnedAt).slice(0, LATEST_BADGES).map(entry => getBadge(entry.badge)),
                };
            })
            .sort((a, b) => b.earnedCount - a.earnedCount || a.nickname.localeCompare(b.nickname)),
        recent: [...all]
            .sort((a, b) => new Date(b.entry.earnedAt) - new Date(a.entry.earnedAt))
            .slice(0, RECENT_BADGES)
            .map(({ player, entry }) => ({ player: ref(player), badge: getBadge(entry.badge), earnedAt: entry.earnedAt })),
        // held by one or two players: the higher the tier, the rarer
        rare: [...holders.entries()]
            .filter(([, list]) => list.length <= 2)
            .map(([id, list]) => ({ badge: getBadge(id), holders: list.map(ref) }))
            .sort((a, b) => a.holders.length - b.holders.length || tierOf(b.badge) - tierOf(a.badge))
            .slice(0, RARE_BADGES),
        // nobody has them yet: the first tiers first, as the next to go for
        unclaimed: BADGES.filter(badge => !holders.has(badge.id)).sort((a, b) => tierOf(a) - tierOf(b)),
    };
};

export const getClubBadges = async (req, res) => {
    logger.debug('club badges called');
    const players = await db.player
        .find({ clubs: req.club._id, guest: { $ne: true } }, 'firstname lastname nickname profileImg badges activity')
        .lean();
    res.json(clubBadgeOverview(players));
};

/**
 * The Hall of Shame of the club: who holds each shame badge right now, with
 * the game they got it in. Empty when the club switched it off.
 */
export const getClubShame = async (req, res) => {
    logger.debug('club shame called');
    if (!shameEnabled(req.club)) return res.json({ enabled: false, badges: [] });
    const players = await db.player
        .find({ clubs: req.club._id, guest: { $ne: true } }, 'firstname lastname nickname profileImg dateOfBirth shame shameWashes')
        .lean();
    const byId = new Map(players.map(player => [String(player._id), player]));

    res.json({
        enabled: true,
        minAge: shameMinAgeOf(req.club),
        badges: clubShameHolders(players, req.club._id, { minAge: shameMinAgeOf(req.club) }).map(entry => {
            const player = entry.holder ? byId.get(entry.holder) : null;
            return {
                ...publicShameBadge(getShame(entry.id)),
                ...entry,
                holder: player
                    ? { id: String(player._id), nickname: player.nickname, firstname: player.firstname, lastname: player.lastname, profileImg: player.profileImg }
                    : null,
            };
        }),
    });
};
