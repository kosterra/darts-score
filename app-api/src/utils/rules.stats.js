import { RULES_GAMES, RULES_TRAININGS } from './rules.kinds.js';
import { boardKeyOf, boardOf, trainingOf } from '../rules/trainings.js';

/**
 * A player's games of the rules engine per kind:
 * { [kind]: { games, wins } }, only the kinds played.
 */
export const rulesKpis = (games, playerId) => {
    const kpis = {};
    for (const game of games) {
        if (!RULES_GAMES[game.kind]) continue;
        const entry = kpis[game.kind] ?? (kpis[game.kind] = { games: 0, wins: 0 });
        entry.games += 1;
        if (game.playerModels?.[playerId]?.hasWonGame === true) entry.wins += 1;
    }
    return kpis;
};

/**
 * A player's trainings of the rules engine per kind (oldest first):
 * { [kind]: { count, best, latest: [score, …] (the last ten), board } }.
 * count is every attempt of the kind; the best and the latest are those of the
 * board the player played most (the latest of them on a tie): a score is only
 * compared with the same settings (see boardOf). board: its settings, e.g.
 * { attempts: 20, darts: 9 } ({} where a kind has one board).
 */
export const rulesTrainingBests = (trainings) => {
    const kinds = {};
    for (const training of trainings) {
        const rules = RULES_TRAININGS[training.kind];
        if (!rules) continue;
        const definition = trainingOf(training.kind);
        const kind = kinds[training.kind] ?? (kinds[training.kind] = { count: 0, boards: new Map() });
        kind.count += 1;
        const key = boardKeyOf(definition, training.settings);
        const board = kind.boards.get(key) ?? { count: 0, best: null, latest: [], board: boardOf(definition, training.settings) };
        // the board played last goes last, so it wins a tie
        kind.boards.delete(key);
        kind.boards.set(key, board);
        board.count += 1;
        if (board.best === null || (rules.higherIsBetter ? training.score > board.best : training.score < board.best)) board.best = training.score;
        board.latest = [...board.latest, training.score].slice(-10);
    }
    return Object.fromEntries(Object.entries(kinds).map(([kind, { count, boards }]) => {
        const most = [...boards.values()].reduce((top, board) => (!top || board.count >= top.count ? board : top), null);
        return [kind, { count, best: most.best, latest: most.latest, board: most.board }];
    }));
};

/**
 * The trainings of the same board as these settings, as a condition for the
 * database: { 'settings.attempts': 20, … }; a training saved without a setting
 * is on the default's board. {} for a kind with one board.
 */
export const boardCondition = (kind, settings) => {
    const definition = trainingOf(kind);
    const parts = Object.entries(boardOf(definition, settings)).map(([key, value]) => {
        const option = definition.options.find(entry => entry.key === key);
        const field = `settings.${key}`;
        return value === option.default ? { $or: [{ [field]: value }, { [field]: { $exists: false } }, { [field]: null }] } : { [field]: value };
    });
    return parts.length ? { $and: parts } : {};
};

// whether two trainings of a kind are on the same board
export const sameBoard = (kind, a, b) => {
    const definition = trainingOf(kind);
    return !definition || boardKeyOf(definition, a) === boardKeyOf(definition, b);
};
