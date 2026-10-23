const DAY = 24 * 60 * 60 * 1000;
const LATELY_DAYS = 30;
const NEWEST = 5;

// the day a birthday next comes (today counts), from "YYYY-MM-DD…"
const nextBirthday = (dateOfBirth, now) => {
    const [, month, day] = String(dateOfBirth).slice(0, 10).split('-').map(Number);
    if (!month || !day) return null;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // 29 February is 1 March in the other years
    const next = new Date(today.getFullYear(), month - 1, day);
    if (next < today) next.setFullYear(today.getFullYear() + 1, month - 1, day);
    return { date: next, inDays: Math.round((next - today) / DAY) };
};

/**
 * The players of the club at a glance, from the players list and their levels:
 * how many members, guests and logins, the newcomers, the highest levels and
 * how the levels spread, the birthdays of the next 30 days and what the
 * club's admins could still complete (members without a date of birth or a login).
 *
 * players: the club's players with the guests; levels: { [playerId]: { id, name, index, xp } }
 */
export const playersOverview = (players, levels = {}, now = new Date()) => {
    const members = players.filter(player => !player.guest);
    const since = now.getTime() - LATELY_DAYS * DAY;
    const createdAt = (player) => new Date(player.createdAt ?? 0).getTime();

    const ranking = members
        .filter(player => levels[player.id])
        .map(player => ({ playerId: player.id, player, xp: levels[player.id].xp ?? 0, level: levels[player.id] }))
        .sort((a, b) => b.xp - a.xp || a.player.nickname?.localeCompare(b.player.nickname));

    const spread = new Map();
    for (const { level } of ranking) {
        const entry = spread.get(level.id) ?? { id: level.id, name: level.name, index: level.index, count: 0 };
        entry.count += 1;
        spread.set(level.id, entry);
    }

    const birthdays = members
        .map(player => player.dateOfBirth && { player, ...nextBirthday(player.dateOfBirth, now) })
        .filter(entry => entry?.date && entry.inDays <= LATELY_DAYS)
        .sort((a, b) => a.inDays - b.inDays);

    return {
        members: members.length,
        guests: players.length - members.length,
        withLogin: members.filter(player => player.user).length,
        newLately: members.filter(player => createdAt(player) >= since).length,
        newest: [...members].sort((a, b) => createdAt(b) - createdAt(a)).slice(0, NEWEST),
        ranking,
        levels: [...spread.values()].sort((a, b) => b.index - a.index),
        birthdays,
        withoutBirth: members.filter(player => !player.dateOfBirth),
        withoutLogin: members.filter(player => !player.user),
    };
};
