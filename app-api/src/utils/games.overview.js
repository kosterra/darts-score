const DAY = 24 * 60 * 60 * 1000;
// a win rate only means something after a few games
export const MIN_GAMES_FOR_WIN_RATE = 5;
const WIN_RATES = 5;

/**
 * The games of a club at a glance, over all of them: how many (in all, in
 * the last 30 days, running), how many players play, the game types by how
 * often they are played, and the members ranked by their games, with their
 * wins, the games lately and the type they play most; the best win rates.
 * gamesByType: [{ type, games }] ("rules" games by their kind); memberIds: Set
 * → { total, last30Days, running, players, popular: [{ type, count, last30Days }],
 *     ranking: [{ playerId, games, wins, last30Days, favourite }], winRates: [{ playerId, games, wins, rate }] }
 */
export const gamesOverview = (gamesByType, memberIds, now = new Date()) => {
    const since = now.getTime() - 30 * DAY;
    const recent = (game) => new Date(game.createdAt ?? game.updatedAt).getTime() >= since;
    const kinds = new Map();
    const players = new Map();
    let total = 0;
    let last30Days = 0;
    let running = 0;

    for (const { type, games } of gamesByType) {
        for (const game of games) {
            const kind = type === 'rules' ? game.kind : type;
            const lately = recent(game);
            const isRunning = Boolean(game.gameIsRunning) && !game.hasWinner;
            total += 1;
            if (lately) last30Days += 1;
            if (isRunning) running += 1;
            const entry = kinds.get(kind) ?? { type: kind, count: 0, last30Days: 0 };
            entry.count += 1;
            if (lately) entry.last30Days += 1;
            kinds.set(kind, entry);
            for (const playerId of game.players ?? []) {
                if (!memberIds.has(String(playerId))) continue;
                const player = players.get(playerId) ?? { playerId: String(playerId), games: 0, finished: 0, wins: 0, last30Days: 0, kinds: new Map() };
                player.games += 1;
                if (game.hasWinner) player.finished += 1;
                if (game.playerModels?.[playerId]?.hasWonGame) player.wins += 1;
                if (lately) player.last30Days += 1;
                player.kinds.set(kind, (player.kinds.get(kind) ?? 0) + 1);
                players.set(playerId, player);
            }
        }
    }

    const ranking = [...players.values()]
        .map(({ kinds: played, ...player }) => ({ ...player, favourite: [...played.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null }))
        .sort((a, b) => b.games - a.games || b.wins - a.wins);
    return {
        total,
        last30Days,
        running,
        players: players.size,
        popular: [...kinds.values()].sort((a, b) => b.count - a.count),
        ranking,
        winRates: ranking
            .filter(player => player.finished >= MIN_GAMES_FOR_WIN_RATE)
            .map(player => ({ playerId: player.playerId, games: player.finished, wins: player.wins, rate: Math.round(player.wins / player.finished * 1000) / 10 }))
            .sort((a, b) => b.rate - a.rate || b.games - a.games)
            .slice(0, WIN_RATES),
    };
};
