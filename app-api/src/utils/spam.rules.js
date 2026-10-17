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
