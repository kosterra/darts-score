// The scoreboard of the trainings of the rules engine (Bob's 27, …):
// /__test/rules-trainings { scenario: 'bobs27' } some attempts of the club with
// their darts, so an attempt opens to its doubles; any other scenario: none.
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
    if (scenario !== 'bobs27') return;
    const random = seeded(27);
    // newest first, as the API lists them
    [[0, 0.45, 1], [1, 0.3, 2], [2, 0.55, 3], [0, 0.35, 6], [3, 0.25, 9], [1, 0.4, 12]].forEach(([index, rate, daysAgo], number) => {
        const player = players[index];
        const { darts, result } = attempt('bobs27', rate, random);
        globalThis.rulesTrainings.push({
            id: `rt${number + 1}`, club: 'c1', kind: 'bobs27', settings: {}, darts, score: result.score, result,
            player: { id: player.id, nickname: player.nickname }, createdAt: new Date(Date.now() - daysAgo * 864e5).toISOString(),
        });
    });
};
