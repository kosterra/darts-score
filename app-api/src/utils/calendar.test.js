import { describe, expect, it, vi, beforeEach } from 'vitest';

// the clubs, members, answers and what was told, in memory
let clubs = [];
let players = [];
let users = [];
let answers = [];
let tournaments = [];
let leagues = [];
const notices = [];
const lean = (value) => ({ lean: async () => value });
const matches = (doc, query) => Object.entries(query).every(([key, value]) => {
    if (value?.$in) return value.$in.map(String).includes(String(doc[key]));
    if (value?.$gte) return doc[key] >= value.$gte && (!value.$lte || doc[key] <= value.$lte);
    return String(doc[key]) === String(value);
});
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        player: {
            find: (query) => lean(query._id ? players.filter(player => query._id.$in.map(String).includes(String(player._id)))
                : query.user?.$ne === null ? players.filter(player => player.clubs.includes(String(query.clubs)) && player.user)
                    : players.filter(player => String(player.user) === String(query.user))),
        },
        user: {
            findOne: (query) => lean(users.find(user => user.calendarToken === query.calendarToken) ?? null),
            updateOne: async (query, update) => { Object.assign(users.find(user => user._id === query._id), update.$set); },
        },
        club: { find: (query) => lean(clubs.filter(club => query.$or[0]._id.$in.includes(String(club._id)) || club.admins.includes(String(query.$or[1].admins)))) },
        attendance: {
            find: (query) => lean(answers.filter(entry => matches(entry, query))),
            updateOne: async (query, update) => {
                const found = answers.find(entry => matches(entry, query));
                if (found) Object.assign(found, update.$set); else answers.push({ ...query, ...update.$set });
            },
            deleteOne: async (query) => { answers = answers.filter(entry => !matches(entry, query)); },
        },
        tournament: { find: () => lean(tournaments) },
        league: { find: () => lean(leagues) },
    },
}));
vi.mock('./notify.js', () => ({ deliverQuietly: async (list) => { notices.push(...list); return list; } }));
vi.mock('./mail.utils.js', () => ({ getAppUrl: () => 'https://legmate.example' }));

const service = await import('./calendar.js');
const { addDays, dayKey } = await import('../rules/calendar.js');

const clubDoc = (fields = {}) => {
    const doc = { _id: 'club1', name: 'Red Lion', admins: ['admin'], calendar: { nights: [{ weekday: 2, start: '19:30', end: '23:00', note: 'Back room' }], cancelled: [] }, ...fields };
    doc.save = vi.fn(async () => doc);
    doc.markModified = vi.fn();
    return doc;
};
// the next Tuesday from today (today when it is one)
const nextTuesday = () => {
    let key = dayKey(new Date());
    while (new Date(`${key}T12:00:00Z`).getUTCDay() !== 2) key = addDays(key, 1);
    return key;
};

beforeEach(() => {
    clubs = [clubDoc()];
    players = [{ _id: 'p1', nickname: 'Anna', user: 'u1', clubs: ['club1'] }, { _id: 'p2', nickname: 'Ben', user: 'u2', clubs: ['club1'] }, { _id: 'p3', nickname: 'Cleo', user: null, clubs: ['club1'] }];
    users = [{ _id: 'u1', language: 'de', calendarToken: 'a'.repeat(48) }];
    answers = [];
    tournaments = [];
    leagues = [];
    notices.length = 0;
});

describe('the club nights', () => {
    it('are kept Monday first, checked', async () => {
        const club = clubDoc();
        await service.saveNights(club, [{ weekday: 0, start: '14:00' }, { weekday: 4, start: '19:30', end: '23:30', note: ' Upstairs ' }]);
        expect(club.calendar.nights.map(night => night.weekday)).toEqual([4, 0]);
        expect(club.calendar.nights[0].note).toBe('Upstairs');
        await expect(service.saveNights(club, [{ weekday: 1, start: '7pm' }])).rejects.toMatchObject({ status: 422 });
    });

    it('cancelled: every member with a login hears it once, with the reason', async () => {
        const club = clubDoc();
        const day = nextTuesday();
        await service.cancelNight(club, day, 'Room taken');
        expect(club.calendar.cancelled).toEqual([{ day, reason: 'Room taken' }]);
        expect(notices.map(notice => notice.user)).toEqual(['u1', 'u2']);
        expect(notices[0]).toMatchObject({ kind: 'clubNightCancelled', title: `No club night on ${day.split('-').reverse().join('.')}`, body: 'Reason: Room taken', link: '/calendar' });
        await service.cancelNight(club, day, 'The room is taken');
        expect(notices).toHaveLength(2);
        await service.restoreNight(club, day);
        expect(club.calendar.cancelled).toEqual([]);
        expect(notices).toHaveLength(4);
    });

    it('only on a day with a club night, not in the past', async () => {
        const club = clubDoc();
        await expect(service.cancelNight(club, addDays(nextTuesday(), 1))).rejects.toMatchObject({ status: 404 });
        await expect(service.cancelNight(club, addDays(nextTuesday(), -7))).rejects.toMatchObject({ status: 409 });
    });

    it('members say whether they come; everyone sees who comes, only the admins who does not', async () => {
        const club = clubDoc();
        const day = nextTuesday();
        await service.answerNight(club, day, 'p1', 'yes');
        await service.answerNight(club, day, 'p2', 'no');
        const range = { from: day, to: day };
        const member = await service.calendarView(club, { playerId: 'p2', ...range });
        expect(member.clubNights[0]).toMatchObject({ day, coming: [{ player: 'p1', nickname: 'Anna' }], notComing: [], notComingCount: 1, me: 'no' });
        const admin = await service.calendarView(club, { playerId: null, isAdmin: true, ...range });
        expect(admin.clubNights[0].notComing).toEqual([{ player: 'p2', nickname: 'Ben' }]);
        await service.answerNight(club, day, 'p1', null);
        expect(answers).toHaveLength(1);
        club.calendar.cancelled = [{ day, reason: '' }];
        await expect(service.answerNight(club, day, 'p1', 'yes')).rejects.toMatchObject({ status: 409 });
    });
});

describe('the feed', () => {
    it('has the club nights in the club\'s time, cancelled ones marked, and the days of tournaments and leagues', async () => {
        const day = nextTuesday();
        clubs[0].calendar.cancelled = [{ day: addDays(day, 7), reason: 'Room, taken' }];
        answers = [{ club: 'club1', day, player: 'p1', answer: 'yes' }];
        tournaments = [{ _id: 't1', club: 'club1', name: 'Autumn Cup', status: 'drawn', rounds: [{ size: 2, date: new Date(`${addDays(day, 3)}T18:30:00Z`) }] }];
        leagues = [{ _id: 'l1', club: 'club1', name: 'Winter League', status: 'running', matchdays: [{ day: 2, date: new Date(`${addDays(day, 1)}T18:30:00Z`) }] }];
        const ics = await service.feedOf('a'.repeat(48));
        expect(ics).toContain('X-WR-CALNAME:Red Lion\r\n');
        expect(ics).toContain(`DTSTART:${day.replaceAll('-', '')}T193000\r\nDTEND:${day.replaceAll('-', '')}T230000\r\nSUMMARY:Clubabend`);
        expect(ics).toContain('DESCRIPTION:Back room\\nDu hast zugesagt.');
        expect(ics).toContain('Grund: Room\\, taken');
        expect(ics).toContain('STATUS:CANCELLED');
        expect(ics).toContain('SUMMARY:Autumn Cup · Final');
        expect(ics).toContain('SUMMARY:Winter League · Spieltag 2');
        expect(ics).toContain('URL:https://legmate.example/leagues/l1');
        expect(ics.split('\r\n').every(line => Buffer.byteLength(line) <= 75)).toBe(true);
    });

    it('is not there for an unknown secret', async () => {
        expect(await service.feedOf('b'.repeat(48))).toBeNull();
        expect(await service.feedOf('../etc')).toBeNull();
    });

    it('folds long lines and ends a night without an end three hours later', () => {
        const ics = service.icsOf({ name: 'x', events: [{ uid: 'u', start: '20261103T220000', end: '20261104T010000', summary: 'ü'.repeat(60) }] });
        expect(ics).toMatch(/SUMMARY:ü+\r\n ü+/);
    });
});
