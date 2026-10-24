/**
 * The mails of the app as templates the global admins can edit: a subject,
 * a text with placeholders ({{firstname}}) and the label of the button that
 * carries the link. Every mail goes out as plain text and as HTML in one
 * layout: the name of the app on top, the text, the button, a short footer.
 */

import { TEMPLATE_TEXTS, layoutOf } from './mail.languages.js';

// the languages a mail can be written in; English is the default
export const MAIL_LANGUAGES = ['en', 'de', 'fr', 'it', 'es'];

const COMMON = [
    { key: 'firstname', description: 'First name of the person the mail is for', sample: 'Anna' },
    { key: 'link', description: 'The link of the button (also as plain text below it)', sample: 'https://oche.example.com/reset-password?token=…' },
    { key: 'appUrl', description: 'Address of this installation', sample: 'https://oche.example.com' },
];
const CLUB = [
    { key: 'club', description: 'Name of the club', sample: 'Red Lion Darts Club' },
    { key: 'inviter', description: 'Name of the admin who did it', sample: 'Alex Brunner' },
];
const VALIDITY = { key: 'validity', description: 'How long the link works, e.g. "7 days"', sample: '7 days' };
const NICKNAME = { key: 'nickname', description: 'Nickname of the player', sample: 'Sammy' };
const DATE = { key: 'date', description: 'When it happened', sample: '24.10.2026 20:15' };
const TOURNAMENT = [
    { key: 'club', description: 'Name of the club', sample: 'Red Lion Darts Club' },
    { key: 'tournament', description: 'Name of the tournament', sample: 'Autumn Cup' },
    { key: 'closes', description: 'Until when the registration is open', sample: '7.11.2026 20:00' },
    { key: 'schedule', description: 'The rounds with their days and rules, one line each', sample: '• Quarter-finals: 14.11.2026, best of 5 legs\n• Semi-finals: 21.11.2026, best of 7 legs\n• Final: 28.11.2026, best of 9 legs' },
    { key: 'declineLink', description: 'The link to decline', sample: 'https://oche.example.com/tournament-reply?token=…&answer=out' },
];

export const MAIL_TEMPLATES = [
    {
        id: 'passwordReset',
        title: 'Password reset',
        description: 'Someone asked for a new password on the login page.',
        placeholders: [...COMMON, { ...VALIDITY, sample: '1 hour' }],
        subject: 'Reset your Oche password',
        body: 'Hello {{firstname}},\n\nWe received a request to reset the password of your Oche account. Use the button below to choose a new one. The link works once and expires in {{validity}}.\n\nIf you did not ask for this, you can ignore this email: your password stays as it is.',
        button: 'Choose a new password',
    },
    {
        id: 'adminAdded',
        title: 'Club admin added',
        description: 'An admin made an existing account an admin of their club.',
        placeholders: [...COMMON, ...CLUB],
        subject: 'You are now an admin of {{club}}',
        body: 'Hello {{firstname}},\n\n{{inviter}} has made you an administrator of {{club}} on Oche. As an admin you look after the club: its players, their logins, the games and the settings.\n\nLog in with your email address to get started.',
        button: 'Open Oche',
    },
    {
        id: 'adminInvited',
        title: 'Club admin invited (new account)',
        description: 'An admin made someone without an account an admin of their club: the account is created and they choose their password.',
        placeholders: [...COMMON, ...CLUB, VALIDITY],
        subject: 'You are invited to run {{club}} on Oche',
        body: 'Hello {{firstname}},\n\n{{inviter}} has made you an administrator of {{club}} on Oche, the scoreboard and statistics for darts clubs. An account has been created for you.\n\nChoose your password with the button below to log in. The link is valid for {{validity}}.',
        button: 'Choose your password',
    },
    {
        id: 'playerAdded',
        title: 'Player login added',
        description: 'An admin gave an existing account the login of a player of their club.',
        placeholders: [...COMMON, ...CLUB, NICKNAME],
        subject: 'Your login for {{club}}',
        body: 'Hello {{firstname}},\n\n{{inviter}} has given you a login for {{club}} on Oche, as the player {{nickname}}. You can now start games and trainings on your own and follow your statistics, badges and level.\n\nLog in with your email address to get started.',
        button: 'Open Oche',
    },
    {
        id: 'playerInvited',
        title: 'Player login invited (new account)',
        description: 'An admin gave someone without an account the login of a player: the account is created and they choose their password.',
        placeholders: [...COMMON, ...CLUB, NICKNAME, VALIDITY],
        subject: 'You are invited to play at {{club}}',
        body: 'Hello {{firstname}},\n\n{{inviter}} has invited you to {{club}} on Oche, the scoreboard and statistics for darts clubs, as the player {{nickname}}. An account has been created for you.\n\nChoose your password with the button below to log in. The link is valid for {{validity}}.',
        button: 'Choose your password',
    },
    {
        id: 'notification',
        title: 'Notification',
        description: 'A notification the user chose to get by mail at once, e.g. a request to join the club.',
        placeholders: [...COMMON, { key: 'title', description: 'What happened, in one line', sample: 'Anna Muster asks to join Red Lion Darts Club' }, { key: 'details', description: 'More about it', sample: 'Anna plays as Sammy. Accept or decline the request.' }],
        subject: '{{title}}',
        body: 'Hello {{firstname}},\n\n{{title}}\n\n{{details}}',
        button: 'Open in Oche',
    },
    {
        id: 'digest',
        title: 'Notifications of the day or week',
        description: 'The notifications the user chose to get by mail once a day or once a week, in one mail.',
        placeholders: [...COMMON, { key: 'period', description: '"today" or "this week"', sample: 'today' }, { key: 'list', description: 'The notifications, one per line', sample: '• Sammy earned the badge One Hundred and Eighty!\n• Red Lion Darts Club reached its goal: 100 × 180' }],
        subject: 'Your Oche news {{period}}',
        body: 'Hello {{firstname}},\n\nThis happened {{period}}:\n\n{{list}}',
        button: 'Open your notifications',
    },
    {
        id: 'weeklySummary',
        title: 'Weekly summary of a player',
        description: 'Once a week, for the players who chose it: their games, average, badges and level of the week.',
        placeholders: [...COMMON, { key: 'summary', description: 'The week, one line per figure', sample: '• 12 games, 7 won\n• X01 average 54.3\n• 2 new badges' }],
        subject: 'Your week on the oche',
        body: 'Hello {{firstname}},\n\nThis was your week on the oche:\n\n{{summary}}',
        button: 'Your statistics',
    },
    {
        id: 'tournamentInvite',
        title: 'Tournament invitation',
        description: 'A club admin opened the registration of a tournament: every member is asked to enter, with a link to enter and one to decline.',
        placeholders: [...COMMON, ...TOURNAMENT],
        subject: 'You are invited: {{tournament}} of {{club}}',
        body: 'Hello {{firstname}},\n\n{{club}} holds a tournament, {{tournament}}, and you are invited to play.\n\n{{schedule}}\n\nWill you play? Enter with the button below until {{closes}}. Not this time? {{declineLink}}',
        button: 'I\'m in',
    },
    {
        id: 'tournamentReminder',
        title: 'Tournament reminder',
        description: 'A day before the registration of a tournament ends, for the members who have not answered yet.',
        placeholders: [...COMMON, ...TOURNAMENT],
        subject: 'Last chance to enter {{tournament}}',
        body: 'Hello {{firstname}},\n\nthe registration for {{tournament}} of {{club}} ends on {{closes}}, and you have not answered yet.\n\n{{schedule}}\n\nEnter with the button below. Not this time? {{declineLink}}',
        button: 'I\'m in',
    },
    {
        id: 'usageReport',
        title: 'Weekly usage report',
        description: 'On Mondays, for the global admins who keep it on: the use of the app in the week that ended, against the week before.',
        placeholders: [...COMMON, { key: 'week', description: 'The week, from Monday to Sunday', sample: '19.10.2026 – 25.10.2026' }, { key: 'summary', description: 'The figures of the week, one line each', sample: '• Active users: 42 (+12 %)\n• Logins: 118 (+5 %)\n• Games started: 230 (−3 %)' }],
        subject: 'Oche: the week of {{week}}',
        body: 'Hello {{firstname}},\n\nThis is how Oche was used in the week of {{week}}, against the week before:\n\n{{summary}}',
        button: 'Usage in detail',
    },
    {
        id: 'clubSummary',
        title: 'Weekly summary of a club',
        description: 'Once a week, for the club admins who chose it: the games, players, badges, records and goals of the week.',
        placeholders: [...COMMON, CLUB[0], { key: 'summary', description: 'The week, one line per figure', sample: '• 48 games by 14 players\n• 3 new club records\n• Goal 100 × 180: 64 of 100' }],
        subject: 'The week of {{club}}',
        body: 'Hello {{firstname}},\n\nThis was the week of {{club}}:\n\n{{summary}}',
        button: 'Open the club',
    },
    {
        id: 'passwordChanged',
        title: 'Password changed',
        description: 'The password of an account was changed: by its user, with a reset link or by a global admin. Always sent.',
        placeholders: [...COMMON, DATE],
        subject: 'Your Oche password was changed',
        body: 'Hello {{firstname}},\n\nThe password of your Oche account was changed on {{date}}. If that was you, all is well.\n\nIf it was not you, choose a new password right away with the button below and tell the admins of your club.',
        button: 'Choose a new password',
    },
    {
        id: 'emailChanged',
        title: 'Email address changed',
        description: 'The email address of an account was changed; the mail goes to the old address. Always sent.',
        placeholders: [...COMMON, { key: 'oldEmail', description: 'The address before', sample: 'anna@example.com' }, { key: 'newEmail', description: 'The new address', sample: 'anna.muster@example.com' }, DATE],
        subject: 'The email address of your Oche account was changed',
        body: 'Hello {{firstname}},\n\nThe email address of your Oche account was changed from {{oldEmail}} to {{newEmail}} on {{date}}. From now on you log in with the new one.\n\nIf it was not you, tell the admins of your club right away: they can set the address back.',
        button: 'Open Oche',
    },
    {
        id: 'accountBlocked',
        title: 'Account blocked',
        description: 'An account was blocked by a global admin or a spam rule. Always sent.',
        placeholders: [...COMMON, { key: 'reason', description: 'Why it was blocked', sample: 'More than 30 games created in an hour' }],
        subject: 'Your Oche account was blocked',
        body: 'Hello {{firstname}},\n\nYour Oche account was blocked, so you can no longer log in. The reason: {{reason}}\n\nIf you think this is a mistake, tell the admins of your club.',
        button: 'Open Oche',
    },
    {
        id: 'securityNotice',
        title: 'Two-step login changed',
        description: 'Two-step login of an account was turned on or off, reset by a global admin, or a recovery code was used. Always sent.',
        placeholders: [...COMMON, { key: 'title', description: 'What happened, in one line', sample: 'Two-step login is on' }, { key: 'details', description: 'More about it', sample: 'From now on Oche asks for a code of your authenticator app after the password.' }, DATE],
        subject: '{{title}}',
        body: 'Hello {{firstname}},\n\n{{title}} ({{date}}).\n\n{{details}}',
        button: 'Open Oche',
    },
    {
        id: 'contactNews',
        title: 'News for a player without a login',
        description: 'For a player without a login whose address the club keeps: their badges, level and records, or their week. The button leads to a login of their own.',
        placeholders: [...COMMON, CLUB[0], NICKNAME, { key: 'title', description: 'What it is about', sample: 'Your week on the oche' }, { key: 'details', description: 'What happened, one line each', sample: '• Sammy earned the badge One Hundred and Eighty!\n• Sammy is now a Club Regular' }],
        subject: '{{title}}',
        body: 'Hello {{firstname}},\n\n{{details}}\n\nYou get this mail because {{club}} keeps your address for your player {{nickname}}. With a login of your own you see your statistics, badges and level any time.',
        button: 'Get your own login',
    },
];

export const LIMITS = { subject: 150, body: 4000, button: 40 };

const templateOf = (id) => MAIL_TEMPLATES.find(template => template.id === id);

// the default texts of a template in a language: { subject, body, button }
export const defaultsOf = (id, language = 'en') => {
    const template = templateOf(id);
    if (!template) return null;
    const { subject, body, button } = TEMPLATE_TEXTS[language]?.[id] ?? template;
    return { subject, body, button };
};

// where what the global admins changed is kept: English under the id, the other languages beside it
export const overrideKey = (id, language = 'en') => language === 'en' ? id : `${id}:${language}`;

// what the template is now: the defaults of the language with what the global admins changed
export const effectiveTemplate = (id, overrides = {}, language = 'en') => {
    const defaults = defaultsOf(id, language);
    if (!defaults) return null;
    const own = overrides[overrideKey(id, language)] ?? {};
    return {
        subject: own.subject ?? defaults.subject,
        body: own.body ?? defaults.body,
        button: own.button ?? defaults.button,
    };
};

/**
 * Why an edited template cannot be saved, or null: a field empty or too long,
 * or a placeholder the template does not know.
 */
export const templateError = (id, { subject, body, button } = {}) => {
    const template = templateOf(id);
    if (!template) return 'There is no such mail.';
    for (const [key, value] of Object.entries({ subject, body, button })) {
        if (typeof value !== 'string' || !value.trim()) return `The ${key} is empty.`;
        if (value.length > LIMITS[key]) return `The ${key} is longer than ${LIMITS[key]} characters.`;
    }
    const known = new Set(template.placeholders.map(placeholder => placeholder.key));
    const unknown = [...`${subject} ${body} ${button}`.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map(match => match[1]).find(key => !known.has(key));
    if (unknown !== undefined) return `{{${unknown}}} is no placeholder of this mail.`;
    return null;
};

const fill = (text, vars, escape = (value) => value) => text.replace(/\{\{\s*([A-Za-z]+)\s*\}\}/g, (all, key) => (key in vars ? escape(String(vars[key])) : all));

export const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * How long a link works, in words of the language: "1 hour", "7 days".
 */
export const validityOf = (hours, language = 'en') => {
    const { hour, day } = layoutOf(language);
    const [count, [one, other]] = hours % 24 === 0 ? [hours / 24, day] : [hours, hour];
    return `${count} ${count === 1 ? one : other}`;
};

// the samples of a template, for the preview and the test mail (the validity in the language)
export const sampleVars = (id, language = 'en') => Object.fromEntries((templateOf(id)?.placeholders ?? []).map(placeholder => [
    placeholder.key,
    placeholder.key === 'validity' ? validityOf(placeholder.sample === '1 hour' ? 1 : 7 * 24, language) : placeholder.sample,
]));

const BRAND = '#528b6e';

/**
 * The mail ready to send: { subject, text, html }. vars fill the placeholders
 * (link: the address behind the button, appUrl: the installation); the
 * layout around the text is in the language of the mail.
 */
export const renderMail = ({ subject, body, button }, vars, language = 'en') => {
    const layout = layoutOf(language);
    const filledBody = fill(body, vars);
    const footer = layout.footer(vars.appUrl);
    // a link to choose the notifications (an account) or to get no more (a player without a login)
    const manage = vars.manageUrl ? { label: layout.manage, url: vars.manageUrl } : vars.unsubscribeUrl ? { label: layout.unsubscribe, url: vars.unsubscribeUrl } : null;
    const text = `${filledBody}\n\n${fill(button, vars)}: ${vars.link}\n\n--\n${footer}\n${manage ? `${manage.label} ${manage.url}\n` : ''}`;

    const paragraphs = fill(body, vars, escapeHtml)
        .split(/\n{2,}/)
        .map(paragraph => `<p style="margin:0 0 16px;">${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('');
    const link = escapeHtml(vars.link ?? '');
    const html = `<!doctype html>
<html lang="${MAIL_LANGUAGES.includes(language) ? language : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(fill(subject, vars))}</title></head>
<body style="margin:0;padding:0;background:#f2f3f1;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f1;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#2b2b2b;">
<tr><td style="background:${BRAND};padding:18px 28px;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">Oche</td></tr>
<tr><td style="padding:28px 28px 8px;font-size:15px;line-height:1.6;">${paragraphs}</td></tr>
<tr><td style="padding:0 28px 28px;">
<a href="${link}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:6px;">${escapeHtml(fill(button, vars))}</a>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#777777;">${escapeHtml(layout.noButton)}<br><a href="${link}" style="color:${BRAND};word-break:break-all;">${link}</a></p>
</td></tr>
<tr><td style="padding:16px 28px;background:#f7f8f6;border-top:1px solid #e6e8e4;font-size:12px;line-height:1.5;color:#888888;">${escapeHtml(footer)}${manage ? `<br>${escapeHtml(manage.label)} <a href="${escapeHtml(manage.url)}" style="color:${BRAND};">${escapeHtml(manage.url)}</a>` : ''}</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    return { subject: fill(subject, vars), text, html };
};
