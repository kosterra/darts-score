import { describe, expect, it, vi } from 'vitest';

vi.mock('../models/db.model.js', () => ({ default: {} }));
const { yearAwards, AVERAGE_MIN_GAMES } = await import('./club.year.js');

const row = (id, fields = {}) => ({ id, games: 0, wins: 0, x01Games: 0, points: 0, darts: 0, oneEighties: 0, highestCheckout: 0, clubNights: 0, ...fields });
// an X01 average as points and darts
const x01 = (games, average) => ({ x01Games: games, darts: games * 30, points: games * 10 * average });

describe('the awards of the club\'s year', () => {
    it('go to whoever leads in each', () => {
        const awards = yearAwards([
            row('anna', { games: 40, wins: 25, ...x01(30, 60), oneEighties: 4, highestCheckout: 121, clubNights: 30 }),
            row('ben', { games: 50, wins: 20, ...x01(40, 55), oneEighties: 9, highestCheckout: 100, clubNights: 40 }),
            row('cleo', { games: 30, wins: 5, ...x01(20, 45), highestCheckout: 140, clubNights: 12 }),
        ]);
        expect(Object.fromEntries(awards.map(award => [award.id, [award.player, award.value]]))).toEqual({
            champion: ['anna', 25], mostGames: ['ben', 50], average: ['anna', 60], oneEighties: ['ben', 9], checkout: ['cleo', 140], clubNights: ['ben', 40], woodenSpoon: ['cleo', 5],
        });
    });

    it('the best average only with enough X01 games', () => {
        const awards = yearAwards([
            row('anna', { games: AVERAGE_MIN_GAMES - 1, ...x01(AVERAGE_MIN_GAMES - 1, 90) }),
            row('ben', { games: 30, ...x01(30, 50) }),
        ]);
        expect(awards.find(award => award.id === 'average')).toMatchObject({ player: 'ben', value: 50 });
    });

    it('none without games, and no wooden spoon among two', () => {
        expect(yearAwards([row('anna'), row('ben')])).toEqual([]);
        const awards = yearAwards([row('anna', { games: 10, wins: 7 }), row('ben', { games: 10, wins: 3 })]);
        expect(awards.map(award => award.id)).not.toContain('woodenSpoon');
    });
});
