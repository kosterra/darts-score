import { describe, expect, it } from 'vitest';
import { CLOCK_LEVEL, CRICKET_LEVEL, ELIMINATION_LEVEL, LEVELS, X01_LEVEL, judgeLevel, playLevel } from './levels.play';
import { replayGame, replayTraining } from './engine';
import { BASEBALL, GAMES, GOLF, HALVE_IT, KILLER, SCRAM, SHANGHAI, TACTICS } from './games';
import { BOBS_27, BULLS, CATCH_40, CHECKOUT_121, DOUBLES_AROUND, LADDER, RANDOM_CHECKOUTS, SCORING, SHORTEST_LEG, TRAININGS, TREBLES } from './trainings';

const levelOf = (value, bands, lowerIsBetter) => playLevel(value, { bands, lowerIsBetter });
const visit = (player, ...darts) => ({ player, darts });
const playerLevel = (definition, visits, settings = {}, players = ['a', 'b'], id = 'a') => {
    const replay = replayGame(definition, { players, settings, visits });
    return judgeLevel(definition.level, replay.state.players[id], replay.state, replay.settings)?.level ?? null;
};
const trainingLevel = (definition, result, settings = {}) => judgeLevel(definition.level, result, settings)?.level ?? null;

describe('playLevel', () => {
    it('has four levels from pub to world class', () => {
        expect(LEVELS).toEqual(['pub', 'amateur', 'pro', 'worldClass']);
    });

    it('reaches a level at its band', () => {
        const bands = [50, 75, 95];
        expect(levelOf(0, bands)).toBe('pub');
        expect(levelOf(49.9, bands)).toBe('pub');
        expect(levelOf(50, bands)).toBe('amateur');
        expect(levelOf(74.9, bands)).toBe('amateur');
        expect(levelOf(75, bands)).toBe('pro');
        expect(levelOf(95, bands)).toBe('worldClass');
        expect(levelOf(180, bands)).toBe('worldClass');
        expect(levelOf('82.5', bands)).toBe('pro');
    });

    it('turns round when lower is better', () => {
        const bands = [24, 17, 13];
        expect(levelOf(25, bands, true)).toBe('pub');
        expect(levelOf(24, bands, true)).toBe('amateur');
        expect(levelOf(18, bands, true)).toBe('amateur');
        expect(levelOf(17, bands, true)).toBe('pro');
        expect(levelOf(14, bands, true)).toBe('pro');
        expect(levelOf(13, bands, true)).toBe('worldClass');
        expect(levelOf(9, bands, true)).toBe('worldClass');
    });

    it('has none without a figure or bands', () => {
        expect(levelOf(null, [1, 2, 3])).toBeNull();
        expect(levelOf(undefined, [1, 2, 3])).toBeNull();
        expect(levelOf(Number.NaN, [1, 2, 3])).toBeNull();
        expect(levelOf('–', [1, 2, 3])).toBeNull();
        expect(levelOf(5, null)).toBeNull();
        expect(levelOf(5, [1, 2])).toBeNull();
    });
});

describe('judgeLevel', () => {
    it('gives the level, what it was judged by and the figure as shown', () => {
        expect(judgeLevel(X01_LEVEL, { average: 82.46, dartsThrown: 30 })).toEqual({ level: 'pro', by: 'the 3-dart average', value: '82.5' });
        expect(judgeLevel(null, {})).toBeNull();
    });

    it('takes bands that depend on the settings', () => {
        const definition = { by: 'x', of: (value) => value, bands: (value, settings) => (settings.hard ? [1, 2, 3] : [10, 20, 30]) };
        expect(judgeLevel(definition, 5, { hard: true }).level).toBe('worldClass');
        expect(judgeLevel(definition, 5, { hard: false }).level).toBe('pub');
    });
});

describe('the levels of the older games', () => {
    it('judges X01 by the 3-dart average from nine darts on', () => {
        expect(judgeLevel(X01_LEVEL, { average: 45, dartsThrown: 60 }).level).toBe('pub');
        expect(judgeLevel(X01_LEVEL, { average: 60, dartsThrown: 60 }).level).toBe('amateur');
        expect(judgeLevel(X01_LEVEL, { average: 99.3, dartsThrown: 60 }).level).toBe('worldClass');
        expect(judgeLevel(X01_LEVEL, { average: 99.3, dartsThrown: 6 })).toBeNull();
        expect(judgeLevel(X01_LEVEL, { average: null, dartsThrown: 0 })).toBeNull();
    });

    it('judges Cricket by the marks per round', () => {
        expect(judgeLevel(CRICKET_LEVEL, { marksPerRound: 1.8, dartsThrown: 30 }).level).toBe('pub');
        expect(judgeLevel(CRICKET_LEVEL, { marksPerRound: 3.2, dartsThrown: 30 })).toMatchObject({ level: 'pro', value: '3.20' });
        expect(judgeLevel(CRICKET_LEVEL, { marksPerRound: 4, dartsThrown: 30 }).level).toBe('worldClass');
        expect(judgeLevel(CRICKET_LEVEL, { marksPerRound: 4, dartsThrown: 3 })).toBeNull();
    });

    it('judges Elimination by the average per visit, also from visits typed as scores', () => {
        expect(judgeLevel(ELIMINATION_LEVEL, { average: 55, dartsThrown: 12, visits: 4 }).level).toBe('amateur');
        expect(judgeLevel(ELIMINATION_LEVEL, { average: 80, dartsThrown: 0, visits: 3 }).level).toBe('pro');
        expect(judgeLevel(ELIMINATION_LEVEL, { average: 80, dartsThrown: 0, visits: 2 })).toBeNull();
    });

    it('judges Around the Clock by the hit rate, by mode', () => {
        const result = { darts: 40, hitRate: 52 };
        expect(judgeLevel(CLOCK_LEVEL, result, 'All').level).toBe('amateur');
        expect(judgeLevel(CLOCK_LEVEL, result, 'Single').level).toBe('amateur');
        expect(judgeLevel(CLOCK_LEVEL, result, 'Double').level).toBe('worldClass');
        expect(judgeLevel(CLOCK_LEVEL, result, 'Triple').level).toBe('worldClass');
        expect(judgeLevel(CLOCK_LEVEL, { darts: 60, hitRate: 35 }, 'Double').level).toBe('pro');
        expect(judgeLevel(CLOCK_LEVEL, { darts: 5, hitRate: 100 }, 'All')).toBeNull();
        expect(judgeLevel(CLOCK_LEVEL, result, 'Unknown')).toBeNull();
    });
});

describe('the levels of the newer games', () => {
    it('has one for every game, judged by a text', () => {
        for (const definition of GAMES) {
            expect(definition.level, definition.id).toBeTruthy();
            expect(typeof definition.level.by, definition.id).toBe('string');
        }
    });

    it('judges Shanghai by the points for the rounds played', () => {
        // three rounds: 2, 3 and 4 marks a round on 1 to 3 are 12, 18 and 24 points
        const rounds = (a) => [visit('a', ...a[0]), visit('b', '0', '0', '0'), visit('a', ...a[1]), visit('b', '0', '0', '0'), visit('a', ...a[2]), visit('b', '0', '0', '0')];
        expect(playerLevel(SHANGHAI, rounds([['S1', '0', '0'], ['S2', '0', '0'], ['S3', '0', '0']]))).toBe('pub');
        expect(playerLevel(SHANGHAI, rounds([['T1', '0', '0'], ['T2', '0', '0'], ['T3', '0', '0']]))).toBe('pro');
        expect(playerLevel(SHANGHAI, rounds([['T1', 'S1', '0'], ['T2', 'S2', '0'], ['T3', 'S3', '0']]))).toBe('worldClass');
        // two rounds are too few darts
        expect(playerLevel(SHANGHAI, [visit('a', 'T1', 'T1', 'T1'), visit('b', '0', '0', '0'), visit('a', 'T2', 'T2', 'T2')])).toBeNull();
    });

    it('judges Killer by the doubles that counted', () => {
        const visits = [
            visit('a', 'D1', 'D2', 'D2'), visit('b', '0', '0', '0'),
            visit('a', 'D2', '0', '0'), visit('b', '0', '0', '0'),
            visit('a', '0', '0', '0'),
        ];
        // own double, then three lives of b: 4 of 9 darts
        expect(playerLevel(KILLER, visits.slice(0, 4), { lives: 5, numbers: { a: 1, b: 2 } })).toBeNull();
        expect(playerLevel(KILLER, visits, { lives: 5, numbers: { a: 1, b: 2 } })).toBe('worldClass');
        expect(playerLevel(KILLER, [visit('a', 'S1', '0', '0'), visit('b', '0', '0', '0'), visit('a', '0', '0', '0'), visit('b', '0', '0', '0'), visit('a', 'D1', '0', '0')], { lives: 3, numbers: { a: 1, b: 2 } })).toBe('amateur');
    });

    it('judges Halve-It by the points of a game played to the end, not with a club\'s own targets', () => {
        const nine = (darts) => Array.from({ length: 9 }, () => [visit('a', ...darts), visit('b', '0', '0', '0')]).flat();
        // every round missed: 40 halved nine times
        expect(playerLevel(HALVE_IT, nine(['0', '0', '0']))).toBe('pub');
        expect(playerLevel(HALVE_IT, nine(['0', '0', '0']).slice(0, 8))).toBeNull();
        expect(playerLevel(HALVE_IT, nine(['0', '0', '0']), { targetList: ['20', '20', '20', '20', '20', '20', '20', '20', '20'] })).toBeNull();
        // the short targets: 20, any double, 18, any treble, 19, bull
        const short = [['T20', 'T20', 'T20'], ['D20', 'D20', 'D20'], ['T18', 'T18', 'T18'], ['T20', 'T20', 'T20'], ['T19', 'T19', 'T19'], ['D25', 'D25', 'D25']];
        expect(playerLevel(HALVE_IT, short.map(darts => [visit('a', ...darts), visit('b', '0', '0', '0')]).flat(), { targets: 'short' })).toBe('worldClass');
    });

    it('judges Golf by the strokes per hole, from three holes on', () => {
        const holes = (dart, count) => Array.from({ length: count }, (_, index) => [visit('a', dart(index + 1)), visit('b', '0')]).flat();
        expect(playerLevel(GOLF, holes(hole => `S${hole}`, 3))).toBe('pub');
        expect(playerLevel(GOLF, holes(hole => `D${hole}`, 3))).toBe('worldClass');
        expect(playerLevel(GOLF, holes(hole => `D${hole}`, 2))).toBeNull();
    });

    it('judges Tactics by the marks per round', () => {
        const visits = Array.from({ length: 3 }, () => [visit('a', 'T20', 'S19', '0'), visit('b', '0', '0', '0')]).flat();
        expect(playerLevel(TACTICS, visits)).toBe('worldClass');
        expect(playerLevel(TACTICS, visits, {}, ['a', 'b'], 'b')).toBe('pub');
    });

    it('judges Baseball by the runs per inning on the numbers', () => {
        const innings = (runs) => Array.from({ length: 3 }, (_, index) => [visit('a', ...runs(index + 1)), visit('b', '0', '0', '0')]).flat();
        expect(playerLevel(BASEBALL, innings(inning => [`S${inning}`, `S${inning}`, `S${inning}`]))).toBe('pro');
        expect(playerLevel(BASEBALL, innings(inning => [`S${inning}`, '0', '0']))).toBe('pub');
    });

    it('judges Scram by the numbers closed as stopper', () => {
        const visits = [visit('a', 'S20', 'S19', 'S18'), visit('b', '0', '0', '0'), visit('a', 'S17', '0', '0')];
        // 4 of 6 darts
        expect(playerLevel(SCRAM, visits)).toBe('amateur');
        expect(playerLevel(SCRAM, visits.slice(0, 2))).toBeNull();
        expect(playerLevel(SCRAM, visits, {}, ['a', 'b'], 'b')).toBeNull();
    });
});

describe('the levels of the trainings', () => {
    it('has one for every training, judged by a text', () => {
        for (const definition of TRAININGS) {
            expect(definition.level, definition.id).toBeTruthy();
            expect(typeof definition.level.by, definition.id).toBe('string');
        }
    });

    it('judges them by their result with the bands fixed or proposed', () => {
        expect(trainingLevel(BOBS_27, { score: 0 })).toBe('pub');
        expect(trainingLevel(BOBS_27, { score: 399 })).toBe('amateur');
        expect(trainingLevel(BOBS_27, { score: 800 })).toBe('worldClass');
        expect(trainingLevel(SCORING, { score: 76.2 })).toBe('pro');
        expect(trainingLevel(DOUBLES_AROUND, { score: 84 })).toBe('pro');
        expect(trainingLevel(DOUBLES_AROUND, { score: 300 })).toBe('pub');
        expect(trainingLevel(SHORTEST_LEG, { score: 25 })).toBe('pub');
        expect(trainingLevel(SHORTEST_LEG, { score: 15 })).toBe('pro');
        expect(trainingLevel(SHORTEST_LEG, { score: 12 })).toBe('worldClass');
        expect(trainingLevel(RANDOM_CHECKOUTS, { score: 30 })).toBe('pro');
        expect(trainingLevel(CATCH_40, { score: 40 })).toBe('amateur');
        expect(trainingLevel(TREBLES, { score: 40 })).toBe('worldClass');
        expect(trainingLevel(BULLS, { score: 10 })).toBe('pub');
    });

    it('raises the bands of the checkout climbs with more attempts and fewer darts', () => {
        expect(trainingLevel(CHECKOUT_121, { score: 0 }, { darts: 9, attempts: 10 })).toBe('pub');
        expect(trainingLevel(CHECKOUT_121, { score: 118 }, { darts: 9, attempts: 10 })).toBe('amateur');
        expect(trainingLevel(CHECKOUT_121, { score: 118 }, { darts: 6, attempts: 10 })).toBe('pro');
        expect(trainingLevel(CHECKOUT_121, { score: 121 }, { darts: 9, attempts: 10 })).toBe('pro');
        expect(trainingLevel(CHECKOUT_121, { score: 121 }, { darts: 9, attempts: 20 })).toBe('amateur');
        expect(trainingLevel(LADDER, { score: 71 }, { attempts: 20 })).toBe('pro');
        expect(trainingLevel(LADDER, { score: 71 }, { attempts: 40 })).toBe('amateur');
    });

    it('judges a training replayed from its darts', () => {
        const done = replayTraining(SCORING, { settings: { darts: 30 }, darts: Array(30).fill('T20') });
        expect(judgeLevel(SCORING.level, done.result, done.settings)).toEqual({ level: 'worldClass', by: 'the 3-dart average', value: '180.0' });
    });
});
