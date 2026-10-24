import { describe, it, expect, vi, beforeEach } from 'vitest';

// what the deletion does to the database, noted instead of done
const calls = [];
let clubs = [];
let globalAdmins = 1;
const note = (collection, op) => (...args) => { calls.push({ collection, op, args }); return Promise.resolve({}); };
const collection = (name) => ({ updateMany: note(name, 'updateMany'), updateOne: note(name, 'updateOne'), deleteMany: note(name, 'deleteMany'), deleteOne: note(name, 'deleteOne') });
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('./player.images.js', () => ({ removeProfileImageIfUnused: vi.fn(async () => {}) }));
vi.mock('../models/db.model.js', () => ({
    default: {
        player: { ...collection('player'), find: async () => [{ _id: 'p1', nickname: 'Sammy', firstname: 'Sam', lastname: 'Muster', profileImg: 'sam.jpg', clubs: ['c1'], formerClubs: ['c0'] }] },
        club: { ...collection('club'), find: (query) => ({ lean: async () => clubs.filter(club => !query.admins || club.admins.includes(String(query.admins))) }) },
        user: { ...collection('user'), countDocuments: async () => globalAdmins },
        atc: collection('atc'), rulesTraining: collection('rulesTraining'), deletionRequest: collection('deletionRequest'),
        playerContact: collection('playerContact'), playerClaim: collection('playerClaim'), notification: collection('notification'), session: collection('session'),
        joinRequest: collection('joinRequest'), integrityReview: collection('integrityReview'), alert: collection('alert'),
    },
}));

const { deleteAccount, deletionBlock, anonymousNickname } = await import('./account.deletion.js');

const user = { _id: 'u1', firstname: 'Sam', lastname: 'Muster', role: 'user' };
const of = (name, op) => calls.filter(call => call.collection === name && call.op === op);

beforeEach(() => {
    calls.length = 0;
    clubs = [{ _id: 'c1', name: 'Red Lion', admins: ['u1', 'u2'] }];
    globalAdmins = 1;
});

describe('deleting an account', () => {
    it('gives the players an anonymous nickname, without name, picture, date of birth or country', async () => {
        const [nickname] = await deleteAccount(user);
        expect(nickname).toMatch(/^Anon [0-9A-F]{4}$/);
        const [{ args: [filter, { $set }] }] = of('player', 'updateOne');
        expect(filter).toEqual({ _id: 'p1' });
        expect($set).toMatchObject({ nickname, firstname: 'Anon', profileImg: '', dateOfBirth: null, country: '', user: null, guest: true, publicProfile: false });
        expect($set.anonymizedAt).toBeInstanceOf(Date);
    });

    it('replaces the copies of the names and deletes the account', async () => {
        const [nickname] = await deleteAccount(user);
        expect(of('atc', 'updateMany')[0].args).toEqual([{ 'player.id': 'p1' }, { $set: { 'player.nickname': nickname } }]);
        expect(of('rulesTraining', 'updateMany')[0].args[1]).toEqual({ $set: { 'player.nickname': nickname } });
        expect(of('user', 'deleteOne')[0].args[0]).toEqual({ _id: 'u1' });
        expect(of('notification', 'deleteMany')[0].args[0]).toEqual({ user: 'u1' });
        expect(of('club', 'updateMany')).toContainEqual(expect.objectContaining({ args: [{ admins: 'u1' }, { $pull: { admins: 'u1', adminSince: { user: 'u1' } } }] }));
        expect(of('alert', 'updateMany')[0].args).toEqual([{ user: 'u1' }, { $set: { userEmail: '' } }]);
    });

    it('replaces the names in notifications only in the clubs of the player', async () => {
        await deleteAccount(user);
        const replacements = of('notification', 'updateMany').filter(call => Array.isArray(call.args[1]));
        expect(replacements.length).toBeGreaterThanOrEqual(2);
        for (const { args: [filter] } of replacements) expect(filter.club.$in).toEqual(expect.arrayContaining(['c1']));
    });
});

describe('when it is refused', () => {
    it('for the only admin of a club', async () => {
        clubs = [{ _id: 'c1', name: 'Red Lion', admins: ['u1'] }];
        expect(await deletionBlock(user)).toMatchObject({ clubs: ['Red Lion'] });
    });

    it('for the only global admin', async () => {
        expect(await deletionBlock({ ...user, role: 'globalAdmin' })).toMatchObject({ message: expect.stringContaining('only global admin') });
        globalAdmins = 2;
        expect(await deletionBlock({ ...user, role: 'globalAdmin' })).toBeNull();
    });

    it('not for an admin among others', async () => {
        expect(await deletionBlock(user)).toBeNull();
    });
});

describe('the anonymous nickname', () => {
    it('is short and differs from one to the next', () => {
        const names = new Set(Array.from({ length: 30 }, anonymousNickname));
        expect(names.size).toBeGreaterThan(25);
    });
});
