import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { BADGES, BADGE_CATEGORIES, currentWeekStreak, getBadge } from '../utils/badges.js';
import { GAME_MODELS, syncPlayerBadges, syncGameBadges } from '../utils/badge.service.js';

/**
 * All badges for one player: the earned ones with their date and the open
 * ones with the progress towards them.
 */
export const getPlayerBadges = async (req, res) => {
    logger.debug('player badges called');
    const player = await db.player.findOne({ _id: req.params.id, club: req.club._id });
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
        total: BADGES.length,
        badges: BADGES.map(badge => {
            const earned = earnedById.get(badge.id);
            return {
                ...badge,
                earned: earned ? { earnedAt: earned.earnedAt, sourceType: earned.sourceType, sourceId: earned.sourceId } : null,
                progress: Math.min(Math.floor(metrics[badge.metric] ?? 0), badge.target),
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
    const model = GAME_MODELS[type];
    const game = model && db.mongoose.isValidObjectId(id)
        ? await model().findOne({ _id: id, club: req.club._id }).lean()
        : null;
    if (!game) return res.status(404).json({ message: 'Game not found.' });

    if (game.hasWinner) await syncGameBadges(req.club._id, game);

    const ids = (game.players ?? []).filter(playerId => db.mongoose.isValidObjectId(playerId));
    const players = await db.player.find({ _id: { $in: ids }, club: req.club._id }, 'badges').lean();

    res.json({
        finished: Boolean(game.hasWinner),
        players: players
            .map(player => ({
                player: String(player._id),
                badges: (player.badges ?? []).filter(entry => entry.sourceId === id).map(entry => getBadge(entry.badge)).filter(Boolean),
            }))
            .filter(entry => entry.badges.length > 0),
    });
};

const LATEST_BADGES = 3;

/**
 * Badge overview of the club: every player with how many badges they have
 * and the ones they earned most recently.
 */
export const getClubBadges = async (req, res) => {
    logger.debug('club badges called');
    const players = await db.player
        .find({ club: req.club._id, guest: { $ne: true } }, 'firstname lastname nickname profileImg badges activity')
        .lean();

    res.json({
        total: BADGES.length,
        players: players
            .map(player => {
                const earned = (player.badges ?? []).filter(entry => getBadge(entry.badge));
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
    });
};
