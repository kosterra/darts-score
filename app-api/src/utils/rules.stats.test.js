import { describe, expect, it } from 'vitest';
import { rulesKpis, rulesTrainingBests } from './rules.stats.js';

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
});
