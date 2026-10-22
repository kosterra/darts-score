/**
 * Elimination for the rules engine: up to the target score, landing on an
 * opponent's score sends them back to 0, with the out mode of the game.
 *
 * No texts and no React here: the API keeps a copy of this file.
 */
import { DARTS_PER_VISIT, replayGame } from './engine.js';

export const ELIMINATION_SETTINGS = ['targetScore', 'gameInMode', 'gameOutMode'];

const filled = (dart) => dart && String(dart).trim() !== '';

export const dartScore = (dart) => {
    if (!dart || String(dart).trim() === '' || Number(dart) === 0) return 0;
    let score = Number(String(dart).slice(1));
    if (/^t/i.test(dart)) score *= 3;
    if (/^d/i.test(dart)) score *= 2;
    return score;
};

export const scoreRangeLabel = (score) => {
    if (score === 0) return '0';
    if (score === 180) return '180';
    if (score >= 1 && score <= 40) return '1-40';
    if (score >= 41 && score <= 60) return '41-60';
    if (score >= 61 && score <= 80) return '61-80';
    if (score >= 81 && score <= 100) return '81-100';
    if (score >= 101 && score <= 120) return '101-120';
    if (score >= 121 && score <= 140) return '121-140';
    if (score >= 141 && score <= 160) return '141-160';
    if (score >= 161 && score <= 180) return '161-180';
    return null;
};

export const newEliminationPlayer = () => ({
    hasWonGame: false,
    score: 0,
    totalThrow: { darts: 0, rounds: 0 },
    bestThreeDarts: 0,
    scoreRanges: {},
    hit: {},
});

export const newEliminationState = (settings, players) => ({
    ...Object.fromEntries(ELIMINATION_SETTINGS.map(key => [key, settings[key]])),
    numberOfPlayers: players.length,
    isSoloGame: players.length === 1,
    gameIsRunning: true,
    hasWinner: false,
    players: [...players],
    startingPlayer: players[0] ?? '',
    currentPlayerTurn: players[0] ?? '',
    currentThrow: ['', '', ''],
    allThrows: [],
    playerModels: Object.fromEntries(players.map(id => [id, newEliminationPlayer()])),
});

/**
 * What the darts of a visit do, dart by dart: { busted, winner, score (the
 * thrower's after the visit), roundScore, eliminations (players sent back to 0) }.
 */
export const eliminationVisitOutcome = (game, currentThrow) => {
    const playerId = game.currentPlayerTurn;
    const target = game.targetScore;
    const outMode = game.gameOutMode;
    const scores = Object.fromEntries(Object.keys(game.playerModels).map(id => [id, game.playerModels[id]?.score ?? 0]));
    let running = scores[playerId] ?? 0;
    let roundScore = 0;
    const eliminations = [];
    for (const dart of currentThrow) {
        if (!filled(dart)) continue;
        const points = dartScore(dart);
        const projected = running + points;
        let bust = false;
        if (projected > target) bust = true;
        else if (projected === target) {
            if (outMode === 'Double Out' && !/^d/i.test(dart)) bust = true;
            if (outMode === 'Master Out' && !/^[dt]/i.test(dart)) bust = true;
        } else if (outMode === 'Double Out' && projected === target - 1) bust = true;
        if (bust) return { busted: true, winner: false, score: scores[playerId] ?? 0, roundScore: 0, eliminations: [] };
        game.players.filter(id => id !== playerId).forEach(id => {
            if (scores[id] === projected && projected > 0) {
                eliminations.push(id);
                scores[id] = 0;
            }
        });
        running = projected;
        roundScore += points;
        scores[playerId] = running;
        if (running === target) return { busted: false, winner: true, score: running, roundScore, eliminations };
    }
    return { busted: false, winner: false, score: running, roundScore, eliminations };
};

/**
 * The game after one visit of the player at the oche. Changes "game" itself.
 */
export const eliminationVisit = (game, darts) => {
    const playerId = game.currentPlayerTurn;
    const currentThrow = [...darts, '', '', ''].slice(0, DARTS_PER_VISIT).map(dart => (dart == null ? '' : String(dart)));
    const model = game.playerModels[playerId];
    const count = currentThrow.filter(filled).length;
    const outcome = eliminationVisitOutcome(game, currentThrow);
    const totalThrow = { darts: (model.totalThrow?.darts ?? 0) + count, rounds: (model.totalThrow?.rounds ?? 0) + 1 };
    const next = () => { game.currentPlayerTurn = game.players[(game.players.indexOf(playerId) + 1) % game.players.length]; };

    if (outcome.busted) {
        // a bust is a visit too: its darts count
        game.playerModels[playerId] = { ...model, totalThrow };
        game.allThrows = [...game.allThrows, { darts: currentThrow, playerId, roundScore: 0, scoreLeft: Math.max(game.targetScore - (model.score ?? 0), 0), bust: true }];
        game.currentThrow = ['', '', ''];
        next();
        return game;
    }
    outcome.eliminations.forEach(id => { game.playerModels[id] = { ...game.playerModels[id], score: 0 }; });
    const label = scoreRangeLabel(outcome.roundScore);
    game.playerModels[playerId] = {
        ...model,
        score: outcome.score,
        totalThrow,
        bestThreeDarts: Math.max(model.bestThreeDarts ?? 0, outcome.roundScore),
        scoreRanges: label ? { ...(model.scoreRanges ?? {}), [label]: (model.scoreRanges?.[label] ?? 0) + 1 } : (model.scoreRanges ?? {}),
    };
    game.allThrows = [...game.allThrows, { darts: currentThrow, playerId, roundScore: outcome.roundScore, scoreLeft: Math.max(game.targetScore - outcome.score, 0) }];
    game.currentThrow = ['', '', ''];
    if (outcome.winner) {
        Object.assign(game, { gameIsRunning: false, hasWinner: true });
        game.playerModels[playerId].hasWonGame = true;
        return game;
    }
    next();
    return game;
};

export const ELIMINATION = {
    id: 'elimination',
    minPlayers: 1,
    maxPlayers: 4,
    init: (settings, players) => newEliminationState(settings, players),
    visit: (state, id, darts) => eliminationVisit(state, darts.map(dart => dart.field ?? dart)),
    current: (state) => (state.hasWinner ? null : state.currentPlayerTurn),
    over: (state) => state.hasWinner,
    playerOf: (state, id) => state.playerModels[id],
    score: (player) => player.score ?? 0,
};

export const eliminationSettingsOf = (game) => Object.fromEntries(ELIMINATION_SETTINGS.map(key => [key, game[key]]));

// the whole game from what is stored ({ targetScore, …, players, visits })
export const replayElimination = (stored) => {
    const { state } = replayGame(ELIMINATION, { players: stored.players, settings: eliminationSettingsOf(stored), visits: stored.visits ?? [] });
    const keep = Object.fromEntries(Object.entries(stored).filter(([key]) => !(key in state)));
    return { ...keep, ...state, visits: stored.visits ?? [] };
};
