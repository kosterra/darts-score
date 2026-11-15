import { describe, expect, it, vi, beforeEach } from 'vitest';

// the games of a club by type, its members and the games created, in memory
let games = {};
let trainings = {};
let members = [];
const created = [];
const model = (type) => ({
    find: (query) => ({
        lean: async () => (games[type] ?? []).filter(game => game.players.includes(query.players) && game.hasWinner && !game.tournament && new Date(game.updatedAt) >= query.updatedAt.$gte),
    }),
    create: async (doc) => { const game = { ...doc, _id: `new-${type}` }; created.push({ type, game }); return game; },
});
// the trainings of a player: rulesTraining and atc, by 'player.id' and createdAt
const trainingModel = (type) => ({
    find: (query) => ({
        lean: async () => (trainings[type] ?? []).filter(entry => entry.player.id === query['player.id'] && new Date(entry.createdAt) >= query.createdAt.$gte),
    }),
});
vi.mock('../models/db.model.js', () => ({
    default: {
        x01: model('x01'), cricket: model('cricket'), elimination: model('elimination'), clock: model('clock'), rulesGame: model('rules'),
        rulesTraining: trainingModel('rules'), atc: trainingModel('atc'),
        player: { find: () => ({ lean: async () => members.map(id => ({ _id: id })) }) },
    },
}));

const { favouritesOf, startFavourite } = await import('./favourites.js');

const now = new Date(2026, 9, 24, 20, 0);
const daysAgo = (days) => new Date(now - days * 24 * 60 * 60 * 1000);
const x01 = (players, days, settings = {}) => ({
    players, hasWinner: true, updatedAt: daysAgo(days),
    startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3, legStarter: 'rotate', roundLimit: 0, bull: 'split',
    ...settings,
});

beforeEach(() => { games = {}; trainings = {}; members = ['me', 'anna', 'ben', 'cleo']; created.length = 0; });

describe('the favourites of a player', () => {
    it('are the games played most lately with the same settings and opponents, the most played first', async () => {
        games.x01 = [
            x01(['me', 'anna'], 1), x01(['anna', 'me'], 3), x01(['me', 'anna'], 5),
            x01(['me', 'anna'], 2, { numberOfLegs: 5 }),
            x01(['me', 'ben'], 4), x01(['ben', 'me'], 6),
            x01(['me', 'cleo'], 200), x01(['me', 'cleo'], 201), x01(['me', 'cleo'], 202), x01(['me', 'cleo'], 203),
        ];
        games.cricket = [{ players: ['me', 'ben'], hasWinner: true, updatedAt: daysAgo(1), variant: 'Standard', roundLimit: 0 }];
        const list = await favouritesOf('club', 'me', now);
        expect(list.map(entry => [entry.type, entry.opponents.join(), entry.count])).toEqual([['x01', 'anna', 3], ['x01', 'ben', 2], ['cricket', 'ben', 1], ['x01', 'anna', 1]]);
        expect(list[0].settings).toMatchObject({ startingScore: 501, numberOfLegs: 3 });
        // the players in the order of the last game
        expect(list[0].players).toEqual(['me', 'anna']);
    });

    it('leave out tournament matches, handicaps, games alone and opponents who left the club', async () => {
        games.x01 = [
            { ...x01(['me', 'anna'], 1), tournament: { id: 't' } },
            x01(['me', 'anna'], 1, { handicap: { me: { startingScore: 301 } } }),
            x01(['me'], 1),
            x01(['me', 'ben'], 1),
        ];
        members = ['me', 'anna'];
        expect(await favouritesOf('club', 'me', now)).toEqual([]);
    });

    it('start again with the same settings, the one who threw first last time now last', async () => {
        games.x01 = [x01(['me', 'anna'], 1)];
        const [favourite] = await favouritesOf('club', 'me', now);
        const started = await startFavourite({ _id: 'club', gameRules: undefined }, 'me', favourite.id);
        expect(started).toEqual({ type: 'x01', kind: null, id: 'new-x01', path: '/x01/new-x01' });
        expect(created[0].game).toMatchObject({ club: 'club', friendly: false, players: ['anna', 'me'], currentPlayerTurn: 'anna', startingScore: 501, numberOfLegs: 3, visits: [] });
        await expect(startFavourite({ _id: 'club' }, 'me', 'nothere123')).rejects.toMatchObject({ status: 404 });
    });
});

const training = (kind, days, settings = {}, player = 'me') => ({ kind, settings, player: { id: player }, createdAt: daysAgo(days) });
const atc = (days, mode = 'All', scoring = 'Time') => ({ mode, scoring, player: { id: 'me' }, createdAt: daysAgo(days) });

describe('the favourite trainings', () => {
    it('are the trainings trained most lately with the same settings, the options alone counting', async () => {
        trainings.rules = [
            training('bobs27', 1), training('bobs27', 2), training('bobs27', 3),
            // what the training prepared from the options does not split them
            training('checkout121', 1, { attempts: 20, targets: [121, 122] }), training('checkout121', 4, { attempts: 20, targets: [130] }),
            training('checkout121', 2, { attempts: 10 }),
            training('bobs27', 200), training('bulls', 1, {}, 'anna'),
        ];
        trainings.atc = [atc(1), atc(5, 'Doubles'), atc(6, 'Doubles', 'Darts')];
        const list = await favouritesOf('club', 'me', now);
        expect(list.map(entry => [entry.type, entry.kind, entry.count])).toEqual([['training', 'bobs27', 3], ['training', 'checkout121', 2], ['training', 'atc', 1], ['training', 'checkout121', 1]]);
        expect(list[1].settings).toEqual({ attempts: 20 });
        expect(list[1].lastAt).toEqual(daysAgo(1));
        expect(list[0]).toMatchObject({ players: ['me'], opponents: [] });
    });

    it('share the dashboard with the games: two of each, the other filling up when one has fewer', async () => {
        games.x01 = [x01(['me', 'anna'], 1), x01(['me', 'ben'], 1), x01(['me', 'cleo'], 1)];
        trainings.rules = [training('bobs27', 1), training('bulls', 1), training('catch40', 1)];
        expect((await favouritesOf('club', 'me', now)).map(entry => entry.type)).toEqual(['x01', 'x01', 'training', 'training']);
        trainings.rules = [training('bobs27', 1)];
        expect((await favouritesOf('club', 'me', now)).map(entry => entry.type)).toEqual(['x01', 'x01', 'x01', 'training']);
        games.x01 = [];
        trainings.rules = [training('bobs27', 1), training('bulls', 1), training('catch40', 1)];
        expect((await favouritesOf('club', 'me', now)).map(entry => entry.kind)).toEqual(['bobs27', 'bulls', 'catch40']);
    });

    it('are not started on the server', async () => {
        trainings.rules = [training('bobs27', 1)];
        const [favourite] = await favouritesOf('club', 'me', now);
        await expect(startFavourite({ _id: 'club' }, 'me', favourite.id)).rejects.toMatchObject({ status: 404 });
    });
});
