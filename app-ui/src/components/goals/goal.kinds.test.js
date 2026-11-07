import { describe, expect, it } from 'vitest';
import { draftOf, fitTarget, goalsValid, newGoal, targetRange } from './goal.kinds';

describe('the number of a weekly goal on a score', () => {
    it('starts where the training can be reached, on its default board', () => {
        expect(newGoal('trainingScore', 'checkout121')).toMatchObject({ target: 125, settings: { attempts: 10, darts: 9 } });
        expect(newGoal('trainingScore', 'ladder')).toMatchObject({ target: 70, settings: { attempts: 20 } });
        expect(newGoal('trainingScore', 'shortleg').target).toBe(24);
        expect(newGoal('trainingScore').training).toBe('bobs27');
        expect(newGoal('games').target).toBe(5);
    });

    it('stays within what the board allows: 121 Checkout from 121, one higher for every further attempt', () => {
        expect(targetRange({ kind: 'trainingScore', training: 'checkout121', settings: { attempts: 10, darts: 9 } })).toMatchObject({ min: 121, max: 130 });
        expect(targetRange({ kind: 'trainingScore', training: 'checkout121', settings: { attempts: 50, darts: 6 } })).toMatchObject({ min: 121, max: 170 });
        expect(targetRange({ kind: 'trainingScore', training: 'ladder', settings: { attempts: 60 } })).toMatchObject({ min: 61, max: 100 });
        expect(targetRange({ kind: 'trainingScore', training: 'trebles', settings: {} })).toMatchObject({ min: 1, max: 100 });
        expect(targetRange({ kind: 'trainingScore', training: 'doublesaround', settings: {} }).min).toBe(21);
        expect(targetRange({ kind: 'playDays' })).toEqual({ min: 1, max: 7, start: 3 });
        expect(goalsValid([{ kind: 'trainingScore', training: 'checkout121', target: 100, settings: { attempts: 10, darts: 9 } }])).toBe(false);
        expect(goalsValid([{ kind: 'trainingScore', training: 'checkout121', target: 121, settings: { attempts: 10, darts: 9 } }])).toBe(true);
    });

    it('a number from before fits the range: 100 in 121 Checkout is 121; fewer attempts reach less high', () => {
        expect(draftOf({ id: 'g1', kind: 'trainingScore', target: 100, training: 'checkout121', settings: { attempts: 10, darts: 9 } }).target).toBe(121);
        expect(fitTarget({ kind: 'trainingScore', target: 140, training: 'checkout121', settings: { attempts: 10, darts: 9 } })).toBe(130);
        expect(draftOf({ id: 'g2', kind: 'games', target: 4 }).target).toBe(4);
    });
});
