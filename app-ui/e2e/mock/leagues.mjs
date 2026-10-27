import { shirtOf } from '../../../app-api/src/utils/shirts.js';
// leagues for the mock API, with the real league rules and the API's match pattern
import { LEAGUE_MATCH_ID, leagueMatches, leagueTable, matchdayCount, matchdayDates, seasonOver } from '../../src/rules/leagues.js';

const DAY = 864e5;
const at = (days, hour = 19, minute = 30) => { const d = new Date(Date.now() + days * DAY); d.setHours(hour, minute, 0, 0); return d; };
const RULES = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 5 };
let leagues = [];
let next = 1;

const viewOf = (league, players, me) => ({
    ...league,
    names: Object.fromEntries(players.map(p => [p.id, { id: p.id, nickname: p.nickname, firstname: p.firstname, lastname: p.lastname, shirt: shirtOf(p) }])),
    myPlayer: me,
});

const start = (league) => {
    league.matches = leagueMatches(league.players, league.meetings);
    const days = matchdayCount(league.players.length, league.meetings);
    league.matchdays = matchdayDates(league.firstDay, league.everyDays, days).map((date, index) => ({ day: index + 1, date }));
    league.status = 'running';
    league.startedAt = new Date();
};

const finishIfOver = (league) => {
    if (!seasonOver(league.matches)) return;
    league.status = 'finished';
    league.finishedAt = new Date();
    league.winner = leagueTable(league.players, league.matches)[0].player;
};

export const seedLeagues = (players, scenario) => {
    leagues = [];
    const ids = players.map(p => p.id);
    // a season of five running: the first matchday played, the second open
    if (scenario === 'running') {
        const league = { id: `l${next++}`, club: 'c1', name: 'Winter League', description: 'Tuesdays in the back room.', players: ids.slice(0, 5), meetings: 1, everyDays: 7, firstDay: at(-5), rules: RULES, matches: [], matchdays: [], winner: null };
        start(league);
        league.matches.filter(m => m.day === 1).forEach((m, i) => Object.assign(m, { status: 'done', winner: m.players[i % 2], score: { legs: i % 2 ? [1, 3] : [3, 2] }, game: `x${i}` }));
        leagues.push(league);
    }
};

export const leagueMock = (req, res, path, json, send, { players, me }) => {
    if (!path.startsWith('/api/leagues')) return false;
    const view = (league, status = 200) => send(res, status, viewOf(league, players, me));
    if (path === '/api/leagues' && req.method === 'GET') return send(res, 200, { leagues: leagues.map(l => viewOf(l, players, me)) });
    if (path === '/api/leagues' && req.method === 'POST') {
        const league = { id: `l${next++}`, club: 'c1', status: 'draft', matches: [], matchdays: [], winner: null, ...json, firstDay: new Date(json.firstDay) };
        delete league.start;
        if (json.start) start(league);
        leagues.unshift(league);
        return view(league, 201);
    }
    const m = path.match(/^\/api\/leagues\/(l\d+)(\/.*)?$/);
    const league = m && leagues.find(x => x.id === m[1]);
    if (!league) return send(res, 404, { message: 'There is no such league.' });
    const rest = m[2] ?? '';
    if (!rest && req.method === 'GET') return view(league);
    if (!rest && req.method === 'PUT') { Object.assign(league, json); return view(league); }
    if (!rest && req.method === 'DELETE') { leagues = leagues.filter(x => x !== league); return send(res, 200, {}); }
    if (rest === '/start') { start(league); return view(league); }
    if (rest === '/cancel') { league.status = 'cancelled'; return view(league); }
    const day = rest.match(/^\/matchdays\/(\d+)\/date$/);
    if (day) { league.matchdays.find(d => d.day === Number(day[1])).date = new Date(json.date); return view(league); }
    const action = rest.match(/^\/matches\/([^/]+)\/(start|result|date)$/);
    if (action) {
        if (!LEAGUE_MATCH_ID.test(action[1])) return send(res, 422, { message: 'Invalid match.' });
        const match = league.matches.find(x => x.id === action[1]);
        if (action[2] === 'start') { match.status = 'running'; match.game = 'x9'; return send(res, 201, { game: 'x9' }); }
        if (action[2] === 'date') { match.date = json.date ? new Date(json.date) : null; return view(league); }
        Object.assign(match, { status: 'walkover', winner: json.winner, score: null, game: null });
        finishIfOver(league);
        return view(league);
    }
    return send(res, 404, { message: 'unhandled league mock' });
};
