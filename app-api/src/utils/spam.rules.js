const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// How much one account may create before it counts as a bot
export const CREATE_LIMITS = {
    club:     { limit: 5,  windowMs: 24 * HOUR, things: 'clubs', period: 'a day' },
    player:   { limit: 30, windowMs: 10 * MINUTE, things: 'players', period: 'in 10 minutes' },
    game:     { limit: 30, windowMs: 10 * MINUTE, things: 'games', period: 'in 10 minutes' },
    training: { limit: 30, windowMs: 10 * MINUTE, things: 'trainings', period: 'in 10 minutes' },
};

// Registrations from one internet address
export const SIGNUP_LIMIT = { limit: 3, windowMs: HOUR };
// Quick games (no login) from one internet address
export const QUICK_LIMIT = { limit: 20, windowMs: HOUR };
// Requests to join clubs by one account
export const JOIN_LIMIT = { limit: 10, windowMs: 24 * HOUR };
// Games, trainings and players deleted by one account
export const DELETE_LIMIT = { limit: 20, windowMs: 10 * MINUTE };
// Failed logins for one account or from one address, and password resets asked for
export const LOGIN_LIMIT = { limit: 10, windowMs: 15 * MINUTE };
export const RESET_LIMIT = { limit: 5, windowMs: HOUR };
// An admin who removes the others or deletes the club this soon after being made one
export const TAKEOVER_WINDOW_MS = 24 * HOUR;
// A young club earning this many club badges within a day
export const CLUB_BADGE_BURST = { badges: 3, windowMs: 24 * HOUR, youngDays: 60 };
// A club with this many impossible games or trainings within 30 days
export const FAIR_PLAY_IMPOSSIBLE = { count: 5, windowMs: 30 * 24 * HOUR };
// How long an address that broke a registration rule may not register
export const IP_BLOCK_HOURS = 24;
// A person needs longer than this to fill in the registration form
export const MIN_FORM_MS = 3000;

/**
 * The rules, as global admins see them on the alerts page.
 */
export const RULES = {
    honeypot: {
        title: 'Hidden form field filled in',
        severity: 'critical',
        description: `The registration form has a field people cannot see; only bots fill it in. The registration is refused and the address may not register for ${IP_BLOCK_HOURS} hours.`,
    },
    fastForm: {
        title: 'Form sent too fast',
        severity: 'warning',
        description: `The registration form was sent less than ${MIN_FORM_MS / 1000} seconds after it was opened. The registration is refused; a person simply sends it again.`,
    },
    signupBurst: {
        title: 'Many registrations from one address',
        severity: 'critical',
        description: `More than ${SIGNUP_LIMIT.limit} accounts in an hour from the same internet address. The address may not register for ${IP_BLOCK_HOURS} hours.`,
    },
    createBurst: {
        title: 'Too much created in a short time',
        severity: 'critical',
        description: `One account created more than ${Object.values(CREATE_LIMITS).map(({ limit, things, period }) => `${limit} ${things} ${period}`).join(', ')}. The account is blocked.`,
    },
    linkInName: {
        title: 'Web address in a name',
        severity: 'warning',
        description: 'A club, player or account name contains a web address, as advertising spam does.',
    },
    randomName: {
        title: 'Random-looking name',
        severity: 'warning',
        description: 'A name looks like random letters, e.g. "xkqzvbtw" or "HgTrKpLm", as names made up by bots do.',
    },
    quickBurst: {
        title: 'Many quick games from one address',
        severity: 'warning',
        description: `More than ${QUICK_LIMIT.limit} quick games (no login needed) in an hour from the same internet address.`,
    },
    joinBurst: {
        title: 'Many requests to join clubs',
        severity: 'warning',
        description: `One account asked to join more than ${JOIN_LIMIT.limit} clubs in a day.`,
    },
    linkInText: {
        title: 'Web address in a text',
        severity: 'warning',
        description: 'A club description, a format of the club or the message of a request to join contains a web address, as advertising spam does.',
    },
    adminTakeover: {
        title: 'A new admin removes the others',
        severity: 'critical',
        description: `An admin removed another admin or deleted the club within ${TAKEOVER_WINDOW_MS / HOUR} hours of being made one: a taken-over account?`,
    },
    deleteBurst: {
        title: 'Much deleted in a short time',
        severity: 'critical',
        description: `One account deleted more than ${DELETE_LIMIT.limit} games, trainings or players in ${DELETE_LIMIT.windowMs / MINUTE} minutes: a hijacked account?`,
    },
    clubBadgeBurst: {
        title: 'Club badges in a burst',
        severity: 'warning',
        description: `A club younger than ${CLUB_BADGE_BURST.youngDays} days earned ${CLUB_BADGE_BURST.badges} or more club badges within a day, usually from tiny games.`,
    },
    fairPlayImpossible: {
        title: 'Impossible games in a club',
        severity: 'critical',
        description: `A club has ${FAIR_PLAY_IMPOSSIBLE.count} or more games or trainings within 30 days whose data cannot be real; its admins see them under Fair play.`,
    },
    loginBurst: {
        title: 'Many failed logins',
        severity: 'warning',
        description: `More than ${LOGIN_LIMIT.limit} failed logins in ${LOGIN_LIMIT.windowMs / MINUTE} minutes for one account or from one address.`,
    },
    mfaReset: {
        title: 'Two-step login reset',
        severity: 'warning',
        description: 'A global admin turned off the two-step login of an account, e.g. for a lost phone. Check that the owner asked for it.',
    },
    resetBurst: {
        title: 'Many password resets',
        severity: 'warning',
        description: `More than ${RESET_LIMIT.limit} password resets asked for in an hour for one account or from one address.`,
    },
};

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|net|org|info|biz|xyz|top|online|site|shop|ru|cn|io|co|de|ch)\b)/i;

/**
 * True when a name contains a web address.
 */
export const hasLink = (name) => LINK.test(String(name ?? ''));

/**
 * True when a name looks like random letters: a long run of consonants,
 * a long word without vowels, or a long word that keeps switching case.
 */
export const looksRandom = (name) => String(name ?? '').split(/[^A-Za-zÀ-ÿ]+/).some(word => {
    if (word.length < 6) return false;
    if (/[bcdfghjklmnpqrstvwxz]{7,}/i.test(word)) return true;
    if (word.length >= 8 && !/[aeiouyäöüéèàáíóú]/i.test(word)) return true;
    const caseSwitches = [...word].filter((char, i) => i > 0 && (char === char.toUpperCase()) !== (word[i - 1] === word[i - 1].toUpperCase())).length;
    return word.length >= 8 && caseSwitches >= 4;
});

/**
 * True when the form was sent faster than a person can; without a time
 * (e.g. the API used directly) nothing is known.
 */
export const sentTooFast = (formTimeMs) => {
    const ms = Number(formTimeMs);
    return formTimeMs != null && formTimeMs !== '' && Number.isFinite(ms) && ms >= 0 && ms < MIN_FORM_MS;
};

/**
 * Counts events per key within a sliding time window, in memory.
 */
export const createCounter = (now = () => Date.now()) => {
    const events = new Map();
    return {
        // adds an event and returns how many there were in the window, this one included
        add(key, windowMs) {
            const since = now() - windowMs;
            const recent = (events.get(key) ?? []).filter(time => time > since);
            recent.push(now());
            events.set(key, recent);
            return recent.length;
        },
        count(key, windowMs) {
            const since = now() - windowMs;
            return (events.get(key) ?? []).filter(time => time > since).length;
        },
        // forget old events now and then, so the map does not grow forever
        prune(maxWindowMs) {
            const since = now() - maxWindowMs;
            for (const [key, times] of events) {
                const recent = times.filter(time => time > since);
                if (recent.length) events.set(key, recent);
                else events.delete(key);
            }
        },
    };
};
