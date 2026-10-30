import { describe, expect, it, vi, beforeEach } from 'vitest';

// the clubs, who said they come, the players, what was noted as sent, and what was told
let clubs = [];
let answers = [];
let players = [];
const sentKeys = new Set();
const notices = [];
const lean = (value) => ({ lean: async () => value });
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        mongoose: { isValidObjectId: () => true },
        club: { find: () => lean(clubs) },
        attendance: { find: (query) => lean(answers.filter(entry => entry.club === query.club && entry.day === query.day && entry.answer === query.answer)) },
        player: { find: (query) => lean(players.filter(player => query._id.$in.includes(player._id) && player.user)) },
        noticeSent: { create: async ({ key }) => { if (sentKeys.has(key)) { const err = new Error('dup'); err.code = 11000; throw err; } sentKeys.add(key); } },
    },
}));
vi.mock('./notify.js', () => ({ deliverQuietly: async (list) => { notices.push(...list); return list; }, digestDue: vi.fn(), languageOf: vi.fn(), mailContact: vi.fn(), sendDigests: vi.fn(), unsubscribeToken: vi.fn() }));
vi.mock('./mail.utils.js', () => ({ getAppUrl: () => 'https://legmate.example', isMailConfigured: () => true }));

const { remindClubNights } = await import('./notification.jobs.js');

// a Tuesday, the club night at 19:30
const tuesday = (hours, minutes = 0) => new Date(2026, 9, 27, hours, minutes);
const DAY = '2026-10-27';

beforeEach(() => {
    clubs = [{ _id: 'club1', calendar: { nights: [{ weekday: 2, start: '19:30', end: '23:00', note: 'Back room' }], cancelled: [] } }];
    answers = [
        { club: 'club1', day: DAY, player: 'anna', answer: 'yes' },
        { club: 'club1', day: DAY, player: 'ben', answer: 'no' },
        { club: 'club1', day: DAY, player: 'guest', answer: 'yes' },
    ];
    players = [{ _id: 'anna', user: 'u-anna' }, { _id: 'ben', user: 'u-ben' }, { _id: 'guest', user: null }];
    sentKeys.clear();
    notices.length = 0;
});

describe('the reminder of a club night', () => {
    it('reaches who said they come, once, in the hours before it starts', async () => {
        await remindClubNights(tuesday(17, 0));
        expect(notices).toEqual([{ user: 'u-anna', kind: 'clubNightReminder', title: 'Club night today at 19:30', body: 'Back room', link: `/club-night/${DAY}`, club: 'club1' }]);
        await remindClubNights(tuesday(18, 0));
        expect(notices).toHaveLength(1);
    });

    it('not too early, not once it has started, not on other days', async () => {
        await remindClubNights(tuesday(15, 0));
        await remindClubNights(tuesday(19, 45));
        await remindClubNights(new Date(2026, 9, 28, 17, 0));
        expect(notices).toHaveLength(0);
    });

    it('not for a cancelled night (that is told when it is cancelled)', async () => {
        clubs[0].calendar.cancelled = [{ day: DAY, reason: 'Room taken' }];
        await remindClubNights(tuesday(17, 0));
        expect(notices).toHaveLength(0);
    });

    it('also who says they come later that afternoon', async () => {
        await remindClubNights(tuesday(17, 0));
        answers.push({ club: 'club1', day: DAY, player: 'ben2', answer: 'yes' });
        players.push({ _id: 'ben2', user: 'u-ben2' });
        await remindClubNights(tuesday(18, 0));
        expect(notices.map(notice => notice.user)).toEqual(['u-anna', 'u-ben2']);
    });
});
