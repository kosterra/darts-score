/**
 * What the app tells its users about, as topics: each topic covers one or
 * more kinds of notification, belongs to a group, and has a default for the
 * notification center (inApp) and for mail ('off', 'instant', 'daily' or
 * 'weekly'). Users change these on their profile.
 *
 * Plain data and functions without texts: the API keeps an identical copy
 * (see shared.js) to deliver the notifications. The texts of the settings are
 * in components/profile/notification.settings.jsx.
 */

export const MAIL_CHOICES = ['off', 'instant', 'daily', 'weekly'];

// who sees a group: everyone, the admins of a club, the global admins
export const NOTIFICATION_GROUPS = [
    { id: 'games', audience: 'player' },
    { id: 'club', audience: 'player' },
    { id: 'admin', audience: 'clubAdmin' },
    { id: 'global', audience: 'globalAdmin' },
    { id: 'security', audience: 'everyone' },
];

/**
 * The topics. kinds: the kinds of notification it covers; mailOnly: a mail
 * only (a summary), without a notification in the center; mails: the mail
 * choices it offers; locked: always on (security).
 */
export const NOTIFICATION_TOPICS = [
    { id: 'badges', group: 'games', kinds: ['badgeEarned'], inApp: true, mail: 'off' },
    { id: 'level', group: 'games', kinds: ['levelUp'], inApp: true, mail: 'off' },
    { id: 'records', group: 'games', kinds: ['recordBeaten', 'personalBest'], inApp: true, mail: 'off' },
    { id: 'shame', group: 'games', kinds: ['shameGot', 'shameWashed'], inApp: true, mail: 'off' },
    { id: 'rating', group: 'games', kinds: ['ratingPassed', 'ratingPassedBy'], inApp: false, mail: 'off' },
    { id: 'runningGames', group: 'games', kinds: ['gameRunning'], inApp: true, mail: 'off' },
    { id: 'deletion', group: 'games', kinds: ['deletionRequested', 'deletionDone', 'deletionKept'], inApp: true, mail: 'instant' },
    { id: 'fairPlay', group: 'games', kinds: ['fairPlayDeleted', 'fairPlayRepaired', 'fairPlayRestored'], inApp: true, mail: 'instant' },
    { id: 'weeklySummary', group: 'games', kinds: [], mailOnly: true, mails: ['off', 'weekly'], inApp: false, mail: 'off' },

    { id: 'clubBadges', group: 'club', kinds: ['clubBadge'], inApp: true, mail: 'off' },
    { id: 'clubGoals', group: 'club', kinds: ['clubGoal'], inApp: true, mail: 'off' },
    { id: 'joining', group: 'club', kinds: ['joinAccepted', 'joinDeclined'], inApp: true, mail: 'instant' },

    { id: 'joinRequests', group: 'admin', kinds: ['joinRequested', 'clubJoined'], inApp: true, mail: 'instant' },
    { id: 'fairPlayFound', group: 'admin', kinds: ['fairPlayFound'], inApp: true, mail: 'daily' },
    { id: 'goalEnding', group: 'admin', kinds: ['goalEnding'], inApp: true, mail: 'off' },
    { id: 'inviteUnused', group: 'admin', kinds: ['inviteUnused'], inApp: true, mail: 'off' },
    { id: 'clubSummary', group: 'admin', kinds: [], mailOnly: true, mails: ['off', 'weekly'], inApp: false, mail: 'off' },

    { id: 'alertsCritical', group: 'global', kinds: ['alertCritical'], inApp: true, mail: 'instant' },
    { id: 'alertsWarning', group: 'global', kinds: ['alertWarning'], inApp: true, mail: 'daily' },
    { id: 'errors', group: 'global', kinds: ['errorSpike'], inApp: true, mail: 'daily' },
    { id: 'usageReport', group: 'global', kinds: [], mailOnly: true, mails: ['off', 'weekly'], inApp: false, mail: 'weekly' },

    { id: 'security', group: 'security', kinds: ['passwordChanged', 'emailChanged', 'accountBlocked', 'mfaEnabled', 'mfaDisabled', 'mfaRecoveryUsed', 'mfaReset'], inApp: true, mail: 'instant', locked: true },
];

const BY_ID = new Map(NOTIFICATION_TOPICS.map(topic => [topic.id, topic]));
const BY_KIND = new Map(NOTIFICATION_TOPICS.flatMap(topic => topic.kinds.map(kind => [kind, topic])));

export const topicById = (id) => BY_ID.get(id) ?? null;
export const topicOfKind = (kind) => BY_KIND.get(kind) ?? null;

// the mail choices a topic offers
export const mailChoicesOf = (topic) => topic.mails ?? MAIL_CHOICES;

/**
 * How a user gets a topic: what they chose, else its default.
 * stored: { [topicId]: { inApp, mail } } as kept with the account.
 */
export const preferenceOf = (stored, topicId) => {
    const topic = topicById(topicId);
    if (!topic) return { inApp: false, mail: 'off' };
    if (topic.locked) return { inApp: topic.inApp, mail: topic.mail };
    const own = stored?.[topicId] ?? {};
    return {
        inApp: topic.mailOnly ? false : typeof own.inApp === 'boolean' ? own.inApp : topic.inApp,
        mail: mailChoicesOf(topic).includes(own.mail) ? own.mail : topic.mail,
    };
};

/**
 * The preferences as they may be kept: known topics only, a known choice
 * each, nothing for the locked ones.
 */
export const normalizePreferences = (raw) => {
    const result = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
    for (const [id, value] of Object.entries(raw)) {
        const topic = topicById(id);
        if (!topic || topic.locked || !value || typeof value !== 'object') continue;
        const entry = {};
        if (typeof value.inApp === 'boolean' && !topic.mailOnly) entry.inApp = value.inApp;
        if (mailChoicesOf(topic).includes(value.mail)) entry.mail = value.mail;
        if (Object.keys(entry).length) result[id] = entry;
    }
    return result;
};

/**
 * The topics a player without a login may get by mail at the address their
 * club keeps for them, with how: a mail a day with what happened, or the
 * weekly summary.
 */
export const CONTACT_TOPICS = [
    { id: 'badges', mail: 'daily' },
    { id: 'level', mail: 'daily' },
    { id: 'records', mail: 'daily' },
    { id: 'weeklySummary', mail: 'weekly' },
];
