import { describe, expect, it } from 'vitest';
import { AVERAGE_BANDS, CLOCK_LEVEL, CRICKET_LEVEL, ELIMINATION_LEVEL, LEVELS, LEVEL_STEPS, X01_LEVEL, atcTrainingLevelOf, gameLevelOf, judgeLevel, playLevel } from './levels.play';
import { gameOf } from './stored';
import { legsOf, playerFigures } from '../utils/x01.game.summary';
import { cricketFigures, replayCricket as replayCricketSummary } from '../utils/cricket.game.summary';
import { eliminationFigures, replayElimination as replayEliminationSummary } from '../utils/elimination.game.summary';
import { clockResults, replayClock } from '../utils/clock.game';
import { replayGame, replayTraining, settingsOf } from './engine';
import { BASEBALL, GAMES, GOLF, HALVE_IT, KILLER, SCRAM, SHANGHAI, TACTICS } from './games';
import { BOBS_27, BULLS, CATCH_40, CHECKOUT_121, DOUBLES_AROUND, LADDER, RANDOM_CHECKOUTS, SCORING, SHORTEST_LEG, TRAININGS, TREBLES } from './trainings';

const levelOf = (value, bands, lowerIsBetter) => playLevel(value, { bands, lowerIsBetter });
const visit = (player, ...darts) => ({ player, darts });
const playerLevel = (definition, visits, settings = {}, players = ['a', 'b'], id = 'a') => {
    const replay = replayGame(definition, { players, settings, visits });
    return judgeLevel(definition.level, replay.state.players[id], replay.state, replay.settings)?.level ?? null;
};
const trainingLevel = (definition, result, settings = {}) => judgeLevel(definition.level, result, settings)?.level ?? null;
const SIX = [1, 2, 3, 4, 5, 6];

describe('playLevel', () => {
    it('has the seven steps of the average levels, from beginner to elite', () => {
        expect(LEVELS).toEqual(['beginner', 'hobby', 'amateur', 'semiPro', 'pro', 'worldClass', 'elite']);
        expect(LEVEL_STEPS.map(step => step.average)).toEqual([0, 25, 40, 50, 60, 75, 90]);
        expect(AVERAGE_BANDS).toEqual([25, 40, 50, 60, 75, 90]);
    });

    it('reaches a level at its band', () => {
        const bands = AVERAGE_BANDS;
        expect(levelOf(0, bands)).toBe('beginner');
        expect(levelOf(24.9, bands)).toBe('beginner');
        expect(levelOf(25, bands)).toBe('hobby');
        expect(levelOf(39.9, bands)).toBe('hobby');
        expect(levelOf(40, bands)).toBe('amateur');
        expect(levelOf(50, bands)).toBe('semiPro');
        expect(levelOf(60, bands)).toBe('pro');
        expect(levelOf(74.9, bands)).toBe('pro');
        expect(levelOf(75, bands)).toBe('worldClass');
        expect(levelOf(90, bands)).toBe('elite');
        expect(levelOf(180, bands)).toBe('elite');
        expect(levelOf('82.5', bands)).toBe('worldClass');
    });

    it('turns round when lower is better', () => {
        const bands = [42, 31, 24, 20, 17, 14];
        expect(levelOf(43, bands, true)).toBe('beginner');
        expect(levelOf(42, bands, true)).toBe('hobby');
        expect(levelOf(25, bands, true)).toBe('amateur');
        expect(levelOf(24, bands, true)).toBe('semiPro');
        expect(levelOf(20, bands, true)).toBe('pro');
        expect(levelOf(17, bands, true)).toBe('worldClass');
        expect(levelOf(14, bands, true)).toBe('elite');
        expect(levelOf(9, bands, true)).toBe('elite');
    });

    it('has none without a figure or six bands', () => {
        expect(levelOf(null, SIX)).toBeNull();
        expect(levelOf(undefined, SIX)).toBeNull();
        expect(levelOf(Number.NaN, SIX)).toBeNull();
        expect(levelOf('–', SIX)).toBeNull();
        expect(levelOf(5, null)).toBeNull();
        // the bands of the four steps before are no bands any more
        expect(levelOf(5, [1, 2, 3])).toBeNull();
    });
});

describe('judgeLevel', () => {
    it('gives the level, what it was judged by and the figure as shown', () => {
        expect(judgeLevel(X01_LEVEL, { average: 82.46, dartsThrown: 30 })).toEqual({ level: 'worldClass', by: 'the 3-dart average', value: '82.5' });
        expect(judgeLevel(null, {})).toBeNull();
    });

    it('takes bands that depend on the settings', () => {
        const definition = { by: 'x', of: (value) => value, bands: (value, settings) => (settings.hard ? SIX : SIX.map(band => band * 10)) };
        expect(judgeLevel(definition, 5, { hard: true }).level).toBe('worldClass');
        expect(judgeLevel(definition, 5, { hard: false }).level).toBe('beginner');
    });
});

// every level definition: six bands, rising (falling when lower is better), for every setting it knows
describe('the bands of every game and training', () => {
    const ordered = (bands, lowerIsBetter) => bands.every((band, index) => index === 0 || (lowerIsBetter ? band < bands[index - 1] : band > bands[index - 1]));
    const settingsOfAll = (definition) => {
        const options = (definition.options ?? []).filter(option => option.values.length > 1);
        return options.reduce((all, option) => all.flatMap(settings => option.values.map(value => ({ ...settings, [option.key]: value.value }))), [{}])
            .map(settings => settingsOf(definition, settings));
    };

    it('has six steps in order for the older games', () => {
        for (const [name, definition, args] of [['x01', X01_LEVEL, []], ['cricket', CRICKET_LEVEL, []], ['elimination', ELIMINATION_LEVEL, []],
            ...['All', 'Single', 'Double', 'Triple'].map(mode => [mode, CLOCK_LEVEL, [{}, mode]])]) {
            const bands = typeof definition.bands === 'function' ? definition.bands(...args) : definition.bands;
            expect(bands, name).toHaveLength(6);
            expect(ordered(bands), name).toBe(true);
        }
    });

    it('has six steps in order for the trainings, by their settings', () => {
        for (const definition of TRAININGS) {
            for (const settings of settingsOfAll(definition)) {
                const bands = typeof definition.level.bands === 'function' ? definition.level.bands({ score: 1 }, settings) : definition.level.bands;
                expect(bands, `${definition.id} ${JSON.stringify(settings)}`).toHaveLength(6);
                expect(ordered(bands, definition.level.lowerIsBetter), definition.id).toBe(true);
            }
        }
    });

    it('has six steps in order for the newer games, by their settings', () => {
        for (const definition of GAMES) {
            for (const settings of settingsOfAll(definition)) {
                for (const targets of definition.id === 'halveit' ? ['classic', 'short'] : [undefined]) {
                    const all = { ...settings, targets };
                    const bands = typeof definition.level.bands === 'function' ? definition.level.bands({ darts: 21 }, {}, all) : definition.level.bands;
                    expect(bands, definition.id).toHaveLength(6);
                    expect(ordered(bands, definition.level.lowerIsBetter), definition.id).toBe(true);
                }
            }
        }
        // Scram on all the numbers: a dart next door often closes one too
        expect(SCRAM.level.bands({}, {}, { numbers: 'all' })[2]).toBeGreaterThan(SCRAM.level.bands({}, {}, { numbers: 'cricket' })[2]);
    });
});

describe('the levels of the older games', () => {
    it('judges X01 by the 3-dart average from nine darts on', () => {
        expect(judgeLevel(X01_LEVEL, { average: 20, dartsThrown: 60 }).level).toBe('beginner');
        expect(judgeLevel(X01_LEVEL, { average: 45, dartsThrown: 60 }).level).toBe('amateur');
        expect(judgeLevel(X01_LEVEL, { average: 60, dartsThrown: 60 }).level).toBe('pro');
        expect(judgeLevel(X01_LEVEL, { average: 99.3, dartsThrown: 60 }).level).toBe('elite');
        expect(judgeLevel(X01_LEVEL, { average: 99.3, dartsThrown: 6 })).toBeNull();
        expect(judgeLevel(X01_LEVEL, { average: null, dartsThrown: 0 })).toBeNull();
    });

    it('judges Cricket by the marks per round', () => {
        expect(judgeLevel(CRICKET_LEVEL, { marksPerRound: 1.8, dartsThrown: 30 }).level).toBe('hobby');
        expect(judgeLevel(CRICKET_LEVEL, { marksPerRound: 3.2, dartsThrown: 30 })).toMatchObject({ level: 'semiPro', value: '3.20' });
        expect(judgeLevel(CRICKET_LEVEL, { marksPerRound: 4, dartsThrown: 30 }).level).toBe('pro');
        expect(judgeLevel(CRICKET_LEVEL, { marksPerRound: 5, dartsThrown: 30 }).level).toBe('elite');
        expect(judgeLevel(CRICKET_LEVEL, { marksPerRound: 4, dartsThrown: 3 })).toBeNull();
    });

    it('judges Elimination by the average per visit, also from visits typed as scores', () => {
        expect(judgeLevel(ELIMINATION_LEVEL, { average: 55, dartsThrown: 12, visits: 4 }).level).toBe('semiPro');
        expect(judgeLevel(ELIMINATION_LEVEL, { average: 80, dartsThrown: 0, visits: 3 }).level).toBe('worldClass');
        expect(judgeLevel(ELIMINATION_LEVEL, { average: 80, dartsThrown: 0, visits: 2 })).toBeNull();
    });

    it('judges Around the Clock by the hit rate, by mode', () => {
        const result = { darts: 40, hitRate: 52 };
        expect(judgeLevel(CLOCK_LEVEL, result, 'All').level).toBe('hobby');
        expect(judgeLevel(CLOCK_LEVEL, result, 'Single').level).toBe('hobby');
        expect(judgeLevel(CLOCK_LEVEL, result, 'Double').level).toBe('elite');
        expect(judgeLevel(CLOCK_LEVEL, result, 'Triple').level).toBe('elite');
        expect(judgeLevel(CLOCK_LEVEL, { darts: 60, hitRate: 35 }, 'Double').level).toBe('worldClass');
        expect(judgeLevel(CLOCK_LEVEL, { darts: 22, hitRate: 95 }, 'All').level).toBe('elite');
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
        // three rounds on 1 to 3 are worth 6 marks: 2.8 marks a round (semi-pro) are 16.8 points
        const rounds = (a) => [visit('a', ...a[0]), visit('b', '0', '0', '0'), visit('a', ...a[1]), visit('b', '0', '0', '0'), visit('a', ...a[2]), visit('b', '0', '0', '0')];
        expect(playerLevel(SHANGHAI, rounds([['S1', '0', '0'], ['S2', '0', '0'], ['S3', '0', '0']]))).toBe('beginner');
        expect(playerLevel(SHANGHAI, rounds([['T1', '0', '0'], ['T2', '0', '0'], ['T3', '0', '0']]))).toBe('semiPro');
        expect(playerLevel(SHANGHAI, rounds([['T1', 'S1', '0'], ['T2', 'S2', '0'], ['T3', 'S3', '0']]))).toBe('pro');
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
        expect(playerLevel(KILLER, visits, { lives: 5, numbers: { a: 1, b: 2 } })).toBe('elite');
        // 1 of 9: amateur
        expect(playerLevel(KILLER, [visit('a', 'S1', '0', '0'), visit('b', '0', '0', '0'), visit('a', '0', '0', '0'), visit('b', '0', '0', '0'), visit('a', 'D1', '0', '0')], { lives: 3, numbers: { a: 1, b: 2 } })).toBe('amateur');
    });

    it('judges Halve-It by the points of a game played to the end, not with a club\'s own targets', () => {
        const nine = (darts) => Array.from({ length: 9 }, () => [visit('a', ...darts), visit('b', '0', '0', '0')]).flat();
        // every round missed: 40 halved nine times
        expect(playerLevel(HALVE_IT, nine(['0', '0', '0']))).toBe('beginner');
        expect(playerLevel(HALVE_IT, nine(['0', '0', '0']).slice(0, 8))).toBeNull();
        expect(playerLevel(HALVE_IT, nine(['0', '0', '0']), { targetList: ['20', '20', '20', '20', '20', '20', '20', '20', '20'] })).toBeNull();
        // the short targets: 20, any double, 18, any treble, 19, bull
        const short = [['T20', 'T20', 'T20'], ['D20', 'D20', 'D20'], ['T18', 'T18', 'T18'], ['T20', 'T20', 'T20'], ['T19', 'T19', 'T19'], ['D25', 'D25', 'D25']];
        expect(playerLevel(HALVE_IT, short.map(darts => [visit('a', ...darts), visit('b', '0', '0', '0')]).flat(), { targets: 'short' })).toBe('elite');
        // a single of every target of the short six: 40 + 20 + 40 + 18 + 60 + 19 + 25 = 222, semi-pro there
        const singles = [['S20'], ['D20'], ['S18'], ['T20'], ['S19'], ['S25']].map(([dart]) => [visit('a', dart, '0', '0'), visit('b', '0', '0', '0')]).flat();
        expect(playerLevel(HALVE_IT, singles, { targets: 'short' })).toBe('semiPro');
    });

    it('judges Golf by the strokes per hole, from three holes on', () => {
        const holes = (dart, count) => Array.from({ length: count }, (_, index) => [visit('a', dart(index + 1)), visit('b', '0')]).flat();
        expect(playerLevel(GOLF, holes(() => '0', 3))).toBe('beginner');
        expect(playerLevel(GOLF, holes(hole => `S${hole}`, 3))).toBe('hobby');
        expect(playerLevel(GOLF, holes(hole => `T${hole}`, 3))).toBe('pro');
        expect(playerLevel(GOLF, holes(hole => `D${hole}`, 3))).toBe('elite');
        expect(playerLevel(GOLF, holes(hole => `D${hole}`, 2))).toBeNull();
    });

    it('judges Tactics by the marks per round', () => {
        const visits = Array.from({ length: 3 }, () => [visit('a', 'T20', 'S19', '0'), visit('b', '0', '0', '0')]).flat();
        expect(playerLevel(TACTICS, visits)).toBe('pro');
        expect(playerLevel(TACTICS, visits, {}, ['a', 'b'], 'b')).toBe('beginner');
    });

    it('judges Baseball by the runs per inning on the numbers', () => {
        const innings = (runs) => Array.from({ length: 3 }, (_, index) => [visit('a', ...runs(index + 1)), visit('b', '0', '0', '0')]).flat();
        expect(playerLevel(BASEBALL, innings(inning => [`S${inning}`, `S${inning}`, `S${inning}`]))).toBe('semiPro');
        expect(playerLevel(BASEBALL, innings(inning => [`S${inning}`, '0', '0']))).toBe('beginner');
    });

    it('judges Scram by the numbers closed as stopper, by the numbers in play', () => {
        const visits = [visit('a', 'S20', 'S19', 'S18'), visit('b', '0', '0', '0'), visit('a', 'S17', '0', '0')];
        // 4 of 6 darts
        expect(playerLevel(SCRAM, visits)).toBe('amateur');
        expect(playerLevel(SCRAM, visits, { numbers: 'all' })).toBe('hobby');
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

    it('judges them by their result', () => {
        expect(trainingLevel(BOBS_27, { score: 0 })).toBe('beginner');
        expect(trainingLevel(BOBS_27, { score: 120 })).toBe('semiPro');
        expect(trainingLevel(BOBS_27, { score: 399 })).toBe('worldClass');
        expect(trainingLevel(BOBS_27, { score: 800 })).toBe('elite');
        // every dart at T20: higher than an X01 average
        expect(trainingLevel(SCORING, { score: 76.2 })).toBe('pro');
        expect(trainingLevel(DOUBLES_AROUND, { score: 84 })).toBe('pro');
        expect(trainingLevel(DOUBLES_AROUND, { score: 300 })).toBe('hobby');
        expect(trainingLevel(RANDOM_CHECKOUTS, { score: 30 })).toBe('worldClass');
        expect(trainingLevel(CATCH_40, { score: 40 })).toBe('pro');
        expect(trainingLevel(TREBLES, { score: 40 })).toBe('elite');
        expect(trainingLevel(BULLS, { score: 10 })).toBe('hobby');
        expect(trainingLevel(LADDER, { score: 64, done: 9, attempts: 20 })).toBe('worldClass');
        expect(trainingLevel(LADDER, { score: 0, done: 0, attempts: 20 })).toBe('beginner');
    });

    it('judges Shortest leg by the best leg, easier to get low in more legs', () => {
        expect(trainingLevel(SHORTEST_LEG, { score: 25 }, { legs: 3 })).toBe('amateur');
        expect(trainingLevel(SHORTEST_LEG, { score: 15 }, { legs: 3 })).toBe('worldClass');
        expect(trainingLevel(SHORTEST_LEG, { score: 12 }, { legs: 3 })).toBe('elite');
        expect(trainingLevel(SHORTEST_LEG, { score: 21 }, { legs: 3 })).toBe('semiPro');
        expect(trainingLevel(SHORTEST_LEG, { score: 21 }, { legs: 10 })).toBe('semiPro');
        expect(trainingLevel(SHORTEST_LEG, { score: 24 }, { legs: 10 })).toBe('amateur');
    });

    it('raises the bands of 121 Checkout with more attempts and fewer darts', () => {
        expect(trainingLevel(CHECKOUT_121, { score: 0 }, { darts: 9, attempts: 10 })).toBe('beginner');
        expect(trainingLevel(CHECKOUT_121, { score: 118 }, { darts: 9, attempts: 10 })).toBe('hobby');
        expect(trainingLevel(CHECKOUT_121, { score: 118 }, { darts: 6, attempts: 10 })).toBe('amateur');
        expect(trainingLevel(CHECKOUT_121, { score: 121 }, { darts: 9, attempts: 10 })).toBe('amateur');
        expect(trainingLevel(CHECKOUT_121, { score: 140 }, { darts: 9, attempts: 10 })).toBe('elite');
        expect(trainingLevel(CHECKOUT_121, { score: 140 }, { darts: 9, attempts: 50 })).toBe('pro');
    });

    it('judges a training replayed from its darts', () => {
        const done = replayTraining(SCORING, { settings: { darts: 30 }, darts: Array(30).fill('T20') });
        expect(judgeLevel(SCORING.level, done.result, done.settings)).toEqual({ level: 'elite', by: 'the 3-dart average', value: '180.0' });
    });
});

// the API judges a stored game with LEVEL_FIGURES (gameLevelOf): the same as the result pages
// judge the figures of their statistics
describe('the level of a stored game, as the API keeps it', () => {
    const turns = (count, a, b) => Array.from({ length: count }, () => [visit('a', ...a), visit('b', ...b)]).flat();
    const X01 = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'First to', numberOfSets: 1, legMode: 'First to', numberOfLegs: 3, players: ['a', 'b'] };
    const both = (type, game, pageLevel) => ['a', 'b'].forEach(id => {
        expect(gameLevelOf(type, game, id), `${type} ${id}`).toEqual(pageLevel(id));
    });

    it('judges X01 as its statistics page', () => {
        const visitsOf = [
            turns(4, ['S20', 'S20', 'S20'], ['S5', 'S5', 'S5']),
            [...turns(3, ['T20', 'T20', 'T20'], ['T20', 'S20', 'S1']), visit('a', 'T20', 'T19', 'D12')],
            turns(2, ['T20', 'T20', 'T20'], ['0', '0', '0']),
        ];
        for (const visits of visitsOf) {
            const game = gameOf('x01', { ...X01, visits });
            const legs = legsOf(game);
            both('x01', game, (id) => judgeLevel(X01_LEVEL, playerFigures(game, id, legs)));
        }
        expect(gameLevelOf('x01', gameOf('x01', { ...X01, visits: visitsOf[0] }), 'a').level).toBe('pro');
    });

    it('judges Cricket as its statistics page', () => {
        for (const visits of [turns(3, ['T20', 'S19', '0'], ['S20', '0', '0']), turns(5, ['T20', 'T19', 'D25'], ['S15', 'S16', '0'])]) {
            const game = gameOf('cricket', { players: ['a', 'b'], visits });
            const replay = replayCricketSummary(game);
            both('cricket', game, (id) => judgeLevel(CRICKET_LEVEL, cricketFigures(game, id, replay)));
        }
    });

    it('judges Elimination as its statistics page', () => {
        for (const visits of [turns(3, ['S20', 'S20', 'S20'], ['S1', 'S1', 'S1']), turns(4, ['T20', 'T20', 'S20'], ['T19', 'S19', 'S5'])]) {
            const game = gameOf('elimination', { targetScore: 501, gameInMode: 'Straight In', gameOutMode: 'Straight Out', players: ['a', 'b'], visits });
            const replay = replayEliminationSummary(game);
            both('elimination', game, (id) => judgeLevel(ELIMINATION_LEVEL, eliminationFigures(game, id, replay)));
        }
    });

    it('judges Around the Clock as its statistics page, by the mode', () => {
        for (const mode of ['All', 'Single', 'Double', 'Triple']) {
            const game = gameOf('clock', { mode, players: ['a', 'b'], visits: turns(4, ['S1', 'D1', '0'], ['T1', '0', '0']) });
            const results = clockResults(replayClock(game));
            both('clock', game, (id) => judgeLevel(CLOCK_LEVEL, results.find(result => result.playerId === id), game.mode));
        }
    });

    it('judges an Around the Clock training with the fewest darts by its hit rate', () => {
        expect(atcTrainingLevelOf({ scoring: 'Darts', darts: 30, mode: 'All' })).toEqual(judgeLevel(CLOCK_LEVEL, { darts: 30, hitRate: 70 }, 'All'));
        expect(atcTrainingLevelOf({ scoring: 'Time', timeMs: 4000, mode: 'All' })).toBeNull();
    });

    it('has no level for other types', () => {
        expect(gameLevelOf('golf', {}, 'a')).toBeNull();
    });
});
