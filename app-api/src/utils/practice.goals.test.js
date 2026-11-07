import { describe, expect, it, vi } from 'vitest';

// the weeks are the server's: the tests run in Swiss time, with its change of the clocks
process.env.TZ = 'Europe/Zurich';
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({ default: { mongoose: { Types: { ObjectId: class { toString() { return 'new-id'; } } } } } }));
vi.mock('./notify.js', () => ({ deliverQuietly: vi.fn() }));

const { describeGoal, goalError, isReached, measure, normalizeGoals, nudgeOf, shareOf, streakOf, goalView } = await import('./practice.goals.js');
const { weekRange, weekKey } = await import('../rules/calendar.js');

// an X01 game (or a training against the bot) as the view shows it: a player's average and 180s
const x01 = (id, average, num180s = 0, at = new Date(2026, 10, 3, 20)) => ({
    type: 'x01', at, view: { playerModels: { [id]: { averages: { game: { overall: average } }, scoreRanges: { game: { 180: num180s } } } } },
});
const emptyWeek = () => ({ games: [], atc: [], rules: [], bot: [] });

describe('the week of the goals', () => {
    it('runs from Monday at midnight to the next Monday, Sunday 23:59 still in it', () => {
        const { from, until, key } = weekRange(new Date(2026, 10, 8, 23, 59));
        expect(key).toBe('2026-11-02');
        expect(from).toEqual(new Date(2026, 10, 2, 0, 0));
        expect(until).toEqual(new Date(2026, 10, 9, 0, 0));
        // Monday at midnight starts the next one
        expect(weekKey(new Date(2026, 10, 9, 0, 0))).toBe('2026-11-09');
        expect(weekKey(new Date(2026, 10, 2, 0, 0))).toBe('2026-11-02');
    });

    it('is one week also when the clocks change (winter time on 25 October 2026)', () => {
        const { from, until, key } = weekRange(new Date(2026, 9, 25, 12));
        expect(key).toBe('2026-10-19');
        expect(until).toEqual(new Date(2026, 9, 26, 0, 0));
        // 7 days and the hour given back
        expect(until - from).toBe(7 * 24 * 3600e3 + 3600e3);
        // and summer time in March: an hour short, still Monday to Monday
        const spring = weekRange(new Date(2026, 2, 29, 23, 30));
        expect(spring.key).toBe('2026-03-23');
        expect(spring.until).toEqual(new Date(2026, 2, 30, 0, 0));
    });
});

describe('a goal as it is set', () => {
    it('reads as a sentence the app translates', () => {
        expect(describeGoal({ kind: 'trainings', target: 3 })).toBe('3 trainings');
        expect(describeGoal({ kind: 'trainings', target: 1 })).toBe('One training');
        expect(describeGoal({ kind: 'trainings', target: 2, training: 'bot' })).toBe('X01 against the bot: 2 times');
        expect(describeGoal({ kind: 'trainings', target: 1, training: 'atc' })).toBe('Around the Clock: once');
        expect(describeGoal({ kind: 'trainingScore', target: 100, training: 'bobs27' })).toBe('100 or better in Bob\'s 27');
        expect(describeGoal({ kind: 'x01Average', target: 50 })).toBe('An X01 average of 50 in a game');
        expect(describeGoal({ kind: 'x01Average', target: 50, withBot: true })).toBe('An X01 average of 50 in a game or against the bot');
        expect(describeGoal({ kind: 'games', target: 5 })).toBe('5 games');
        expect(describeGoal({ kind: 'num180s', target: 2 })).toBe('2 × 180');
        expect(describeGoal({ kind: 'playDays', target: 3 })).toBe('Play on 3 days');
    });

    it('needs a known kind, a number within its range and the training it is about', () => {
        expect(goalError({ kind: 'trainings', target: 3 })).toBeNull();
        expect(goalError({ kind: 'trainings', target: 3, training: 'atc' })).toBeNull();
        expect(goalError({ kind: 'darts', target: 3 })).toMatch(/no goal on darts/);
        expect(goalError({ kind: 'playDays', target: 8 })).toMatch(/1 to 7/);
        expect(goalError({ kind: 'x01Average', target: 0 })).toMatch(/1 to 180/);
        expect(goalError({ kind: 'games', target: 2.5 })).not.toBeNull();
        expect(goalError({ kind: 'trainingScore', target: 100 })).toBe('Choose the training of the goal.');
        // a score needs a training with a score: not Around the Clock or the bot
        expect(goalError({ kind: 'trainingScore', target: 100, training: 'atc' })).toBe('Choose the training of the goal.');
        expect(goalError({ kind: 'trainings', target: 3, training: 'darts' })).toBe('Choose the training of the goal.');
    });

    it('keeps its id while it stays the same, and only what its kind uses', () => {
        const before = [{ id: 'g1', kind: 'trainings', target: 3, training: null, withBot: false }];
        const [same, changed, fresh] = normalizeGoals([
            { id: 'g1', kind: 'trainings', target: 3, withBot: true },
            { id: 'g1', kind: 'trainings', target: 4 },
            { kind: 'games', target: 5, training: 'atc' },
        ], before);
        expect(same).toEqual({ id: 'g1', kind: 'trainings', target: 3, training: null, withBot: false });
        expect(changed.id).toBe('new-id');
        expect(fresh).toEqual({ id: 'new-id', kind: 'games', target: 5, training: null, withBot: false });
        expect(normalizeGoals([{ kind: 'games', target: 1 }, { kind: 'games', target: 2 }, { kind: 'games', target: 3 }, { kind: 'games', target: 4 }])).toHaveLength(3);
    });

    it('a goal on a score counts with the settings that split the scoreboard', () => {
        expect(describeGoal({ kind: 'trainingScore', target: 135, training: 'checkout121', settings: { attempts: 30, darts: 9 } })).toBe('135 or better in 121 Checkout (30 attempts, 9 darts)');
        // a goal saved before the settings: the defaults
        expect(describeGoal({ kind: 'trainingScore', target: 60, training: 'scoring' })).toBe('60 or better in Scoring (30 darts)');
        expect(goalError({ kind: 'trainingScore', target: 135, training: 'checkout121', settings: { attempts: 30 } })).toBeNull();
        expect(goalError({ kind: 'trainingScore', target: 135, training: 'checkout121', settings: { attempts: 3 } })).toBe('Choose the settings of the training.');
        // the finishes drawn are no setting of a goal
        expect(goalError({ kind: 'trainingScore', target: 50, training: 'randomcheckouts', settings: { targets: [40] } })).toBe('Choose the settings of the training.');
        expect(goalError({ kind: 'trainingScore', target: 50, training: 'scoring', settings: 'x' })).toBe('Choose the settings of the training.');
        const before = [{ id: 'g1', kind: 'trainingScore', target: 130, training: 'checkout121' }];
        const [kept, moved] = normalizeGoals([
            { id: 'g1', kind: 'trainingScore', target: 130, training: 'checkout121', settings: { attempts: 10 } },
            { id: 'g1', kind: 'trainingScore', target: 130, training: 'checkout121', settings: { attempts: 20 } },
        ], before);
        expect(kept).toEqual({ id: 'g1', kind: 'trainingScore', target: 130, training: 'checkout121', withBot: false, settings: { attempts: 10, darts: 9 } });
        expect(moved).toMatchObject({ id: 'new-id', settings: { attempts: 20, darts: 9 } });
        expect(goalView(kept, 128).settings).toEqual({ attempts: 10, darts: 9 });
        expect(goalView({ id: 'g2', kind: 'games', target: 3 }, 1).settings).toBeNull();
    });

    it('a score within what the training on its board can reach', () => {
        const score = (training, target, settings) => goalError({ kind: 'trainingScore', target, training, settings });
        // 121 Checkout from 121, one higher for every attempt after the first
        expect(score('checkout121', 100)).toBe('A score in this training needs a number from 121 to 130.');
        expect(score('checkout121', 121)).toBeNull();
        expect(score('checkout121', 130, { attempts: 10 })).toBeNull();
        expect(score('checkout121', 131, { attempts: 10 })).toMatch(/121 to 130/);
        expect(score('checkout121', 170, { attempts: 50, darts: 6 })).toBeNull();
        // the ladder from 61, up to 100 at most
        expect(score('ladder', 60)).toMatch(/61 to 80/);
        expect(score('ladder', 100, { attempts: 60 })).toBeNull();
        expect(score('ladder', 101, { attempts: 60 })).toMatch(/61 to 100/);
        // shares in percent; fewer darts are better, from a perfect 21 and a nine-darter
        expect(score('trebles', 101)).toMatch(/1 to 100/);
        expect(score('doublesaround', 20)).toMatch(/21 to/);
        expect(score('shortleg', 8)).toMatch(/9 to/);
        expect(score('shortleg', 24)).toBeNull();
        expect(score('bobs27', 1437)).toBeNull();
        expect(score('bobs27', 1438)).toMatch(/1 to 1437/);
    });
});

describe('how far a goal is in the week', () => {
    const week = {
        games: [x01('p1', 48.2, 1), x01('p2', 61, 2, new Date(2026, 10, 4, 21)), { type: 'cricket', at: new Date(2026, 10, 4, 22), view: { playerModels: {} } }],
        atc: [{ at: new Date(2026, 10, 5, 18), player: 'p1' }],
        rules: [
            { at: new Date(2026, 10, 5, 19), player: 'p1', kind: 'bobs27', score: 87 },
            { at: new Date(2026, 10, 6, 19), player: 'p1', kind: 'bobs27', score: 120 },
            { at: new Date(2026, 10, 6, 20), player: 'p1', kind: 'doublesaround', score: 64 },
            { at: new Date(2026, 10, 6, 21), player: 'p1', kind: 'doublesaround', score: 51 },
        ],
        bot: [{ at: new Date(2026, 10, 7, 10), view: x01('p1', 55.5, 1).view }],
    };

    it('counts the trainings, all or of one kind, the bot among them', () => {
        expect(measure({ kind: 'trainings' }, week, ['p1'])).toBe(6);
        expect(measure({ kind: 'trainings', training: 'atc' }, week, ['p1'])).toBe(1);
        expect(measure({ kind: 'trainings', training: 'bot' }, week, ['p1'])).toBe(1);
        expect(measure({ kind: 'trainings', training: 'bobs27' }, week, ['p1'])).toBe(2);
    });

    it('takes the best score of the training, lower being better where the training says so', () => {
        expect(measure({ kind: 'trainingScore', training: 'bobs27' }, week, ['p1'])).toBe(120);
        expect(measure({ kind: 'trainingScore', training: 'doublesaround' }, week, ['p1'])).toBe(51);
        expect(measure({ kind: 'trainingScore', training: 'catch40' }, week, ['p1'])).toBeNull();
        const doubles = { kind: 'trainingScore', training: 'doublesaround', target: 55 };
        expect(isReached(doubles, 51)).toBe(true);
        expect(isReached(doubles, 64)).toBe(false);
        expect(shareOf(doubles, 64)).toBeCloseTo(55 / 64);
        expect(isReached({ kind: 'trainingScore', training: 'bobs27', target: 100 }, 87)).toBe(false);
        expect(isReached({ kind: 'trainingScore', training: 'bobs27', target: 100 }, null)).toBe(false);
    });

    it('takes the best score of the goal\'s settings only', () => {
        const scoring = { ...emptyWeek(), rules: [
            { at: new Date(2026, 10, 5, 19), player: 'p1', kind: 'scoring', score: 72, settings: { darts: 30 } },
            { at: new Date(2026, 10, 5, 20), player: 'p1', kind: 'scoring', score: 58, settings: { darts: 99 } },
            { at: new Date(2026, 10, 5, 21), player: 'p1', kind: 'scoring', score: 61, settings: {} },
        ] };
        expect(measure({ kind: 'trainingScore', training: 'scoring', settings: { darts: 99 } }, scoring, ['p1'])).toBe(58);
        // without settings: the defaults (30 darts), a training saved without them too
        expect(measure({ kind: 'trainingScore', training: 'scoring' }, scoring, ['p1'])).toBe(72);
        expect(measure({ kind: 'trainingScore', training: 'scoring', settings: { darts: 60 } }, scoring, ['p1'])).toBeNull();
    });

    it('takes the best X01 average of the user\'s players, the bot only when chosen', () => {
        // p1 and p2 are the same user in two clubs
        expect(measure({ kind: 'x01Average' }, week, ['p1'])).toBe(48.2);
        expect(measure({ kind: 'x01Average' }, week, ['p1', 'p2'])).toBe(61);
        expect(measure({ kind: 'x01Average', withBot: true }, week, ['p1'])).toBe(55.5);
        expect(measure({ kind: 'x01Average' }, emptyWeek(), ['p1'])).toBe(0);
    });

    it('counts the games, the 180s (also against the bot) and the days played', () => {
        expect(measure({ kind: 'games' }, week, ['p1'])).toBe(3);
        expect(measure({ kind: 'num180s' }, week, ['p1'])).toBe(2);
        expect(measure({ kind: 'num180s' }, week, ['p1', 'p2'])).toBe(4);
        // Tuesday to Saturday
        expect(measure({ kind: 'playDays' }, week, ['p1'])).toBe(5);
    });

    it('is shown with a share for the bar and whether it is reached', () => {
        expect(goalView({ id: 'g', kind: 'trainings', target: 3 }, 2)).toMatchObject({ description: '3 trainings', progress: 2, share: 2 / 3, reached: false });
        expect(goalView({ id: 'g', kind: 'trainings', target: 3 }, 5)).toMatchObject({ share: 1, reached: true });
    });
});

describe('the weeks in a row', () => {
    const current = (goals) => ({ week: { key: '2026-11-02' }, goals });
    const past = (week, allReached) => ({ week, goals: [{ id: 'g' }], allReached });

    it('count back the weeks with all goals reached, the current one once all are', () => {
        const weeks = [past('2026-10-26', true), past('2026-10-19', true), past('2026-10-12', false), past('2026-10-05', true)];
        expect(streakOf(weeks, current([{ reached: false }])).streak).toBe(2);
        expect(streakOf(weeks, current([{ reached: true }])).streak).toBe(3);
        expect(streakOf([past('2026-10-19', true)], current([{ reached: false }])).streak).toBe(0);
    });

    it('show the last eight weeks, oldest first', () => {
        const { recent } = streakOf([past('2026-10-26', true), past('2026-10-19', false)], current([{ reached: false }]));
        expect(recent).toHaveLength(8);
        expect(recent.at(0)).toEqual({ week: '2026-09-14', state: 'none' });
        expect(recent.slice(-3)).toEqual([{ week: '2026-10-19', state: 'missed' }, { week: '2026-10-26', state: 'reached' }, { week: '2026-11-02', state: 'running' }]);
    });
});

describe('the nudge on Sunday', () => {
    it('names the open goal that is closest, with how far it is', () => {
        const goals = [
            goalView({ id: 'a', kind: 'trainings', target: 3 }, 1),
            goalView({ id: 'b', kind: 'games', target: 4 }, 3),
            goalView({ id: 'c', kind: 'playDays', target: 2 }, 2),
        ];
        expect(nudgeOf(goals)).toEqual({ title: 'Your week ends today: 4 games stands at 3 of 4', body: 'There is still time for a training.' });
    });

    it('says nothing when all are reached, and a dash for a training not done yet', () => {
        expect(nudgeOf([goalView({ id: 'a', kind: 'games', target: 1 }, 2)])).toBeNull();
        expect(nudgeOf([goalView({ id: 'a', kind: 'trainingScore', training: 'bobs27', target: 100 }, null)]).title).toBe('Your week ends today: 100 or better in Bob\'s 27 stands at – of 100');
    });
});
