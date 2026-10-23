const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
export const WEEKS = 12;
// a game still running after a week was most likely left
export const STUCK_DAYS = 7;

const time = (value) => new Date(value ?? 0).getTime();

// the last twelve weeks, oldest first, each ending a multiple of 7 days before now
const emptyWeeks = (now) => Array.from({ length: WEEKS }, (_, index) => ({
    start: new Date(now.getTime() - (WEEKS - index) * WEEK).toISOString(),
    count: 0,
    finished: 0,
}));
const weekIndex = (at, now) => WEEKS - 1 - Math.floor((now.getTime() - at) / WEEK);

/**
 * Games or trainings of the whole installation at a glance, for the global
 * admins: how many (in all, lately, running, left running), how many players
 * and clubs were active lately, the last twelve weeks, the kinds by how often
 * they are played and every club with its numbers, the most active first.
 * records: [{ club, kind, createdAt, updatedAt, running, finished, playerIds }]
 */
export const activityInsights = (records, now = new Date()) => {
    const since = now.getTime() - 30 * DAY;
    const stuckBefore = now.getTime() - STUCK_DAYS * DAY;
    const weeks = emptyWeeks(now);
    const kinds = new Map();
    const clubs = new Map();
    const players = new Set();
    let total = 0;
    let last30Days = 0;
    let running = 0;
    let stuck = 0;

    for (const record of records) {
        const at = time(record.createdAt ?? record.updatedAt);
        const lately = at >= since;
        const isStuck = record.running && time(record.updatedAt ?? record.createdAt) < stuckBefore;
        total += 1;
        if (lately) last30Days += 1;
        if (record.running) running += 1;
        if (isStuck) stuck += 1;

        const week = weekIndex(at, now);
        if (week >= 0 && week < WEEKS) {
            weeks[week].count += 1;
            if (record.finished) weeks[week].finished += 1;
        }

        const kind = kinds.get(record.kind) ?? { kind: record.kind, count: 0, last30Days: 0 };
        kind.count += 1;
        if (lately) kind.last30Days += 1;
        kinds.set(record.kind, kind);

        if (!record.club) continue;
        const clubId = String(record.club);
        const club = clubs.get(clubId) ?? { clubId, total: 0, last30Days: 0, running: 0, stuck: 0, lastAt: null, players: new Set() };
        club.total += 1;
        if (record.running) club.running += 1;
        if (isStuck) club.stuck += 1;
        if (!club.lastAt || at > time(club.lastAt)) club.lastAt = new Date(at).toISOString();
        if (lately) {
            club.last30Days += 1;
            for (const id of record.playerIds ?? []) {
                if (!id) continue;
                club.players.add(String(id));
                players.add(String(id));
            }
        }
        clubs.set(clubId, club);
    }

    const clubRows = [...clubs.values()]
        .map(({ players: active, ...club }) => ({ ...club, players: active.size }))
        .sort((a, b) => b.last30Days - a.last30Days || b.total - a.total);
    return {
        total,
        last30Days,
        running,
        stuck,
        players: players.size,
        activeClubs: clubRows.filter(club => club.last30Days > 0).length,
        weeks,
        popular: [...kinds.values()].sort((a, b) => b.count - a.count),
        clubs: clubRows,
    };
};

/**
 * The players of the whole installation at a glance: members (each person
 * once), guests, players in several clubs, with a login, without a club, new
 * in the last 30 days, the new players of the last twelve weeks and every
 * club with its members, guests, logins and newcomers, the largest first.
 * players: [{ clubs, guest, user, createdAt }]
 */
export const playersInsights = (players, now = new Date()) => {
    const since = now.getTime() - 30 * DAY;
    const weeks = emptyWeeks(now);
    const clubs = new Map();
    const totals = { members: 0, guests: 0, multiClub: 0, withLogin: 0, withoutClub: 0, newLately: 0 };

    for (const player of players) {
        const at = time(player.createdAt);
        const lately = at >= since;
        const clubIds = (player.clubs ?? []).map(String);
        if (player.guest) totals.guests += 1;
        else {
            totals.members += 1;
            if (clubIds.length > 1) totals.multiClub += 1;
            if (player.user) totals.withLogin += 1;
            if (!clubIds.length) totals.withoutClub += 1;
            if (lately) totals.newLately += 1;
            const week = weekIndex(at, now);
            if (week >= 0 && week < WEEKS) weeks[week].count += 1;
        }
        for (const clubId of clubIds) {
            const club = clubs.get(clubId) ?? { clubId, members: 0, guests: 0, withLogin: 0, newLately: 0 };
            if (player.guest) club.guests += 1;
            else {
                club.members += 1;
                if (player.user) club.withLogin += 1;
                if (lately) club.newLately += 1;
            }
            clubs.set(clubId, club);
        }
    }

    return {
        ...totals,
        weeks,
        clubs: [...clubs.values()].sort((a, b) => b.members - a.members || b.guests - a.guests),
    };
};
