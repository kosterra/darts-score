// The overviews above the global admins' lists that load the whole
// installation anyway: the users, the quick games and the clubs.

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const WEEKS = 12;
const time = (value) => (value ? new Date(value).getTime() : 0);

// how many per week over the last twelve weeks, oldest first
export const perWeek = (dates, now = new Date()) => {
    const weeks = Array.from({ length: WEEKS }, (_, index) => ({ start: new Date(now.getTime() - (WEEKS - index) * WEEK).toISOString(), count: 0 }));
    for (const date of dates) {
        const index = WEEKS - 1 - Math.floor((now.getTime() - time(date)) / WEEK);
        if (index >= 0 && index < WEEKS) weeks[index].count += 1;
    }
    return weeks;
};

// a login so long ago that the account may be forgotten
export const INACTIVE_DAYS = 180;

/**
 * The users at a glance: how many, new and active lately, blocked; the
 * registrations of the last twelve weeks; what they are (global admin, admin
 * of a club, player, no club yet) and their languages; the accounts never
 * used, unused for half a year or without a club.
 * users: as the users list loads them, each with its clubs ({ role })
 */
export const usersOverview = (users, now = new Date()) => {
    const since = now.getTime() - 30 * DAY;
    const inactiveSince = now.getTime() - INACTIVE_DAYS * DAY;
    const roles = { globalAdmin: 0, clubAdmin: 0, player: 0, noClub: 0 };
    const languages = new Map();
    for (const user of users) {
        if (user.role === 'globalAdmin') roles.globalAdmin += 1;
        else if (user.clubs?.some(club => club.role === 'admin')) roles.clubAdmin += 1;
        else if (user.clubs?.length) roles.player += 1;
        else roles.noClub += 1;
        const language = user.language || 'browser';
        languages.set(language, (languages.get(language) ?? 0) + 1);
    }
    const byOldest = (a, b) => time(a.lastLoginAt || a.createdAt) - time(b.lastLoginAt || b.createdAt);
    return {
        total: users.length,
        newLately: users.filter(user => time(user.createdAt) >= since).length,
        activeLately: users.filter(user => time(user.lastLoginAt) >= since).length,
        blocked: users.filter(user => user.blockedAt).length,
        weeks: perWeek(users.map(user => user.createdAt), now),
        roles,
        languages: [...languages].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count),
        neverLoggedIn: users.filter(user => !user.lastLoginAt).sort(byOldest),
        inactive: users.filter(user => user.lastLoginAt && time(user.lastLoginAt) < inactiveSince).sort(byOldest),
        withoutClub: users.filter(user => user.role !== 'globalAdmin' && !user.clubs?.length).sort(byOldest),
    };
};

/**
 * The quick games kept now at a glance: how many, running, finished (and the
 * share), the last 7 days, the formats played most and how many play.
 * games: [{ kind, format, names, finished, createdAt }]
 */
export const quickGamesOverview = (games, now = new Date()) => {
    const formats = new Map();
    const sizes = new Map();
    for (const game of games) {
        const key = `${game.kind}|${game.format}`;
        const entry = formats.get(key) ?? { kind: game.kind, format: game.format, count: 0 };
        entry.count += 1;
        formats.set(key, entry);
        const size = Math.min(game.names?.length ?? 0, 4);
        sizes.set(size, (sizes.get(size) ?? 0) + 1);
    }
    const finished = games.filter(game => game.finished).length;
    return {
        total: games.length,
        running: games.length - finished,
        finished,
        finishRate: games.length ? Math.round(finished / games.length * 100) : 0,
        last7Days: games.filter(game => time(game.createdAt) >= now.getTime() - 7 * DAY).length,
        formats: [...formats.values()].sort((a, b) => b.count - a.count),
        sizes: [...sizes].map(([players, count]) => ({ players, count })).sort((a, b) => a.players - b.players),
    };
};

// a club without a game for so long is quiet
export const QUIET_DAYS = 90;
const NEWEST = 5;

/**
 * The clubs at a glance: how many, public, active lately and in need of an
 * admin; the largest, those playing most, the quiet ones (the longest quiet
 * first) and the newest.
 * clubs: the rows of the admin overview ({ playerCount, gameCount, lastActivityAt, … })
 */
export const clubsOverview = (clubs, now = new Date()) => {
    const since = now.getTime() - 30 * DAY;
    const quietSince = now.getTime() - QUIET_DAYS * DAY;
    return {
        total: clubs.length,
        public: clubs.filter(club => club.isPublic).length,
        activeLately: clubs.filter(club => club.gameCount > 0 && time(club.lastActivityAt) >= since).length,
        needsAdmin: clubs.filter(club => club.needsAdmin).length,
        largest: [...clubs].sort((a, b) => b.playerCount - a.playerCount),
        mostGames: [...clubs].filter(club => club.gameCount > 0).sort((a, b) => b.gameCount - a.gameCount),
        quiet: clubs.filter(club => time(club.lastActivityAt) < quietSince).sort((a, b) => time(a.lastActivityAt) - time(b.lastActivityAt)),
        newest: [...clubs].sort((a, b) => time(b.createdAt) - time(a.createdAt)).slice(0, NEWEST),
    };
};
