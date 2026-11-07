/**
 * The table in the order chosen: by wins as the API sends it, or by win
 * rate (for an evening where some came later or went home early): the
 * higher rate first, then more wins, then the average; who has not played last.
 */
export const orderTable = (table, order = 'wins') => (order === 'rate'
    ? [...table].sort((a, b) => Number(b.games > 0) - Number(a.games > 0) || b.winRate - a.winRate || b.wins - a.wins || (b.average ?? 0) - (a.average ?? 0) || a.name.localeCompare(b.name))
    : table);
