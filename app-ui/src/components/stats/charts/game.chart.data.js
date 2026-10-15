/**
 * Chart data for one X01 game, worked out from the game itself.
 */

const BUCKETS = [
    { label: '9', max: 9 },
    { label: '10–12', max: 12 },
    { label: '13–15', max: 15 },
    { label: '16–18', max: 18 },
    { label: '19–21', max: 21 },
    { label: '22–24', max: 24 },
    { label: '25–30', max: 30 },
    { label: '31+', max: Infinity },
];

const number = (key) => Number(String(key).replace(/\D/g, '')) || 0;

const legsInOrder = (game) =>
    Object.entries(game.allSetsThrows ?? {})
        .sort(([a], [b]) => number(a) - number(b))
        .flatMap(([, set]) => Object.entries(set ?? {}).sort(([a], [b]) => number(a) - number(b)).map(([, leg]) => leg))
        .filter(Array.isArray);

const dartsThrown = (darts) => (Array.isArray(darts) ? darts : []).filter(dart => dart !== '' && dart != null).length;

/**
 * Darts each player needed for the legs they won in this game,
 * as [{ bucket, player1, player2, … }].
 */
export const gameDartsPerLeg = (game, players) => {
    const rows = BUCKETS.map(bucket => ({ bucket: bucket.label, ...Object.fromEntries(players.map((_, i) => [`player${i + 1}`, 0])) }));
    for (const leg of legsInOrder(game)) {
        const finish = leg.find(visit => visit?.scoreLeft === 0);
        const index = players.findIndex(player => player.id === finish?.playerId);
        if (index === -1) continue;
        const darts = leg.filter(visit => visit?.playerId === finish.playerId).reduce((sum, visit) => sum + dartsThrown(visit.darts), 0);
        rows[BUCKETS.findIndex(bucket => darts <= bucket.max)][`player${index + 1}`] += 1;
    }
    return rows;
};

/**
 * Each player's average while scoring and while finishing in this game.
 */
export const gameScoring = (game, players) => players.map(player => {
    const averages = game.playerModels?.[player.id]?.averages?.game ?? {};
    return {
        opening: Math.round((averages.begMidGame ?? 0) * 10) / 10,
        finishing: Math.round((averages.endGame ?? 0) * 10) / 10,
    };
});
