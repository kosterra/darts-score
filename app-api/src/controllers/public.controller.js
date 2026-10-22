import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { clubFigures } from '../utils/public.figures.js';
import { getStartPageSettings } from '../utils/start.page.settings.js';

// A game counts as "live" while it is running and was updated this recently;
// games that were simply never finished drop out of the list
const LIVE_WINDOW_MS = 20 * 60 * 1000;
const MAX_LIVE_GAMES = 12;
const MAX_RESULTS = 8;
// The page is public and polled by every open browser, so answers are reused briefly
const CACHE_MS = 10 * 1000;

const HIDDEN_PLAYER = 'Hidden player';
// the figures of the clubs add up every game, so they are worked out less often
const FIGURES_CACHE_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

let figuresCache = { expires: 0, key: '', data: new Map() };

/**
 * The figures of the public clubs: games played (all, the last 30 days), the
 * last game, the busiest weekday, the X01 average and the 180s.
 */
const loadClubFigures = async (clubIds) => {
    const key = clubIds.map(String).sort().join(',');
    if (figuresCache.expires > Date.now() && figuresCache.key === key) return figuresCache.data;
    if (clubIds.length === 0) return new Map();
    const since = new Date(Date.now() - 30 * DAY_MS);
    const finished = { hasWinner: true, club: { $in: clubIds } };
    const [counts, x01] = await Promise.all([
        Promise.all(GAME_TYPES.map(({ model }) => model().aggregate([
            { $match: finished },
            { $group: {
                _id: { club: '$club', weekday: { $dayOfWeek: '$updatedAt' } },
                games: { $sum: 1 },
                recent: { $sum: { $cond: [{ $gte: ['$updatedAt', since] }, 1, 0] } },
                lastAt: { $max: '$updatedAt' },
            } },
        ]))),
        db.x01.aggregate([
            { $match: finished },
            { $project: { club: 1, models: { $objectToArray: { $ifNull: ['$playerModels', {}] } } } },
            { $unwind: '$models' },
            { $group: {
                _id: '$club',
                averageSum: { $sum: { $multiply: [{ $ifNull: ['$models.v.averages.game.overall', 0] }, { $ifNull: ['$models.v.totalThrow.game.rounds', 0] }] } },
                rounds: { $sum: { $ifNull: ['$models.v.totalThrow.game.rounds', 0] } },
                num180s: { $sum: { $ifNull: ['$models.v.scoreRanges.game.180', 0] } },
            } },
        ]),
    ]);
    const data = clubFigures(
        counts.flat().map(({ _id, ...rest }) => ({ club: _id.club, weekday: _id.weekday, ...rest })),
        x01.map(({ _id, ...rest }) => ({ club: _id, ...rest })),
    );
    figuresCache = { expires: Date.now() + FIGURES_CACHE_MS, key, data };
    return data;
};

/**
 * The numbers of the installation, as the start page shows them:
 * { clubs, players, gamesPlayed, gamesThisWeek }.
 */
export const installationNumbers = async () => {
    const weekAgo = new Date(Date.now() - 7 * DAY_MS);
    const [clubs, players, played, thisWeek] = await Promise.all([
        db.club.countDocuments(),
        db.player.countDocuments({ guest: { $ne: true } }),
        Promise.all(GAME_TYPES.map(({ model }) => model().countDocuments({ hasWinner: true }))),
        Promise.all(GAME_TYPES.map(({ model }) => model().countDocuments({ hasWinner: true, updatedAt: { $gte: weekAgo } }))),
    ]);
    const sum = (counts) => counts.reduce((total, count) => total + count, 0);
    return { clubs, players, gamesPlayed: sum(played), gamesThisWeek: sum(thisWeek) };
};

const buildOverview = async () => {
    const publicClubs = await db.club.find({ isPublic: true }).sort({ name: 1 }).lean();
    const clubNames = new Map(publicClubs.map(club => [String(club._id), club.name]));
    const idsWhere = (setting) => publicClubs.filter(club => club[setting] !== false).map(club => club._id);

    // the numbers of the installation only once the global admins show them
    const { showNumbers } = await getStartPageSettings();
    const [live, results, memberCounts, totals, figures] = await Promise.all([
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
        showNumbers ? installationNumbers() : null,
        loadClubFigures(publicClubs.map(club => club._id)),
    ]);

    const playerIds = [...new Set([...live, ...results].flatMap(({ game }) => game.players ?? []))]
        .filter(id => db.mongoose.isValidObjectId(id));
    const players = await db.player.find({ _id: { $in: playerIds } }, 'nickname publicProfile guest').lean();
    const playersById = new Map(players.map(player => [String(player._id), player]));

    const toSummary = ({ type, label, game }) => summarize(type, label, game, clubNames.get(String(game.club)), playersById);
    const countByClub = new Map(memberCounts.map(c => [String(c._id), c.count]));

    return {
        // null while the global admins keep the numbers to themselves
        totals,
        clubs: publicClubs.map(club => ({
            name: club.name,
            description: club.description ?? '',
            country: club.country ?? '',
            logo: club.logo || null,
            createdAt: club.createdAt,
            playerCount: countByClub.get(String(club._id)) ?? 0,
            joinPolicy: club.joinPolicy ?? 'closed',
            ...(figures.get(String(club._id)) ?? { gamesPlayed: 0, gamesLast30Days: 0, lastGameAt: null, x01Average: null, num180s: 0, busiestDay: null }),
        })),
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
