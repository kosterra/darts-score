// the calendar for the mock API, with the real calendar rules
import { addDays, clubNightsBetween, competitionEvents, dayKey, nightsError } from '../../src/rules/calendar.js';
import { allTournaments } from './tournaments.mjs';
import { allLeagues } from './leagues.mjs';

let nights = [];
let cancelled = [];
let answers = [];

export const seedCalendar = (players, scenario) => {
    nights = [];
    cancelled = [];
    answers = [];
    // club nights on Tuesdays and Fridays, the second Tuesday cancelled, some members coming
    if (scenario === 'nights') {
        nights = [{ weekday: 2, start: '19:30', end: '23:00', note: 'Back room of the Red Lion' }, { weekday: 5, start: '20:00', end: '', note: '' }];
        let day = dayKey(new Date());
        while (new Date(`${day}T12:00:00Z`).getUTCDay() !== 2) day = addDays(day, 1);
        cancelled = [{ day: addDays(day, 7), reason: 'The room is taken' }];
        answers = players.slice(1, 4).map((p, i) => ({ day, player: p.id, answer: i < 2 ? 'yes' : 'no' }));
    }
};

const viewOf = (players, me, isAdmin, from, to) => {
    const name = (id) => players.find(p => p.id === id)?.nickname ?? '?';
    const who = (day, answer) => answers.filter(a => a.day === day && a.answer === answer).map(a => ({ player: a.player, nickname: name(a.player) }));
    return {
        from, to, nights, myPlayer: me,
        clubNights: clubNightsBetween(nights, cancelled, from, to).map(night => ({
            ...night, coming: who(night.day, 'yes'), notComing: isAdmin ? who(night.day, 'no') : [], notComingCount: who(night.day, 'no').length,
            me: answers.find(a => a.day === night.day && a.player === me)?.answer ?? null,
        })),
        events: competitionEvents({ tournaments: allTournaments(), leagues: allLeagues() }),
    };
};

export const calendarMock = (req, res, path, json, send, { players, me, isAdmin, url }) => {
    if (path === '/api/calendar/feed-link') return send(res, 200, { url: `http://localhost:3901/api/calendar-feed/${(req.method === 'POST' ? 'b' : 'a').repeat(48)}.ics` });
    if (!path.startsWith('/api/calendar')) return false;
    const today = dayKey(new Date());
    const from = url.searchParams.get('from') ?? today;
    const to = url.searchParams.get('to') ?? addDays(today, 55);
    const view = () => send(res, 200, viewOf(players, me, isAdmin, from, to));
    if (path === '/api/calendar' && req.method === 'GET') return view();
    if (path === '/api/calendar/nights' && req.method === 'PUT') {
        const problem = nightsError(json.nights);
        if (problem) return send(res, 422, { message: problem });
        nights = json.nights;
        return view();
    }
    const night = path.match(/^\/api\/calendar\/nights\/(\d{4}-\d{2}-\d{2})\/(attendance|cancelled)$/);
    if (night && night[2] === 'attendance') {
        answers = answers.filter(a => !(a.day === night[1] && a.player === me));
        if (json.answer) answers.push({ day: night[1], player: me, answer: json.answer });
        return view();
    }
    if (night && req.method === 'PUT') { cancelled = [...cancelled.filter(c => c.day !== night[1]), { day: night[1], reason: json.reason ?? '' }]; return view(); }
    if (night && req.method === 'DELETE') { cancelled = cancelled.filter(c => c.day !== night[1]); return view(); }
    return send(res, 404, { message: 'unhandled calendar mock' });
};
