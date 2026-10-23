// The trainings of a club at a glance, from the rows of the trainings list:
// Around the Clock (kind 'atc'), X01 against the bot ('x01') and the trainings
// of the rules engine (their kind, with "rules", their definition).

const DAY = 24 * 60 * 60 * 1000;

const better = (a, b, lower) => (lower ? a < b : a > b);

/**
 * → { total, last30Days, trainees, popular: [{ kind, count, last30Days }],
 *     ranking: [{ playerId, player, count, last30Days, favourite }],
 *     records: [{ key, kind, label, value, lower, row }] }
 * records: the fastest Around the Clock and its fewest darts, the best
 * average against the bot, and the best of every other training.
 */
export const trainingOverview = (rows = [], now = new Date()) => {
    const since = now.getTime() - 30 * DAY;
    const recent = (row) => new Date(row.createdAt).getTime() >= since;

    const byKind = new Map();
    const byPlayer = new Map();
    for (const row of rows) {
        const kind = byKind.get(row.kind) ?? { kind: row.kind, count: 0, last30Days: 0 };
        kind.count += 1;
        if (recent(row)) kind.last30Days += 1;
        byKind.set(row.kind, kind);
        const id = row.player?.id;
        if (!id) continue;
        const player = byPlayer.get(id) ?? { playerId: id, player: row.player, count: 0, last30Days: 0, kinds: new Map() };
        player.count += 1;
        if (recent(row)) player.last30Days += 1;
        player.kinds.set(row.kind, (player.kinds.get(row.kind) ?? 0) + 1);
        byPlayer.set(id, player);
    }

    const best = (key, kind, candidates, valueOf, lower, label) => {
        let record = null;
        for (const row of candidates) {
            const value = valueOf(row);
            if (value == null || !Number.isFinite(value) || value <= 0) continue;
            if (!record || better(value, record.value, lower)) record = { key, kind, label, value, lower, row };
        }
        return record;
    };
    const atc = rows.filter(row => row.kind === 'atc');
    const bots = rows.filter(row => row.kind === 'x01' && row.finished);
    const rulesKinds = [...new Set(rows.filter(row => row.rules).map(row => row.kind))];

    return {
        total: rows.length,
        last30Days: rows.filter(recent).length,
        trainees: byPlayer.size,
        popular: [...byKind.values()].sort((a, b) => b.count - a.count),
        ranking: [...byPlayer.values()]
            .map(({ kinds, ...player }) => ({ ...player, favourite: [...kinds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null }))
            .sort((a, b) => b.count - a.count || b.last30Days - a.last30Days || String(a.player?.nickname).localeCompare(String(b.player?.nickname))),
        records: [
            best('atc-time', 'atc', atc.filter(row => row.scoring !== 'Darts'), row => row.timeMs, true, 'time'),
            best('atc-darts', 'atc', atc.filter(row => row.scoring === 'Darts'), row => row.darts, true, 'darts'),
            best('bot', 'x01', bots, row => row.averages?.[0], false, 'average'),
            ...rulesKinds.map(kind => {
                const candidates = rows.filter(row => row.kind === kind);
                return best(kind, kind, candidates, row => row.score, candidates[0]?.rules?.higherIsBetter === false, 'score');
            }),
        ].filter(Boolean),
    };
};
