/**
 * Who plays the next game of a darts evening: whoever played least, in
 * pairings that did not happen yet, and nobody who is in a game right now
 * (unless there is no one else). players: [{ id }], games: [{ players,
 * running }], size: how many play (2 to 4). → the ids, in the order they throw.
 */
export const suggestNext = (players, games, size = 2) => {
    const ids = players.map(player => player.id);
    const played = new Map(ids.map(id => [id, 0]));
    const together = new Map();
    const busy = new Set();
    const pair = (a, b) => [a, b].sort().join('|');
    for (const game of games) {
        const inGame = (game.players ?? []).filter(id => played.has(id));
        for (const id of inGame) played.set(id, played.get(id) + 1);
        for (const a of inGame) for (const b of inGame) if (a < b) together.set(pair(a, b), (together.get(pair(a, b)) ?? 0) + 1);
        if (game.running) inGame.forEach(id => busy.add(id));
    }
    const chosen = [];
    const count = Math.min(size, ids.length);
    while (chosen.length < count) {
        const score = (id) => (busy.has(id) ? 1000 : 0)
            + chosen.reduce((sum, other) => sum + (together.get(pair(id, other)) ?? 0), 0) * 10
            + played.get(id);
        const next = ids.filter(id => !chosen.includes(id)).sort((a, b) => score(a) - score(b) || ids.indexOf(a) - ids.indexOf(b))[0];
        chosen.push(next);
    }
    // the one who played least throws first
    return chosen.sort((a, b) => played.get(a) - played.get(b) || ids.indexOf(a) - ids.indexOf(b));
};
