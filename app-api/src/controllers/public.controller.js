import logger from '../models/logger.model.js';
import db from '../models/db.model.js';

// A game counts as "live" while it is running and was updated this recently;
// games that were simply never finished drop out of the list
const LIVE_WINDOW_MS = 20 * 60 * 1000;
const MAX_LIVE_GAMES = 12;
const MAX_RESULTS = 8;
// The page is public and polled by every open browser, so answers are reused briefly
const CACHE_MS = 10 * 1000;

const HIDDEN_PLAYER = 'Hidden player';

const GAME_TYPES = [
    { type: 'x01', label: 'X01', model: () => db.x01 },
    { type: 'cricket', label: 'Cricket', model: () => db.cricket },
    { type: 'elimination', label: 'Elimination', model: () => db.elimination },
    { type: 'clock', label: 'Around the Clock', model: () => db.clock },
];

const describeFormat = (type, game) => {
    switch (type) {
        case 'x01': return `${game.startingScore} · ${game.setMode} ${game.numberOfSets} sets · ${game.legMode} ${game.numberOfLegs} legs`;
        case 'elimination': return `Target ${game.targetScore}`;
        case 'clock': return `Around the Clock · ${game.mode ?? 'All'}`;
        default: return 'Cricket';
    }
};

/**
 * Reduces a game to what the public page shows. Players only appear with
 * their nickname when they (or their club admin) allowed it.
 */
const summarize = (type, label, game, clubName, playersById) => ({
    id: String(game._id),
    type,
    label,
    club: clubName,
    format: describeFormat(type, game),
    startedAt: game.createdAt,
    updatedAt: game.updatedAt,
    players: (game.players ?? []).map(playerId => {
        const player = playersById.get(playerId);
        const model = game.playerModels?.[playerId] ?? {};
        return {
            name: player?.publicProfile && !player.guest ? player.nickname : HIDDEN_PLAYER,
            score: model.score ?? null,
            ...(type === 'x01' && { sets: model.setsWon ?? 0, legs: model.currentSetLegsWon ?? 0 }),
            isTurn: game.gameIsRunning && game.currentPlayerTurn === playerId,
            isWinner: Boolean(model.hasWonGame),
        };
    }),
});

const loadGames = async (filter, clubIds, limit) => {
    if (clubIds.length === 0) return [];
    const perType = await Promise.all(GAME_TYPES.map(async ({ type, label, model }) => {
        const games = await model().find({ ...filter, club: { $in: clubIds } }).sort({ updatedAt: -1 }).limit(limit).lean();
        return games.map(game => ({ type, label, game }));
    }));
    return perType.flat().sort((a, b) => b.game.updatedAt - a.game.updatedAt).slice(0, limit);
};

const buildOverview = async () => {
    const publicClubs = await db.club.find({ isPublic: true }).sort({ name: 1 }).lean();
    const clubNames = new Map(publicClubs.map(club => [String(club._id), club.name]));
    const idsWhere = (setting) => publicClubs.filter(club => club[setting] !== false).map(club => club._id);

    const [live, results, memberCounts, totals] = await Promise.all([
        loadGames(
            { gameIsRunning: true, hasWinner: { $ne: true }, updatedAt: { $gte: new Date(Date.now() - LIVE_WINDOW_MS) } },
            idsWhere('publicLiveGames'),
            MAX_LIVE_GAMES
        ),
        loadGames({ hasWinner: true }, idsWhere('publicResults'), MAX_RESULTS),
        db.player.aggregate([
            { $match: { clubs: { $in: publicClubs.map(club => club._id) }, guest: { $ne: true } } },
            { $unwind: '$clubs' },
            { $group: { _id: '$clubs', count: { $sum: 1 } } },
        ]),
        Promise.all([
            db.club.countDocuments(),
            db.player.countDocuments({ guest: { $ne: true } }),
            ...GAME_TYPES.map(({ model }) => model().countDocuments({ hasWinner: true })),
        ]),
    ]);

    const playerIds = [...new Set([...live, ...results].flatMap(({ game }) => game.players ?? []))]
        .filter(id => db.mongoose.isValidObjectId(id));
    const players = await db.player.find({ _id: { $in: playerIds } }, 'nickname publicProfile guest').lean();
    const playersById = new Map(players.map(player => [String(player._id), player]));

    const toSummary = ({ type, label, game }) => summarize(type, label, game, clubNames.get(String(game.club)), playersById);
    const countByClub = new Map(memberCounts.map(c => [String(c._id), c.count]));
    const [clubs, playerTotal, ...gameTotals] = totals;

    return {
        totals: { clubs, players: playerTotal, gamesPlayed: gameTotals.reduce((sum, count) => sum + count, 0) },
        clubs: publicClubs.map(club => ({ name: club.name, logo: club.logo || null, playerCount: countByClub.get(String(club._id)) ?? 0, joinPolicy: club.joinPolicy ?? 'closed' })),
        liveGames: live.map(toSummary),
        results: results.map(toSummary),
    };
};

let cache = { expires: 0, data: null };

/**
 * Everything the public start page shows: overall numbers, the public clubs,
 * their running games and latest results. Needs no login.
 */
export const overview = async (req, res) => {
    logger.debug('public overview called');
    if (cache.expires < Date.now()) {
        cache = { data: await buildOverview(), expires: Date.now() + CACHE_MS };
    }
    res.set('Cache-Control', 'public, max-age=5').json(cache.data);
};
