import { describe, expect, it } from 'vitest';
import { boardCondition, rulesKpis, rulesTrainingBests, sameBoard } from './rules.stats.js';

describe('rules statistics', () => {
    it('counts games and wins per kind', () => {
        const games = [
            { kind: 'shanghai', playerModels: { a: { hasWonGame: true } } },
            { kind: 'shanghai', playerModels: { a: { hasWonGame: false } } },
            { kind: 'golf', playerModels: { a: { hasWonGame: true } } },
        ];
        expect(rulesKpis(games, 'a')).toEqual({ shanghai: { games: 2, wins: 1 }, golf: { games: 1, wins: 1 } });
    });

    it('keeps the best of each training, lower for doubles around the board', () => {
        const bests = rulesTrainingBests([
            { kind: 'bobs27', score: 120 }, { kind: 'bobs27', score: 300 }, { kind: 'bobs27', score: 80 },
            { kind: 'doublesaround', score: 60 }, { kind: 'doublesaround', score: 45 },
        ]);
        expect(bests.bobs27).toMatchObject({ count: 3, best: 300, latest: [120, 300, 80] });
        expect(bests.doublesaround.best).toBe(45);
    });

    it('keeps the best and the latest of the board played most, the count of all', () => {
        const bests = rulesTrainingBests([
            { kind: 'checkout121', score: 140, settings: { attempts: 20, darts: 9 } },
            { kind: 'checkout121', score: 125, settings: {} },
            { kind: 'checkout121', score: 127, settings: { attempts: 10, darts: 9 } },
            { kind: 'scoring', score: 60, settings: { darts: 30 } },
            { kind: 'scoring', score: 50, settings: { darts: 99 } },
        ]);
        // two attempts of 10 (one older without settings), one of 20: the 140 of 20 attempts is not a best of 10
        expect(bests.checkout121).toEqual({ count: 3, best: 127, latest: [125, 127], board: { attempts: 10, darts: 9 } });
        // one each: the board played last
        expect(bests.scoring).toEqual({ count: 2, best: 50, latest: [50], board: { darts: 99 } });
        expect(rulesTrainingBests([{ kind: 'bobs27', score: 1 }]).bobs27.board).toEqual({});
    });

    it('finds the trainings of a board in the database, older ones without settings on the default', () => {
        expect(boardCondition('bobs27', {})).toEqual({});
        expect(boardCondition('scoring', { darts: 60 })).toEqual({ $and: [{ 'settings.darts': 60 }] });
        expect(boardCondition('checkout121', { attempts: 30 })).toEqual({ $and: [
            { 'settings.attempts': 30 },
            { $or: [{ 'settings.darts': 9 }, { 'settings.darts': { $exists: false } }, { 'settings.darts': null }] },
        ] });
        expect(sameBoard('checkout121', {}, { attempts: 10, darts: 9 })).toBe(true);
        expect(sameBoard('checkout121', { attempts: 20 }, { attempts: 10 })).toBe(false);
        // the finishes drawn do not split Random checkouts
        expect(sameBoard('randomcheckouts', { attempts: 10, targets: [40] }, { attempts: 10, targets: [60] })).toBe(true);
    });
});
