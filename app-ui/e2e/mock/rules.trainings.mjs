// The scoreboard of the trainings of the rules engine (Bob's 27, …):
// /__test/rules-trainings { scenario: 'bobs27' } some attempts of the club with
// their darts, so an attempt opens to its doubles; { scenario: 'trebles' } three Treble practices of
// the first player at T20 (30 darts), at a treble rate of 40 % each; any other scenario: none.
import { trainingOf } from '../../../app-api/src/rules/trainings.js';
import { replayTraining } from '../../../app-api/src/rules/engine.js';

// the same darts on every run: a hit when the next of these numbers is below the rate
const seeded = (seed) => () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
};

const attempt = (kind, rate, random) => {
    const definition = trainingOf(kind);
    const darts = [];
    while (!replayTraining(definition, { settings: {}, darts }).done) darts.push(random() < rate ? 'H' : 'M');
    return { darts, result: replayTraining(definition, { settings: {}, darts }).result };
};

export const seedRulesTrainings = (players, scenario) => {
    globalThis.rulesTrainings = [];
    if (scenario === 'trebles') {
        // 12 trebles in 30 darts: 40 %, the usual rate the curve of a new attempt is measured against
        const darts = Array.from({ length: 30 }, (_, index) => (index % 5 < 2 ? 'T20' : 'S20'));
        const result = replayTraining(trainingOf('trebles'), { settings: { number: 20, darts: 30 }, darts }).result;
        [1, 3, 5].forEach((daysAgo, number) => globalThis.rulesTrainings.push({
            id: `rt${number + 1}`, club: 'c1', kind: 'trebles', settings: { number: 20, darts: 30 }, darts, score: result.score, result,
            player: { id: players[0].id, nickname: players[0].nickname }, createdAt: new Date(Date.now() - daysAgo * 864e5).toISOString(),
        }));
        return;
    }
    if (scenario !== 'bobs27') return;
    const random = seeded(27);
    // newest first, as the API lists them; the last two fail before the bull (0 points)
    [[0, 0.45, 1], [1, 0.3, 2], [2, 0.55, 3], [0, 0.35, 6], [3, 0.25, 9], [1, 0.4, 12], [4, 0.05, 13], [5, 0.1, 14]].forEach(([index, rate, daysAgo], number) => {
        const player = players[index];
        const { darts, result } = attempt('bobs27', rate, random);
        globalThis.rulesTrainings.push({
            id: `rt${number + 1}`, club: 'c1', kind: 'bobs27', settings: {}, darts, score: result.score, result,
            player: { id: player.id, nickname: player.nickname }, createdAt: new Date(Date.now() - daysAgo * 864e5).toISOString(),
        });
    });
};
