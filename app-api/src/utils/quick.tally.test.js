import { describe, expect, it, vi, beforeEach } from 'vitest';

// the quick games and the settings, in memory
let games = [];
let setting = null;
let evenings = [];
const lean = (value) => ({ lean: async () => value });
const matches = (game, query) => Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && '$ne' in value) return game[key] !== value.$ne;
    return String(game[key]) === String(value);
});
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        quickGame: {
            countDocuments: async (query) => games.filter(game => matches(game, query)).length,
            distinct: async (field, query) => [...new Set(games.filter(game => matches(game, query)).map(game => game[field]))],
            findOne: () => ({ sort: () => lean([...games].sort((a, b) => a.createdAt - b.createdAt)[0] ?? null) }),
            updateMany: async (query, update) => { games.filter(game => matches(game, query)).forEach(game => Object.assign(game, update.$set)); },
            updateOne: async (query, update) => {
                const game = games.find(entry => matches(entry, query));
                if (game) Object.assign(game, update.$set);
                return { modifiedCount: game ? 1 : 0 };
            },
        },
        quickEvening: {
            updateMany: async (query, update) => { evenings.filter(evening => query._id.$in.includes(evening._id)).forEach(evening => Object.assign(evening, update.$set)); },
            updateOne: async (query, update) => {
                const evening = evenings.find(entry => entry._id === query._id && entry.counted !== true);
                if (evening) Object.assign(evening, update.$set);
                return { modifiedCount: evening ? 1 : 0 };
            },
        },
        setting: {
            findOne: () => lean(setting),
            updateOne: async (query, update) => {
                if (update.$setOnInsert) { setting ??= { key: query.key, value: structuredClone(update.$setOnInsert.value) }; return; }
                for (const [path, by] of Object.entries(update.$inc)) {
                    const field = path.split('.')[1];
                    setting.value[field] += by;
                }
            },
        },
    },
}));

const { countEvening, countQuickGame, quickTally } = await import('./quick.tally.js');

beforeEach(() => {
    setting = null;
    evenings = [{ _id: 'e1' }, { _id: 'e2' }, { _id: 'e3' }];
    games = [
        { _id: 'g1', hasWinner: true, evening: null, createdAt: new Date('2026-10-01') },
        { _id: 'g2', hasWinner: true, evening: 'e1', createdAt: new Date('2026-10-05') },
        { _id: 'g3', hasWinner: false, evening: 'e1', createdAt: new Date('2026-10-06') },
    ];
});

describe('the all-time tally of quick games and darts evenings', () => {
    it('starts from what is kept, since the oldest game', async () => {
        expect(await quickTally()).toEqual({ quickGames: 2, eveningGames: 1, evenings: 1, since: new Date('2026-10-01') });
    });

    it('counts a finished game once, even after an undo and a second finish', async () => {
        await quickTally();
        const game = { _id: 'g4', hasWinner: true, evening: null, createdAt: new Date() };
        games.push(game);
        await countQuickGame({ ...game });
        await countQuickGame({ ...game, counted: false });
        expect((await quickTally()).quickGames).toBe(3);
    });

    it('counts a darts evening once when it ends, only with a finished game', async () => {
        await quickTally();
        // e1 had a finished game when counting began: counted then
        expect(evenings[0].counted).toBe(true);
        await countEvening({ ...evenings[0] });
        games.push({ _id: 'g5', hasWinner: true, evening: 'e2', createdAt: new Date() });
        await countEvening({ _id: 'e2' });
        await countEvening({ _id: 'e2' });
        // e3 ended without a finished game
        await countEvening({ _id: 'e3' });
        expect(await quickTally()).toMatchObject({ evenings: 2 });
    });

    it('leaves games not finished out', async () => {
        await quickTally();
        await countQuickGame({ _id: 'g3', hasWinner: false, evening: 'e1' });
        expect((await quickTally()).quickGames).toBe(2);
    });
});
