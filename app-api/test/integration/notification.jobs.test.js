import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';

/**
 * The mails and reminders of the hourly jobs against a real database: what
 * was noted for the mail of the day follows the choices made since, each
 * summary and digest turns off only itself, and the club badges and goals
 * the jobs find are told, not saved quietly.
 */

// the mails sent, in memory
const mails = [];
vi.mock('../../src/utils/mail.utils.js', async (original) => ({ ...(await original()), getAppUrl: () => 'https://oche.example', isMailConfigured: () => true }));
vi.mock('../../src/utils/mail.service.js', () => ({
    sendTemplateMail: async (id, to, vars, language, options) => { mails.push({ id, to, vars, language, options }); return true; },
}));

let mongod;
let db;
let notify;
let jobs;
const DAY = 24 * 60 * 60 * 1000;
// a Monday at 08:00 (server time): the mails of the day and the week are due
const monday = new Date(2026, 10, 9, 8, 0);

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    notify = await import('../../src/utils/notify.js');
    jobs = await import('../../src/utils/notification.jobs.js');
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

beforeEach(async () => {
    mails.length = 0;
    await Promise.all(['user', 'player', 'club', 'clubTally', 'notification', 'noticeSent', 'playerContact', 'x01Training'].map(name => db[name].deleteMany({})));
});

let count = 0;
const user = (fields = {}) => {
    count += 1;
    return db.user.create({ email: `u${count}@test.local`, firstname: `User${count}`, lastname: 'Tester', passwordHash: 'x', ...fields });
};
const player = (fields = {}) => db.player.create({ nickname: `P${count += 1}`, firstname: 'Pat', lastname: 'Tester', dateOfBirth: new Date('1990-05-15'), ...fields });
// the token of a mail's one-click link
const tokenOf = (mail) => decodeURIComponent(mail.options.headers['List-Unsubscribe'].match(/token=([^>]+)>/)[1]);
const request = (to) => ({ user: to, kind: 'joinRequested', title: 'Ben asks to join Test Club', link: '/my-clubs/c1' });

describe('the mails of the day and the week', () => {
    it('leave out what was turned off after it was noted, and move what goes with the other mail now', async () => {
        const anna = await user({ notifications: { joinRequests: { inApp: true, mail: 'daily' }, badges: { inApp: true, mail: 'daily' } } });
        await notify.deliver([request(anna._id), { user: anna._id, kind: 'badgeEarned', title: 'A new badge' }]);
        expect(await db.notification.countDocuments({ user: anna._id, mail: 'daily', mailedAt: null })).toBe(2);
        // the join requests turned off on the profile, the badges moved to the weekly mail
        await db.user.updateOne({ _id: anna._id }, { notifications: { joinRequests: { inApp: true, mail: 'off' }, badges: { inApp: true, mail: 'weekly' } } });
        await notify.sendDigests(monday);
        // the weekly one is due too: the badge goes with it, the join request with none
        expect(mails.map(mail => [mail.id, mail.vars.list])).toEqual([['digest', '• A new badge']]);
        expect(await db.notification.findOne({ kind: 'joinRequested' }).lean()).toMatchObject({ mail: 'off', mailedAt: null });
        expect(await db.notification.findOne({ kind: 'badgeEarned' }).lean()).toMatchObject({ mail: 'weekly' });
    });

    it('send nothing once the topic is unsubscribed from its own mail', async () => {
        const ben = await user({ notifications: { joinRequests: { inApp: true, mail: 'daily' } } });
        await notify.deliver([request(ben._id)]);
        await notify.unsubscribe(notify.unsubscribeToken('user', ben._id, 'joinRequests'));
        expect(await notify.sendDigests(monday)).toBe(0);
        expect(mails).toEqual([]);
    });

    it('turn off with their own link only the topics that go with that mail', async () => {
        const cara = await user({ notifications: { joinRequests: { inApp: true, mail: 'daily' }, badges: { inApp: true, mail: 'weekly' } } });
        await notify.deliver([request(cara._id)]);
        await notify.sendDigests(monday);
        expect(mails).toHaveLength(1);
        expect(notify.readUnsubscribeToken(tokenOf(mails[0])).topic).toBe('digest:daily');
        await notify.unsubscribe(tokenOf(mails[0]));
        const { notifications } = await db.user.findById(cara._id).lean();
        expect(notifications.joinRequests.mail).toBe('off');
        expect(notifications.badges.mail).toBe('weekly');
        // the instant mails stay as they are
        expect(notifications.connections).toBeUndefined();
    });

    it("leave out of a player's news what their club no longer mails them", async () => {
        const club = await db.club.create({ name: 'News Club' });
        const pat = await player({ clubs: [club._id] });
        const contact = await db.playerContact.create({ player: pat._id, email: 'pat@test.local', consentAt: new Date(), topics: ['badges', 'level'] });
        await notify.deliverToContacts([{ player: pat._id, kind: 'badgeEarned', title: 'A new badge' }, { player: pat._id, kind: 'levelUp', title: 'Level 5' }]);
        await db.playerContact.updateOne({ _id: contact._id }, { topics: ['badges'] });
        await notify.sendDigests(monday);
        expect(mails.map(mail => mail.vars.details)).toEqual(['• A new badge']);
        // its link turns off the news of the day, not the weekly summary
        await db.playerContact.updateOne({ _id: contact._id }, { topics: ['badges', 'weeklySummary'] });
        await notify.unsubscribe(tokenOf(mails[0]));
        expect(await db.playerContact.findById(contact._id).lean()).toMatchObject({ topics: ['weeklySummary'], unsubscribedAt: null });
    });
});

describe('the weekly summaries', () => {
    it('count only finished trainings against the bot, and each turns off only itself', async () => {
        const dora = await user({ notifications: { weeklySummary: { mail: 'weekly' }, clubSummary: { mail: 'weekly' } } });
        const club = await db.club.create({ name: 'Summary Club', admins: [dora._id] });
        const own = await player({ user: dora._id, clubs: [club._id] });
        const recently = new Date(monday - DAY);
        await db.x01Training.collection.insertMany([
            { players: [String(own._id)], hasWinner: true, createdAt: recently, updatedAt: recently },
            { players: [String(own._id)], hasWinner: false, createdAt: recently, updatedAt: recently },
        ]);
        await db.clubTally.create({ club: club._id, sourceType: 'x01', sourceId: 'g1', at: recently, players: [String(own._id)] });
        await jobs.sendWeeklySummaries(monday);
        const weekly = mails.find(mail => mail.id === 'weeklySummary');
        const summary = mails.find(mail => mail.id === 'clubSummary');
        expect(weekly.vars.summary).toContain('Trainings: 1');
        expect(notify.readUnsubscribeToken(tokenOf(weekly)).topic).toBe('weeklySummary');
        expect(notify.readUnsubscribeToken(tokenOf(summary)).topic).toBe('clubSummary');
        await notify.unsubscribe(tokenOf(weekly));
        const { notifications } = await db.user.findById(dora._id).lean();
        expect(notifications.weeklySummary.mail).toBe('off');
        expect(notifications.clubSummary.mail).toBe('weekly');
        expect(notifications.joinRequests).toBeUndefined();
    });
});

describe('the club badges and goals found by the jobs', () => {
    // a club of ten members (a Members badge waiting) with an admin who plays, and a game this week
    const clubWithGoals = async (goals) => {
        const admin = await user();
        const club = await db.club.create({ name: `Goal Club ${count}`, admins: [admin._id], goals });
        await player({ user: admin._id, clubs: [club._id] });
        for (let index = 0; index < 9; index += 1) await player({ clubs: [club._id] });
        await db.clubTally.create({ club: club._id, sourceType: 'x01', sourceId: `g${count}`, at: new Date(monday - DAY), players: [] });
        return { admin, club };
    };
    const soon = new Date(monday.getTime() + 3 * DAY);

    it('tell the club of a badge and a goal reached, and remind only of the goal still open', async () => {
        const { admin, club } = await clubWithGoals([
            { id: 'one', metric: 'games', target: 1, from: new Date(monday - 30 * DAY), until: soon, reachedAt: null },
            { id: 'many', metric: 'games', target: 100, from: new Date(monday - 30 * DAY), until: soon, reachedAt: null },
        ]);
        await jobs.remindEndingGoals(monday);
        const told = await db.notification.find({ user: admin._id }).lean();
        expect(told.map(notice => notice.kind).sort()).toEqual(['clubBadge', 'clubGoal', 'goalEnding']);
        expect(told.find(notice => notice.kind === 'goalEnding').title).toMatch(/100 games/);
        const stored = await db.club.findById(club._id).lean();
        expect(stored.badges.map(entry => entry.badge)).toContain('clubMembers-10');
        expect(stored.goals.find(goal => goal.id === 'one').reachedAt).toBeTruthy();
    });

    it('tell the club from the weekly club summary too', async () => {
        const { admin } = await clubWithGoals([{ id: 'one', metric: 'games', target: 1, from: new Date(monday - 30 * DAY), until: null, reachedAt: null }]);
        await db.user.updateOne({ _id: admin._id }, { notifications: { clubSummary: { mail: 'weekly' } } });
        await jobs.sendWeeklySummaries(monday);
        const told = await db.notification.find({ user: admin._id }).lean();
        expect(told.map(notice => notice.kind).sort()).toEqual(['clubBadge', 'clubGoal']);
        expect(mails.find(mail => mail.id === 'clubSummary').vars.summary).toContain('Growing Club');
    });

    it('go on with the next club when one fails', async () => {
        const goal = { id: 'many', metric: 'games', target: 100, from: new Date(monday - 30 * DAY), until: soon, reachedAt: null };
        const first = await clubWithGoals([goal]);
        const second = await clubWithGoals([goal]);
        const findById = db.club.findById.bind(db.club);
        const spy = vi.spyOn(db.club, 'findById').mockImplementation((id, ...rest) => {
            if (String(id) === String(first.club._id)) throw new Error('broken club');
            return findById(id, ...rest);
        });
        try {
            await jobs.remindEndingGoals(monday);
        } finally {
            spy.mockRestore();
        }
        expect(await db.notification.countDocuments({ user: first.admin._id, kind: 'goalEnding' })).toBe(0);
        expect(await db.notification.countDocuments({ user: second.admin._id, kind: 'goalEnding' })).toBe(1);
    });
});
