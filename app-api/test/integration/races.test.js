import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';

/**
 * Games finishing at the same moment against an in-memory MongoDB: four
 * quarter-finals, the last two group matches (the bracket is filled from the
 * groups) and two league matches all save the same document at once; every
 * one of them counts.
 */

let mongod;
let db;
let tournaments;
let leagues;
let roundsOfPreset;
let club;
let players;

const at = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
// what the game says when it is won: the first player wins 3-1
const wonBy = (winner, loser) => ({ playerModels: { [winner]: { hasWonGame: true, legsWon: { game: 3 } }, [loser]: { hasWonGame: false, legsWon: { game: 1 } } } });

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    tournaments = await import('../../src/utils/tournaments.js');
    leagues = await import('../../src/utils/leagues.js');
    ({ roundsOfPreset } = await import('../../src/rules/tournaments.js'));
    club = await db.club.create({ name: 'Race Darts Club', admins: [] });
    players = [];
    for (const name of ['Ann', 'Bob', 'Cid', 'Dan', 'Eve', 'Fay', 'Gus', 'Hal']) {
        players.push(String((await db.player.create({ nickname: name, firstname: name, lastname: 'Player', clubs: [club._id], dateOfBirth: new Date('1990-05-15') }))._id));
    }
});

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

const closedTournament = async (format) => {
    const rounds = roundsOfPreset('clubNight', 8).map((round, index) => ({ ...round, date: at(2 + index) }));
    return db.tournament.create({
        club: club._id, name: `Race ${format}`, status: 'closed', format, maxPlayers: 8, closesAt: at(1),
        rounds: format === 'groups' ? [{ size: 0, date: at(1.5), rules: rounds[0].rules }, ...rounds] : rounds,
        entries: players.map(player => ({ player, club: club._id, status: 'in' })),
    });
};

// starts each match (the tournament read again for each), then lets all their games end at once
const playAtOnce = async (tournamentId, matchIds) => {
    const games = [];
    for (const matchId of matchIds) games.push(await tournaments.startMatch(await db.tournament.findById(tournamentId), matchId));
    const stored = await db.tournament.findById(tournamentId);
    await Promise.all(games.map(game => {
        const [a, b] = stored.matches.find(match => match.id === game.tournament.match).players;
        return tournaments.tournamentGameFinished(game, wonBy(a, b));
    }));
    return db.tournament.findById(tournamentId).lean();
};

describe('games finishing at the same moment', () => {
    it('counts all four quarter-finals and moves every winner on', async () => {
        const created = await closedTournament('knockout');
        await tournaments.holdDraw(created, { seeding: 'random' });
        const quarters = created.matches.filter(match => match.size === 8).map(match => match.id);
        expect(quarters).toHaveLength(4);
        const after = await playAtOnce(created._id, quarters);
        expect(after.matches.filter(match => match.size === 8).map(match => match.status)).toEqual(['done', 'done', 'done', 'done']);
        expect(after.matches.filter(match => match.size === 4).every(match => match.status === 'ready' && match.players.every(Boolean))).toBe(true);
    });

    it('fills the bracket when the last two group matches end together', async () => {
        const created = await closedTournament('groups');
        await tournaments.holdDraw(created, { seeding: 'random', groupSize: 4, advance: 2 });
        const groupMatches = created.matches.filter(match => match.group != null);
        // every group match but the last of each group decided by the admin
        const last = [0, 1].map(group => groupMatches.filter(match => match.group === group).at(-1).id);
        for (const match of groupMatches.filter(entry => !last.includes(entry.id))) {
            await tournaments.setResult(await db.tournament.findById(created._id), match.id, String(match.players[0]));
        }
        const after = await playAtOnce(created._id, last);
        expect(after.matches.filter(match => match.group != null).every(match => ['done', 'walkover'].includes(match.status))).toBe(true);
        expect(after.draw.knockoutAt).toBeTruthy();
        expect(after.matches.filter(match => match.size === 4).every(match => match.status === 'ready' && match.players.every(Boolean))).toBe(true);
    });

    it('counts two league matches of a matchday', async () => {
        const league = await db.league.create({
            club: club._id, name: 'Race League', status: 'draft', players: players.slice(0, 4), meetings: 1, everyDays: 7,
            firstDay: at(1), rules: roundsOfPreset('clubNight', 8)[0].rules,
        });
        await leagues.startLeague(league);
        const firstDay = league.matches.filter(match => match.day === 1).map(match => match.id);
        expect(firstDay).toHaveLength(2);
        const games = [];
        for (const matchId of firstDay) games.push(await leagues.startMatch(await db.league.findById(league._id), matchId));
        await Promise.all(games.map(game => {
            const [a, b] = league.matches.find(match => match.id === game.league.match).players;
            return leagues.leagueGameFinished(game, wonBy(a, b));
        }));
        const after = await db.league.findById(league._id).lean();
        expect(after.matches.filter(match => match.day === 1).map(match => match.status)).toEqual(['done', 'done']);
    });
});
