import { describe, it, expect } from 'vitest';
import { cricketTip, liveMarks, visitMarks } from './cricket.live';

const game = (variant = 'Standard') => ({
    variant,
    players: ['a', 'b'],
    currentPlayerTurn: 'a',
    playerModels: {
        a: { score: 0, sectionHit: { 20: 3, 19: 1 } },
        b: { score: 40, sectionHit: { 20: 1, 19: 3 } },
    },
});

describe('cricket live', () => {
    it('counts the marks of a visit on 15 to 20 and the bull', () => {
        expect(visitMarks(['T20', 'S5', 'D25'])).toBe(5);
        expect(visitMarks(['0', '', 'S14'])).toBe(0);
    });

    it('takes the darts being entered into the marks of the player at the oche', () => {
        const marks = liveMarks(game(), { 20: 3, 19: 2 });
        expect(marks.a[19]).toBe(2);
        expect(marks.b[19]).toBe(3);
    });

    it('says to score when behind on a number the others still have open', () => {
        const g = game();
        expect(cricketTip(g, liveMarks(g), { a: 0, b: 40 }, 'a').text).toBe('Score on 20');
    });

    it('says to close the next number when ahead', () => {
        const g = game();
        expect(cricketTip(g, liveMarks(g), { a: 60, b: 40 }, 'a')).toMatchObject({ text: 'Close 19', title: '2 marks to close it' });
    });

    it('only says to close in no-score', () => {
        const g = game('No-score');
        expect(cricketTip(g, liveMarks(g), { a: 0, b: 0 }, 'a').text).toBe('Close 19');
    });
});
