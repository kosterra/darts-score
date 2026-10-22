/**
 * Cricket for the rules engine: 15 to 20 and the bull, in the variants
 * Standard, Cut-throat and No-score, with the marks and figures of the players
 * as the app has always counted them (also where that counting is peculiar,
 * so that every game played so far comes out the same).
 *
 * No texts and no React here: the API keeps a copy of this file.
 */
import { DARTS_PER_VISIT, replayGame } from './engine.js';

export const CRICKET_NUMBERS = ['15', '16', '17', '18', '19', '20', '25'];
export const DEFAULT_VARIANT = 'Standard';
export const variantOf = (game) => game?.variant ?? DEFAULT_VARIANT;

const filled = (dart) => dart && String(dart).trim() !== '';
const isValid = (dart) => {
    if (!dart || Number(dart) === 0) return true;
    if (/^[SDT]\d{1,2}$/i.test(dart)) {
        const value = Number(dart.slice(1));
        if ((value >= 1 && value <= 20) || /^[SD]25$/i.test(dart)) return true;
    }
    return false;
};
const marksOf = (dart) => (/^t/i.test(dart) ? 3 : /^d/i.test(dart) ? 2 : /^s/i.test(dart) ? 1 : 0);

export const newCricketPlayer = () => ({
    hasWonGame: false,
    score: 0,
    totalThrow: { game: { darts: 0, rounds: 0 } },
    hit: {},
    sectionHit: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 },
});

export const newCricketState = (settings, players) => ({
    variant: settings.variant ?? DEFAULT_VARIANT,
    startingScore: 0,
    numberOfPlayers: players.length,
    isSoloGame: false,
    gameIsRunning: true,
    hasWinner: false,
    players: [...players],
    currentPlayerTurn: players[0] ?? '',
    currentThrow: ['', '', ''],
    allThrows: [],
    playerModels: Object.fromEntries(players.map(id => [id, newCricketPlayer()])),
});

// whether every opponent of the player at the oche has closed the number
const closedByOthers = (game, number) => game.players
    .filter(id => id !== game.currentPlayerTurn)
    .every(id => game.playerModels[id].sectionHit[String(number)] >= 3);
// closed for everybody, the player at the oche included
const closedForAll = (game, number) => closedByOthers(game, number)
    && game.playerModels[game.currentPlayerTurn].sectionHit[String(number)] >= 3;

export const allClosed = (sectionHit) => CRICKET_NUMBERS.every(number => sectionHit[number] >= 3);

/**
 * The marks of the player at the oche after the darts of the visit so far
 * (beyond three only where an opponent still has the number open, and never
 * in No-score).
 */
export const sectionHitAfter = (game, currentThrow) => {
    const sectionHit = { ...game.playerModels[game.currentPlayerTurn].sectionHit };
    currentThrow.filter(filled).forEach(dart => {
        const section = Number(String(dart).slice(1));
        if (section < 15 || closedForAll(game, section)) return;
        const key = String(section);
        if (!sectionHit[key]) sectionHit[key] = 0;
        sectionHit[key] += marksOf(dart);
        if (((!closedForAll(game, section) && closedByOthers(game, section)) || variantOf(game) === 'No-score') && sectionHit[key] > 3) {
            sectionHit[key] = 3;
        }
    });
    return sectionHit;
};

/**
 * The score of the player at the oche after the darts of the visit so far:
 * in Standard the points of all their marks beyond three, counted as the app
 * always has; in the other variants their score stays.
 */
export const scoreAfter = (game, currentThrow) => {
    const model = game.playerModels[game.currentPlayerTurn];
    const sectionHit = { ...model.sectionHit };
    const countOf = (count, section) => {
        const others = closedByOthers(game, section);
        const closed = closedForAll(game, section);
        if (!closed || !others) count += sectionHit[section];
        if (!closed && others && sectionHit[section] + count > 3) count = 3;
        if (closed && others) count = sectionHit[section];
        return count;
    };
    currentThrow.forEach(dart => {
        if (!isValid(dart) || !filled(dart)) return;
        const section = Number(String(dart).slice(1));
        if (section < 15) return;
        const marks = marksOf(dart);
        if (marks) sectionHit[String(section)] = countOf(marks, section);
    });
    if (variantOf(game) !== 'Standard') return model.score ?? 0;
    if (!currentThrow.some(filled)) return model.score;
    return [15, 16, 17, 18, 19, 20, 25].reduce((total, number) => {
        const marks = sectionHit[number] ?? 0;
        return total + (marks > 3 ? (marks - 3) * number : 0);
    }, 0);
};

/**
 * Cut-throat: the points each opponent gets from a visit, from the marks
 * beyond three that the visit added (only while they have the number open).
 */
export const cutThroatPoints = (game, playerId, before = {}, after = {}) => {
    const opponents = game.players.filter(id => id !== playerId);
    const points = Object.fromEntries(opponents.map(id => [id, 0]));
    for (const number of CRICKET_NUMBERS) {
        const extra = Math.max(0, (after[number] ?? 0) - Math.max(before[number] ?? 0, 3));
        if (!extra) continue;
        for (const id of opponents) {
            if ((game.playerModels[id]?.sectionHit?.[number] ?? 0) < 3) points[id] += extra * Number(number);
        }
    }
    return points;
};

// whether a player who has closed every number wins with this score
export const winsWithScore = (variant, score, otherScores) => {
    if (variant === 'No-score') return true;
    if (variant === 'Cut-throat') return otherScores.every(other => score <= other);
    // a tie is enough: once everything is closed nobody could score any more
    return otherScores.every(other => score >= other);
};

// whether this score wins once every number is closed, with what the visit gives the others in cut-throat
export const scoreWins = (game, score, sectionHit) => {
    const variant = variantOf(game);
    const current = game.currentPlayerTurn;
    const given = variant === 'Cut-throat' ? cutThroatPoints(game, current, game.playerModels[current].sectionHit, sectionHit) : {};
    const others = game.players.filter(id => id !== current).map(id => (game.playerModels[id].score ?? 0) + (given[id] ?? 0));
    return winsWithScore(variant, score, others);
};

/**
 * The game after one visit of the player at the oche. Changes "game" itself.
 */
export const cricketVisit = (game, darts) => {
    const playerId = game.currentPlayerTurn;
    const model = game.playerModels[playerId];
    const currentThrow = [...darts, '', '', ''].slice(0, DARTS_PER_VISIT).map(dart => (dart == null ? '' : String(dart)));
    const sectionHit = sectionHitAfter(game, currentThrow);
    const score = scoreAfter(game, currentThrow);
    const scoresBefore = Object.fromEntries(game.players.map(id => [id, game.playerModels[id].score ?? 0]));
    const won = allClosed(sectionHit) && scoreWins(game, score, sectionHit);

    game.allThrows = [...game.allThrows, { darts: currentThrow, playerId }];
    if (variantOf(game) === 'Cut-throat') {
        const points = cutThroatPoints(game, playerId, model.sectionHit, sectionHit);
        Object.entries(points).filter(([, value]) => value > 0).forEach(([id, value]) => { game.playerModels[id].score = scoresBefore[id] + value; });
    }
    if (!model.totalThrow.game) model.totalThrow.game = { darts: 0, rounds: 0 };
    model.totalThrow.game.darts += currentThrow.filter(filled).length;
    model.totalThrow.game.rounds += 1;
    model.score = score;
    model.sectionHit = sectionHit;
    for (const dart of currentThrow.filter(filled)) {
        const key = Number(dart) === 0 ? 'Missed' : dart.toUpperCase();
        model.hit[key] = (model.hit[key] ?? 0) + 1;
    }
    game.currentThrow = ['', '', ''];

    if (won) {
        Object.assign(game, { gameIsRunning: false, hasWinner: true });
        model.hasWonGame = true;
        return game;
    }
    game.currentPlayerTurn = game.players[(game.players.indexOf(playerId) + 1) % game.players.length];
    return game;
};

export const CRICKET = {
    id: 'cricket',
    minPlayers: 1,
    maxPlayers: 4,
    init: (settings, players) => newCricketState(settings, players),
    visit: (state, id, darts) => cricketVisit(state, darts.map(dart => dart.field ?? dart)),
    current: (state) => (state.hasWinner ? null : state.currentPlayerTurn),
    over: (state) => state.hasWinner,
    playerOf: (state, id) => state.playerModels[id],
    score: (player) => player.score ?? 0,
};

export const cricketSettingsOf = (game) => ({ variant: variantOf(game) });

// the whole game from what is stored ({ variant, players, visits, … })
export const replayCricket = (stored) => {
    const { state } = replayGame(CRICKET, { players: stored.players, settings: cricketSettingsOf(stored), visits: stored.visits ?? [] });
    const keep = Object.fromEntries(Object.entries(stored).filter(([key]) => !(key in state)));
    return { ...keep, ...state, visits: stored.visits ?? [] };
};
