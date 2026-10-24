import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { createGameFilterQuery, findFilteredGames, profileFiltersOf } from '../utils/game.utils.js';
import { clockKpis, cricketKpis, eliminationKpis } from '../utils/kpi.data.js';
import { isRulesGame } from '../utils/rules.kinds.js';
import { viewOf } from '../utils/game.view.js';
import { countBadges, getShameBadge } from '../utils/badges.js';
import { isShameChild, shameMinAgeOf } from '../utils/shame.js';
import { seesTrainingsOf } from '../utils/training.privacy.js';
import { RATING_MIN_GAMES, RATING_START, clubRatings, duelRecord, opponentsOf, rulesFigures, winChances, x01Highlights } from '../utils/compare.js';
import { calculateX01PlayersStats } from './players.x01.stats.controller.js';
import { calculatePlayerStats } from './player.stats.controller.js';

const MODELS = {
    x01: () => db.x01,
    cricket: () => db.cricket,
    elimination: () => db.elimination,
    clock: () => db.clock,
};
export const COMPARE_TYPES = [...Object.keys(MODELS), 'shanghai', 'killer', 'halveit', 'golf', 'tactics'];
// a comparison has at most as many players as the charts have colours
export const MAX_COMPARED = 8;
const tooMany = (req, res) => {
    if (req.body.playerIds.length <= MAX_COMPARED) return false;
    res.status(422).json({ errors: [`Compare at most ${MAX_COMPARED} players.`] });
    return true;
};

// the club's rating, from what its games added to it (see club.tally.model.js)
const loadRatings = async (clubId) => clubRatings(await db.clubTally.find({ club: clubId }, 'at players winners friendly').lean());
const ratingOf = (ratings, playerId) => {
    const entry = ratings.get(String(playerId)) ?? { rating: RATING_START, games: 0 };
    return { ...entry, provisional: entry.games < RATING_MIN_GAMES };
};

// the formats the club set up for a game type, to filter by: [{ id, name }]
const clubFormatsOf = (club, type) => (club.gameRules?.formats ?? [])
    .filter(format => format?.game === type && format.id)
    .map(format => ({ id: String(format.id), name: format.name ?? '' }));

// the X01 formats the players played together, for the format filter
const x01FormatsOf = (games) => {
    const unique = new Map();
    for (const { setMode, numberOfSets, legMode, numberOfLegs } of games) {
        const key = `${setMode}|${numberOfSets}|${legMode}|${numberOfLegs}`;
        if (setMode && legMode && !unique.has(key)) unique.set(key, { setMode, numberOfSets, legMode, numberOfLegs });
    }
    return [...unique.values()];
};

// what the timeline of winners needs of a game
const summaryOf = (game) => ({
    id: String(game._id),
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    players: (game.players ?? []).map(String),
    playerModels: Object.fromEntries(Object.entries(game.playerModels ?? {}).map(([id, model]) => [id, { hasWonGame: Boolean(model?.hasWonGame), score: model?.score ?? null, ...(model?.legsWon && { legsWon: { game: Number(model.legsWon.game ?? 0) || 0 } }) }])),
});

// the highlights with each player's 180s in all the club's games beside those of the duel
const withClub180s = (highlights, totals) => Object.fromEntries(Object.entries(highlights)
    .map(([id, entry]) => [id, { ...entry, total180s: Math.max(totals[id] ?? 0, entry.num180s) }]));

// a player's figures of one game type in the duel
const figuresOf = (type, games, playerId) => {
    if (type === 'cricket') return cricketKpis(games, playerId);
    if (type === 'elimination') return eliminationKpis(games, playerId);
    if (type === 'clock') return clockKpis(games, playerId);
    if (isRulesGame(type)) return rulesFigures(type, games, playerId);
    return {};
};

/**
 * The bad moments of the duel: the Hall of Shame badges the players got in
 * these games, unless the club has none or leaves the player out.
 */
const duelShame = async (club, playerIds, gameIds) => {
    if (club.shameBadges === false || !gameIds.size) return [];
    const minAge = shameMinAgeOf(club);
    const players = await db.player.find({ _id: { $in: playerIds } }, 'dateOfBirth shame').lean();
    return players
        .filter(player => !isShameChild(player, minAge))
        .flatMap(player => (player.shame ?? [])
            .filter(entry => gameIds.has(String(entry.sourceId)))
            .map(entry => {
                const badge = getShameBadge(entry.badge);
                return badge ? { playerId: String(player._id), id: badge.id, title: badge.title, description: badge.description, count: entry.count ?? 1, at: entry.at, gameId: String(entry.sourceId) } : null;
            })
            .filter(Boolean))
        .sort((a, b) => new Date(b.at) - new Date(a.at));
};

/**
 * The badges each player earned in the games of the duel, and their whole
 * collection: { [playerId]: { earned, total } }.
 */
const duelBadges = async (playerIds, gameIds) => {
    const players = await db.player.find({ _id: { $in: playerIds } }, 'badges').lean();
    return Object.fromEntries(players.map(player => [String(player._id), {
        earned: countBadges((player.badges ?? []).filter(entry => gameIds.has(String(entry.sourceId)))),
        total: countBadges(player.badges),
    }]));
};

/**
 * Each player's 180s in all the club's games, from what the games added to it.
 */
const club180s = async (clubId, playerIds) => {
    const tallies = await db.clubTally.find({ club: clubId, players: { $in: playerIds } }, 'byPlayer').lean();
    return Object.fromEntries(playerIds.map(id => [id, tallies.reduce((sum, tally) => sum + (tally.byPlayer?.[id]?.num180s ?? 0), 0)]));
};

/**
 * Head to head of two or more players in one game type (the nine games):
 * everything the comparison shows in one answer — the record (wins, legs and
 * sets, streak, the last results, who beats whom), each player's figures, the
 * highlights and bad moments of their duels, the club's rating with the
 * chances for the next game, the filters to offer and, for X01, the charts.
 * Body: { playerIds, type, includeOthers, dateFilter, from, to, lastGames,
 * startingScore, format, friendly: 'include' | 'exclude', clubFormat }
 */
export const getDuel = async (req, res) => {
    logger.debug('compare duel called');
    const type = req.body.type ?? 'x01';
    if (tooMany(req, res)) return;
    if (!COMPARE_TYPES.includes(type)) return res.status(422).json({ errors: [`type must be one of ${COMPARE_TYPES.join(', ')}.`] });
    const playerIds = req.body.playerIds.map(String);
    const x01 = type === 'x01';
    const rules = isRulesGame(type);
    // starting score and format belong to X01 only
    const filters = x01 ? req.body : { ...req.body, startingScore: undefined, format: undefined };
    const query = { ...createGameFilterQuery(filters), club: req.club._id, ...(rules && { kind: type }) };
    const Model = rules ? db.rulesGame : MODELS[type]();

    try {
        const [found, ratings, together] = await Promise.all([
            findFilteredGames(Model, query, filters, true),
            loadRatings(req.club._id),
            // the X01 formats played together, whatever the other filters
            x01 ? db.x01.find({ ...createGameFilterQuery({ playerIds, includeOthers: req.body.includeOthers }), club: req.club._id }, 'setMode numberOfSets legMode numberOfLegs').lean() : [],
        ]);
        // X01 with its legs and sets, worked out from the visits
        const games = x01 ? found.map(game => viewOf('x01', game)) : found;
        const record = duelRecord(games, playerIds, { type });
        const wins = record.wins;
        const gameIds = new Set(games.map(game => String(game._id)));

        res.json({
            type,
            playedGames: games.length,
            record,
            players: playerIds.map(playerId => ({ id: playerId, wins: wins[playerId] ?? 0, ...figuresOf(type, games, playerId) })),
            games: games.map(summaryOf),
            highlights: x01 ? withClub180s(x01Highlights(games, playerIds), await club180s(req.club._id, playerIds)) : null,
            shame: await duelShame(req.club, playerIds, gameIds),
            // the badges each earned in these games, and their whole collection
            badges: await duelBadges(playerIds, gameIds),
            ratings: Object.fromEntries(playerIds.map(id => [id, ratingOf(ratings, id)])),
            chances: winChances(ratings, playerIds),
            filterOptions: {
                formats: x01FormatsOf(together),
                clubFormats: clubFormatsOf(req.club, type),
            },
            // the charts of X01, from the same filters
            x01: x01 && games.length ? await calculateX01PlayersStats({ ...req.body, playerIds, club: req.club._id }) : null,
        });
    } catch (err) {
        logger.error(err, 'Failed to compare the players');
        res.status(500).json({ message: 'The players could not be compared.' });
    }
};

// a number with one decimal, or null
const one = (value) => (Number.isFinite(Number(value)) && value !== null ? Math.round(Number(value) * 10) / 10 : null);

/**
 * Each player on their own, side by side: their figures from all their games
 * (also when they never played each other), per game type, their trainings,
 * level, rating and badges. Body: { playerIds, scope, dateFilter, from, to, lastGames }
 */
export const getSideBySide = async (req, res) => {
    logger.debug('compare side by side called');
    if (tooMany(req, res)) return;
    const playerIds = req.body.playerIds.map(String);
    const filters = profileFiltersOf({
        scope: req.body.scope === 'all' ? 'all' : 'club',
        period: req.body.dateFilter,
        from: req.body.from,
        to: req.body.to,
        lastGames: req.body.lastGames != null ? String(req.body.lastGames) : undefined,
    });
    try {
        const ratings = await loadRatings(req.club._id);
        const players = await Promise.all(playerIds.map(async (playerId) => {
            const stats = await calculatePlayerStats(playerId, filters, req.club._id, { hideTrainings: !(await seesTrainingsOf(req, playerId)) });
            const stored = await db.player.findById(playerId, 'badges').lean();
            const x01 = stats.kpis?.x01 ?? {};
            const checkoutRate = stats.checkouts?.total ? one(stats.checkouts.hit / stats.checkouts.total * 100) : null;
            const games = stats.playedGames?.total ?? 0;
            return {
                id: playerId,
                level: stats.level ? { xp: stats.level.xp, name: stats.level.level?.name ?? null, index: stats.level.level?.index ?? null } : null,
                rating: ratingOf(ratings, playerId),
                badges: countBadges(stored?.badges),
                games,
                wins: stats.wonGames?.total ?? 0,
                winRate: games ? one((stats.wonGames?.total ?? 0) / games * 100) : null,
                playedGames: stats.playedGames,
                wonGames: stats.wonGames,
                x01: {
                    average: one(stats.avg?.overallX01),
                    firstNine: one(x01.firstNineAverage),
                    checkoutRate,
                    highestCheckout: stats.checkouts?.highest ?? null,
                    num180s: stats.num180s ?? 0,
                    tonPlus: x01.tonPlus ?? 0,
                    dartsPerLeg: one(stats.avg?.dartsPerLegX01),
                    bestLeg: x01.bestLeg ?? null,
                },
                cricket: stats.kpis?.cricket ?? {},
                elimination: stats.kpis?.elimination ?? {},
                clock: stats.kpis?.clock ?? {},
                rules: stats.kpis?.rules ?? {},
                trainings: Object.fromEntries(Object.entries(stats.rulesTrainings ?? {}).map(([kind, entry]) => [kind, { count: entry.count, best: entry.best }])),
                trainingSummary: stats.trainingSummary ?? null,
            };
        }));
        res.json({ players, chances: winChances(ratings, playerIds) });
    } catch (err) {
        logger.error(err, 'Failed to put the players side by side');
        res.status(500).json({ message: 'The players could not be compared.' });
    }
};

/**
 * Who a player played most often in the club, for the quick picks of the
 * comparison: [{ playerId, games }].
 */
export const getOpponents = async (req, res) => {
    const tallies = await db.clubTally.find({ club: req.club._id, players: String(req.params.id) }, 'players').lean();
    res.json(opponentsOf(tallies, req.params.id));
};
