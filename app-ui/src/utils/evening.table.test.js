import { describe, expect, it } from 'vitest';
import { orderTable } from './evening.table';

const row = (name, games, wins, average = null) => ({ id: name, name, games, wins, winRate: games ? Math.round((wins / games) * 100) : 0, average });

describe('the order of the table of an evening', () => {
    // as the API sends it: by wins
    const table = [row('Anna', 12, 5, 40), row('Ben', 4, 3, 35), row('Cleo', 0, 0), row('Dan', 4, 3, 45)];

    it('keeps the order by wins as it is', () => {
        expect(orderTable(table)).toBe(table);
        expect(orderTable(table, 'wins')).toBe(table);
    });

    it('orders by win rate, then wins, then the average; who has not played last', () => {
        expect(orderTable(table, 'rate').map(entry => entry.name)).toEqual(['Dan', 'Ben', 'Anna', 'Cleo']);
        expect(table.map(entry => entry.name)).toEqual(['Anna', 'Ben', 'Cleo', 'Dan']);
    });
});
