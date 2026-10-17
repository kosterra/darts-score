import { describe, expect, it } from 'vitest';
import { ageOn, strengthOf, suggestHandicap } from './handicap';

const game = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out' };

describe('handicap', () => {
    it('works out the age', () => {
        const today = new Date(2026, 9, 17);
        expect(ageOn('1987-03-02', today)).toBe(39);
        expect(ageOn('2017-10-18', today)).toBe(8);
        expect(ageOn('2017-10-17', today)).toBe(9);
        expect(ageOn(null, today)).toBeNull();
    });

    it('takes the strength from the average, the level, then the age', () => {
        expect(strengthOf({ recentAverage: 52.4, games: 5 }).average).toBe(52.4);
        expect(strengthOf({ levelId: 'leaguePlayer' }).source).toBe('level');
        expect(strengthOf({ age: 9 })).toMatchObject({ average: 15, source: 'age' });
    });

    it('gives a child against a strong adult a short game without a double', () => {
        const suggestion = suggestHandicap(game, [
            { id: 'dad', age: 39, recentAverage: 55, games: 5 },
            { id: 'kid', age: 9 },
        ]);
        expect(suggestion.dad).toMatchObject({ startingScore: 501, legInMode: 'Double In', legOutMode: 'Double Out' });
        expect(suggestion.kid).toMatchObject({ startingScore: 170, legInMode: 'Straight In', legOutMode: 'Straight Out' });
        expect(suggestion.kid.reason).toBe('9 years · no X01 games yet → 170 Straight Out');
    });

    it('changes little between players of about the same strength', () => {
        const suggestion = suggestHandicap(game, [
            { id: 'a', recentAverage: 50, games: 5 },
            { id: 'b', recentAverage: 45, games: 5 },
        ]);
        expect(suggestion.a).toMatchObject({ startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out' });
        expect(suggestion.b).toMatchObject({ startingScore: 401, legOutMode: 'Double Out' });
    });

    it('eases a double in for a clearly weaker player', () => {
        const suggestion = suggestHandicap({ ...game, legInMode: 'Double In' }, [
            { id: 'a', recentAverage: 60, games: 5 },
            { id: 'b', recentAverage: 40, games: 5 },
        ]);
        expect(suggestion.b).toMatchObject({ startingScore: 301, legInMode: 'Straight In', legOutMode: 'Double Out' });
    });
});
