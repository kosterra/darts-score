/**
 * Whether the dartboards of the charts have anything to show: an empty board
 * says nothing, so the chart gives a line instead (and a profile puts it last).
 */

// any player with a dart on the board: hitsByPlayer one entry per player, each [{ section, S, D, T }]
export const hasHits = (hitsByPlayer) => hitsByPlayer.some(hits => (hits ?? []).some(entry => entry.S || entry.D || entry.T));

// any player who tried a double: ratesByPlayer one entry per player, each [{ section, hit, total, rate }]
export const hasDoubles = (ratesByPlayer) => ratesByPlayer.some(rates => (rates ?? []).some(entry => Number(entry.total) > 0));
