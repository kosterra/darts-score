import { randomBytes } from 'node:crypto';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { REASON_MAX, WEEKS_AHEAD, addDays, clubNightsBetween, competitionEvents, dayKey, isClubNight, isDayKey, nightsError } from '../rules/calendar.js';
import { getAppUrl } from './mail.utils.js';
import { deliverQuietly } from './notify.js';
import { translate } from './translate.js';
import { eveningReport, gameSummary } from './evenings.js';

/**
 * The calendar of a club (see rules/calendar.js): its weekly club nights,
 * set by its admins, who also cancel single nights; whether each member
 * comes; the days of its tournaments and leagues. And the same as an iCal
 * feed, at a secret address per user, for the calendar of the phone.
 */

const failure = (message, status) => Object.assign(new Error(message), { status });
// a day as every language of the app reads it: 03.11.2026
const dayText = (key) => key.split('-').reverse().join('.');
// how far back the calendar and the feed reach
const DAYS_BACK = 28;
const ROUND_NAMES = { 0: 'Group stage', 2: 'Final', 4: 'Semi-finals', 8: 'Quarter-finals' };
const roundName = (size) => ROUND_NAMES[size] ?? `Last ${size}`;

// the members of a club with a login, to tell them
const membersOf = async (clubId) => db.player.find({ clubs: clubId, user: { $ne: null } }, 'user nickname').lean();

// ---------------------------------------------------------------------------
// The club nights
// ---------------------------------------------------------------------------

/**
 * The admins set the weekly club nights. Cancelled nights that are long
 * past are dropped on the way.
 */
export const saveNights = async (club, nights) => {
    const clean = (Array.isArray(nights) ? nights : []).map(night => ({
        weekday: Number(night.weekday), start: String(night.start ?? ''), end: night.end ? String(night.end) : '', note: String(night.note ?? '').trim(),
    }));
    const problem = nightsError(clean);
    if (problem) throw failure(problem, 422);
    const since = addDays(dayKey(new Date()), -DAYS_BACK);
    club.calendar = {
        nights: clean.sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)),
        cancelled: (club.calendar?.cancelled ?? []).filter(entry => entry.day >= since),
    };
    club.markModified('calendar');
    await club.save();
    return club;
};

// a coming club night of the club, or why not
const checkNight = (club, day) => {
    if (!isDayKey(day)) throw failure('Choose a day.', 422);
    if (!isClubNight(club.calendar?.nights, day)) throw failure('There is no club night on that day.', 404);
    if (day < dayKey(new Date())) throw failure('This club night is over.', 409);
};

/**
 * An admin cancels a club night (or changes the reason); every member hears
 * of it.
 */
export const cancelNight = async (club, day, reason = '') => {
    checkNight(club, day);
    const why = String(reason ?? '').trim();
    if (why.length > REASON_MAX) throw failure(`The reason is at most ${REASON_MAX} characters.`, 422);
    const known = (club.calendar.cancelled ?? []).some(entry => entry.day === day);
    club.calendar.cancelled = [...(club.calendar.cancelled ?? []).filter(entry => entry.day !== day), { day, reason: why }];
    club.markModified('calendar');
    await club.save();
    if (!known) {
        const members = await membersOf(club._id);
        await deliverQuietly(members.map(member => ({
            user: member.user, club: club._id, link: '/calendar', kind: 'clubNightCancelled',
            title: `No club night on ${dayText(day)}`, body: why ? `Reason: ${why}` : '',
        })));
    }
    logger.info(`Club night ${day} of club ${club._id} cancelled`);
    return club;
};

// an admin takes the cancellation back; every member hears of it
export const restoreNight = async (club, day) => {
    checkNight(club, day);
    if (!(club.calendar.cancelled ?? []).some(entry => entry.day === day)) return club;
    club.calendar.cancelled = club.calendar.cancelled.filter(entry => entry.day !== day);
    club.markModified('calendar');
    await club.save();
    const members = await membersOf(club._id);
    await deliverQuietly(members.map(member => ({
        user: member.user, club: club._id, link: '/calendar', kind: 'clubNightCancelled',
        title: `The club night on ${dayText(day)} takes place after all`, body: '',
    })));
    return club;
};

/**
 * A member says whether they come to a club night (null: takes the answer
 * back).
 */
export const answerNight = async (club, day, playerId, answer) => {
    checkNight(club, day);
    if ((club.calendar.cancelled ?? []).some(entry => entry.day === day)) throw failure('This club night is cancelled.', 409);
    if (!playerId) throw failure('Only players of the club answer.', 403);
    if (answer === null) await db.attendance.deleteOne({ club: club._id, day, player: playerId });
    else await db.attendance.updateOne({ club: club._id, day, player: playerId }, { $set: { answer } }, { upsert: true });
};

// ---------------------------------------------------------------------------
// The club evening: the games of a club night among the players there
// ---------------------------------------------------------------------------

const EVENING_KINDS = ['x01', 'cricket', 'elimination'];
export const CLUB_EVENING_MAX_PLAYERS = 20;

/**
 * The club evening of a night, as a darts evening has it: the club games
 * played between from and to (the page knows the club's time) with only the
 * chosen players, newest first, and the table, awards, who beat whom and the
 * form from them. Players who are not members of the club are left out.
 * → { players: [{ id, name }], games, report }
 */
export const clubEvening = async (club, { from, to, players }) => {
    const members = await db.player.find({ _id: { $in: players }, clubs: club._id }, 'nickname profileImg').lean();
    const chosen = players.map(id => members.find(member => String(member._id) === String(id))).filter(Boolean)
        .map(member => ({ id: String(member._id), name: member.nickname, profileImg: member.profileImg ?? '' }));
    const ids = new Set(chosen.map(player => player.id));
    const found = await Promise.all(EVENING_KINDS.map(kind => db[kind].find({ club: club._id, createdAt: { $gte: from, $lte: to }, players: { $in: [...ids] } }).lean()
        .then(list => list.map(doc => ({ ...doc, kind, data: doc })))));
    // only the games among the players of the evening
    const games = found.flat().filter(game => (game.players ?? []).length >= 2 && game.players.every(id => ids.has(String(id))));
    return {
        players: chosen,
        games: [...games].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(gameSummary),
        report: eveningReport({ players: chosen }, games),
    };
};

// ---------------------------------------------------------------------------
// The calendar as the app shows it
// ---------------------------------------------------------------------------

// the club's tournaments and leagues others can see, for their days
const competitionsOf = async (clubIds) => {
    const [tournaments, leagues] = await Promise.all([
        db.tournament.find({ club: { $in: clubIds }, status: { $nin: ['draft', 'cancelled'] } }, 'club name status closesAt rounds').lean(),
        db.league.find({ club: { $in: clubIds }, status: { $ne: 'cancelled' } }, 'club name status matchdays firstDay everyDays meetings players').lean(),
    ]);
    const plain = (list) => list.map(entry => ({ ...entry, id: String(entry._id), club: String(entry.club) }));
    return { tournaments: plain(tournaments), leagues: plain(leagues) };
};

/**
 * The calendar of a club from one day to another: the weekly nights (as
 * set), every club night in the time with who comes, and the days of its
 * tournaments and leagues.
 */
export const calendarView = async (club, { playerId = null, isAdmin = false, from, to }) => {
    const nights = club.calendar?.nights ?? [];
    const list = clubNightsBetween(nights, club.calendar?.cancelled ?? [], from, to);
    const answers = list.length ? await db.attendance.find({ club: club._id, day: { $gte: from, $lte: to } }, 'day player answer').lean() : [];
    const players = await db.player.find({ _id: { $in: [...new Set(answers.map(entry => String(entry.player)))] } }, 'nickname').lean();
    const names = new Map(players.map(player => [String(player._id), player.nickname]));
    const who = (day, answer) => answers.filter(entry => entry.day === day && entry.answer === answer).map(entry => ({ player: String(entry.player), nickname: names.get(String(entry.player)) ?? '?' }))
        .sort((a, b) => a.nickname.localeCompare(b.nickname));

    const { tournaments, leagues } = await competitionsOf([club._id]);
    const start = new Date(`${addDays(from, -1)}T00:00:00Z`);
    const end = new Date(`${addDays(to, 2)}T00:00:00Z`);
    return {
        from, to,
        nights,
        myPlayer: playerId ? String(playerId) : null,
        clubNights: list.map(night => {
            const yes = who(night.day, 'yes');
            const no = who(night.day, 'no');
            const mine = playerId ? answers.find(entry => entry.day === night.day && String(entry.player) === String(playerId))?.answer ?? null : null;
            // everyone sees who comes; who does not only the admins
            return { ...night, coming: yes, notComing: isAdmin ? no : [], notComingCount: no.length, me: mine };
        }),
        events: competitionEvents({ tournaments, leagues }).filter(event => event.at >= start && event.at < end),
    };
};

// the days the app shows when it asks for none: from today, some weeks ahead
export const defaultRange = (today = dayKey(new Date())) => ({ from: today, to: addDays(today, 8 * 7) });

// a range asked for, within reason
export const rangeOf = (query) => {
    const fallback = defaultRange();
    const from = isDayKey(query.from) ? query.from : fallback.from;
    const to = isDayKey(query.to) && query.to >= from ? query.to : addDays(from, 8 * 7);
    return { from, to: to > addDays(from, 7 * WEEKS_AHEAD) ? addDays(from, 7 * WEEKS_AHEAD) : to };
};

// ---------------------------------------------------------------------------
// The feed (iCal)
// ---------------------------------------------------------------------------

// the user's secret for the feed, made when first asked for (or new: the old address stops working)
export const feedTokenOf = async (user, { renew = false } = {}) => {
    if (user.calendarToken && !renew) return user.calendarToken;
    const token = randomBytes(24).toString('hex');
    await db.user.updateOne({ _id: user._id }, { $set: { calendarToken: token } });
    return token;
};

export const feedUrlOf = (token) => `${getAppUrl()}/api/calendar-feed/${token}.ics`;

// a text as iCal wants it: backslash, semicolon, comma and line breaks escaped
const escape = (text) => String(text ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// lines of at most 75 octets, the rest on lines starting with a space
const fold = (line) => {
    const bytes = Buffer.from(line, 'utf8');
    if (bytes.length <= 75) return line;
    const parts = [];
    let current = '';
    for (const char of line) {
        if (Buffer.byteLength(current + char, 'utf8') > (parts.length ? 74 : 75)) {
            parts.push(current);
            current = '';
        }
        current += char;
    }
    parts.push(current);
    return parts.join('\r\n ');
};

const pad = (value) => String(value).padStart(2, '0');
// a moment in UTC: 20261103T183000Z
const utcStamp = (date) => `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
// a day and time of the club, without a time zone: the phone shows it as it is (20261103T193000)
const floating = (day, time) => `${day.replaceAll('-', '')}T${time.replace(':', '')}00`;
// the end of a club night: its end, after midnight on the next day, or three hours after it starts
const nightEnd = (night) => {
    if (night.end && night.end > night.start) return floating(night.day, night.end);
    if (night.end) return floating(addDays(night.day, 1), night.end);
    const [hours, minutes] = night.start.split(':').map(Number);
    const total = hours * 60 + minutes + 180;
    return floating(total >= 24 * 60 ? addDays(night.day, 1) : night.day, `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`);
};

/**
 * The iCal text of a calendar: name, and events { uid, start, end (as
 * stamps), summary, description, url, cancelled }.
 */
export const icsOf = ({ name, events, now = new Date() }) => {
    const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Legmate//Club calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        `X-WR-CALNAME:${escape(name)}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H',
    ];
    for (const event of events) {
        lines.push(
            'BEGIN:VEVENT',
            `UID:${event.uid}`,
            `DTSTAMP:${utcStamp(now)}`,
            `DTSTART:${event.start}`,
            `DTEND:${event.end}`,
            `SUMMARY:${escape(event.summary)}`,
            ...(event.description ? [`DESCRIPTION:${escape(event.description)}`] : []),
            ...(event.url ? [`URL:${event.url}`] : []),
            ...(event.cancelled ? ['STATUS:CANCELLED'] : []),
            'END:VEVENT',
        );
    }
    lines.push('END:VCALENDAR');
    return `${lines.map(fold).join('\r\n')}\r\n`;
};

/**
 * The feed of a user: the club nights and the days of the tournaments and
 * leagues of every club they belong to, in their language; or null for a
 * token nobody has.
 */
export const feedOf = async (token) => {
    if (!/^[0-9a-f]{48}$/.test(String(token))) return null;
    const user = await db.user.findOne({ calendarToken: token }, 'language').lean();
    if (!user) return null;
    const language = user.language ?? 'en';
    const say = (text) => translate(language, text);
    const own = await db.player.find({ user: user._id }, 'clubs').lean();
    const clubIds = [...new Set(own.flatMap(player => (player.clubs ?? []).map(String)))];
    const clubs = await db.club.find({ $or: [{ _id: { $in: clubIds } }, { admins: user._id }] }, 'name calendar').lean();
    const myPlayers = new Set(own.map(player => String(player._id)));
    const from = addDays(dayKey(new Date()), -DAYS_BACK);
    const to = addDays(from, DAYS_BACK + 7 * WEEKS_AHEAD);
    const app = getAppUrl();
    const several = clubs.length > 1;
    const events = [];

    const answers = await db.attendance.find({ club: { $in: clubs.map(club => club._id) }, day: { $gte: from }, player: { $in: [...myPlayers] }, answer: 'yes' }, 'club day').lean();
    const coming = new Set(answers.map(entry => `${entry.club}:${entry.day}`));
    for (const club of clubs) {
        for (const night of clubNightsBetween(club.calendar?.nights, club.calendar?.cancelled, from, to)) {
            const title = several ? say(`Club night of ${club.name}`) : say('Club night');
            events.push({
                uid: `night-${club._id}-${night.day}@legmate`,
                start: floating(night.day, night.start),
                end: nightEnd(night),
                summary: night.cancelled ? `${say('Cancelled')}: ${title}` : title,
                description: [night.note, night.cancelled?.reason && say(`Reason: ${night.cancelled.reason}`), coming.has(`${club._id}:${night.day}`) && say('You said you are coming.')].filter(Boolean).join('\n'),
                url: app ? `${app}/calendar` : '',
                cancelled: Boolean(night.cancelled),
            });
        }
    }
    const { tournaments, leagues } = await competitionsOf(clubs.map(club => club._id));
    for (const event of competitionEvents({ tournaments, leagues })) {
        const summary = {
            registrationEnds: () => `${event.name} · ${say('Registration ends')}`,
            tournamentRound: () => `${event.name} · ${say(roundName(event.round))}`,
            matchday: () => `${event.name} · ${say(`Matchday ${event.day}`)}`,
        }[event.type]();
        const length = event.type === 'registrationEnds' ? 0 : 3 * 60 * 60 * 1000;
        events.push({ uid: `${event.id}@legmate`, start: utcStamp(event.at), end: utcStamp(new Date(event.at.getTime() + length)), summary, url: app ? `${app}${event.link}` : '' });
    }
    return icsOf({ name: clubs.length === 1 ? clubs[0].name : 'Legmate', events });
};
