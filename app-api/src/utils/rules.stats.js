import { RULES_GAMES, RULES_TRAININGS } from './rules.kinds.js';

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
 * { [kind]: { count, best, latest: [score, …] (the last ten) } }.
 */
export const rulesTrainingBests = (trainings) => {
    const bests = {};
    for (const training of trainings) {
        const rules = RULES_TRAININGS[training.kind];
        if (!rules) continue;
        const entry = bests[training.kind] ?? (bests[training.kind] = { count: 0, best: null, latest: [] });
        entry.count += 1;
        if (entry.best === null || (rules.higherIsBetter ? training.score > entry.best : training.score < entry.best)) entry.best = training.score;
        entry.latest = [...entry.latest, training.score].slice(-10);
    }
    return bests;
};
