import { shirtOf } from '../../../app-api/src/utils/shirts.js';
// tournaments for the mock API, with the real bracket rules
import { MIN_PLAYERS, advance, bracketMatches, drawBracket, drawGroups, groupMatches, groupsDone, isDecided, knockoutDraw, knockoutOfGroups, retract, roundsOfPreset } from '../../src/rules/tournaments.js';

const DAY = 864e5;
const at = (days, hour = 19, minute = 30) => { const d = new Date(Date.now() + days * DAY); d.setHours(hour, minute, 0, 0); return d; };
let tournaments = [];
let next = 1;

const viewOf = (tr, players, me) => ({
    ...tr,
    players: Object.fromEntries(players.map(p => [p.id, { id: p.id, nickname: p.nickname, firstname: p.firstname, lastname: p.lastname, shirt: shirtOf(p) }])),
    counts: { in: tr.entries.filter(e => e.status === 'in').length, out: tr.entries.filter(e => e.status === 'out').length, invited: tr.entries.filter(e => e.status === 'invited').length },
    me: tr.entries.find(e => e.player === me) ?? null,
    myPlayer: me,
});

export const seedTournaments = (players, scenario) => {
    tournaments = [];
    const ids = players.map(p => p.id);
    const base = (fields) => ({ id: `t${next++}`, club: 'c1', description: '', format: 'knockout', preset: 'clubClassic', maxPlayers: 8, closesAt: at(3, 20, 0), rounds: roundsOfPreset('clubClassic', 8).map((r, i) => ({ ...r, date: at(10 + i * 7) })), entries: ids.map(p => ({ player: p, status: 'invited' })), matches: [], draw: {}, winner: null, ...fields });
    // groups first: the registration closed with everyone in, ready for the draw
    if (scenario === 'groups') {
        const rounds = [{ size: 0, date: at(5), rules: roundsOfPreset('clubNight', 8)[0].rules }, ...roundsOfPreset('clubNight', 8).map((r, i) => ({ ...r, date: at(12 + i * 7) }))];
        const t = base({ name: 'Group Cup', status: 'closed', format: 'groups', preset: 'clubNight', closesAt: at(-1), rounds });
        t.entries = ids.map(p => ({ player: p, status: 'in' }));
        tournaments.push(t);
    }
    if (scenario === 'registration' || scenario === 'all') {
        const t = base({ name: 'Autumn Cup', status: 'registration', description: 'In the back room of the Red Lion. The winner gets the golden dart.' });
        t.entries = t.entries.map((e, i) => ({ ...e, status: i === 0 ? 'invited' : i < 4 ? 'in' : i === 4 ? 'out' : 'invited' }));
        tournaments.push(t);
    }
    if (scenario === 'running' || scenario === 'all') {
        const t = base({ name: 'Summer Masters', status: 'running', closesAt: at(-10), rounds: roundsOfPreset('clubClassic', 8).map((r, i) => ({ ...r, date: at(-3 + i * 7), skipped: false })) });
        t.entries = ids.map(p => ({ player: p, status: 'in', seed: null }));
        const draw = drawBracket(ids, { seeding: 'seeded', random: () => 0.3 });
        t.matches = bracketMatches(draw);
        t.draw = { at: at(-4), seeding: 'seeded', size: draw.size };
        t.entries = t.entries.map(e => ({ ...e, seed: [ids[0], ids[1]].includes(e.player) ? ids.indexOf(e.player) + 1 : null }));
        const byId = new Map(t.matches.map(m => [m.id, m]));
        const firstRound = t.matches.filter(m => m.size === 8 && m.status === 'ready');
        firstRound.slice(0, 1).forEach(m => { m.status = 'done'; m.winner = m.players[0]; m.score = { legs: [3, 1] }; m.game = 'x1'; advance(byId, m); });
        if (firstRound[1]) { firstRound[1].status = 'running'; firstRound[1].game = 'x2'; }
        tournaments.push(t);
    }
    // for the start page: sixteen players, the first round played, the quarter-finals going on
    if (scenario === 'showcase') {
        const t = base({ name: 'Autumn Masters', status: 'running', maxPlayers: 16, closesAt: at(-12), rounds: roundsOfPreset('clubClassic', 16).map((r, i) => ({ ...r, date: at(-7 + i * 7), skipped: false })) });
        t.entries = ids.map(p => ({ player: p, status: 'in', seed: null }));
        const draw = drawBracket(ids, { seeding: 'seeded', random: () => 0.42 });
        t.matches = bracketMatches(draw);
        t.draw = { at: at(-8), seeding: 'seeded', size: draw.size };
        t.entries = t.entries.map(e => ({ ...e, seed: ids.indexOf(e.player) < 4 ? ids.indexOf(e.player) + 1 : null }));
        const byId = new Map(t.matches.map(m => [m.id, m]));
        const scores = [[4, 1], [4, 3], [4, 2], [4, 0], [3, 4], [4, 2], [2, 4], [4, 3]];
        t.matches.filter(m => m.size === 16 && m.status === 'ready').forEach((m, i) => {
            const [a, b2] = scores[i % scores.length];
            m.status = 'done'; m.winner = a > b2 ? m.players[0] : m.players[1]; m.score = { legs: [a, b2] }; m.game = `x${i}`; advance(byId, m);
        });
        const quarter = t.matches.filter(m => m.size === 8 && m.status === 'ready');
        quarter.slice(0, 2).forEach((m, i) => { m.status = 'done'; m.winner = m.players[i]; m.score = { legs: i ? [3, 5] : [5, 2] }; m.game = `q${i}`; advance(byId, m); });
        if (quarter[2]) { quarter[2].status = 'running'; quarter[2].game = 'q2'; }
        tournaments.push(t);
    }
    if (scenario === 'finished') {
        const t = base({ name: 'Spring Cup', status: 'finished', closesAt: at(-30), rounds: roundsOfPreset('clubNight', 8).map((r, i) => ({ ...r, date: at(-20 + i * 7), skipped: r.size > 8 })) });
        t.entries = ids.map(p => ({ player: p, status: 'in' }));
        const draw = drawBracket(ids, { random: () => 0.6 });
        t.matches = bracketMatches(draw);
        t.draw = { size: draw.size, seeding: 'seeded' };
        const byId = new Map(t.matches.map(m => [m.id, m]));
        for (const size of [8, 4, 2]) for (const m of t.matches.filter(x => x.size === size && x.status === 'ready')) { m.status = 'done'; m.winner = m.players[1]; m.score = { legs: [1, size === 2 ? 4 : 3] }; advance(byId, m); }
        t.winner = t.matches.find(m => m.size === 2).winner;
        t.finishedAt = at(-1);
        tournaments.push(t);
    }
};

export const tournamentMock = (req, res, path, json, send, { players, me, isAdmin, url }) => {
    if (!path.startsWith('/api/tournament')) return false;
    const view = (t, status = 200) => send(res, status, viewOf(t, players, me));
    if (path === '/api/tournament-reply') {
        const t = tournaments[0];
        if (!t) return send(res, 404, { message: 'This link is not valid (any more).' });
        const entry = t.entries.find(e => e.player === 'p6');
        if (req.method === 'POST') { entry.status = json.answer; }
        return send(res, 200, { tournament: { id: t.id, name: t.name, status: t.status, closesAt: t.closesAt, maxPlayers: t.maxPlayers, entered: t.entries.filter(e => e.status === 'in').length }, club: 'Test Club', nickname: 'Fiona', answer: entry.status, open: t.status === 'registration' });
    }
    if (path === '/api/tournaments' && req.method === 'GET') {
        const list = url.searchParams.get('active') ? tournaments.filter(t => ['registration', 'closed', 'drawn', 'running', 'finished'].includes(t.status)) : tournaments;
        return send(res, 200, { min: MIN_PLAYERS, eligible: players.length, canCreate: isAdmin && players.length >= MIN_PLAYERS, tournaments: list.map(t => viewOf(t, players, me)) });
    }
    if (path === '/api/tournaments' && req.method === 'POST') {
        const t = { id: `t${next++}`, club: 'c1', format: 'knockout', entries: [], matches: [], draw: {}, winner: null, ...json, status: json.open ? 'registration' : 'draft' };
        if (json.open) t.entries = players.map(p => ({ player: p.id, status: 'invited' }));
        tournaments.unshift(t);
        return view(t, 201);
    }
    const m = path.match(/^\/api\/tournaments\/(t\d+)(\/.*)?$/);
    const t = m && tournaments.find(x => x.id === m[1]);
    if (!t) return send(res, 404, { message: 'There is no such tournament.' });
    const rest = m[2] ?? '';
    const byId = new Map(t.matches.map(x => [x.id, x]));
    if (!rest && req.method === 'GET') return view(t);
    if (!rest && req.method === 'PUT') { Object.assign(t, json); return view(t); }
    if (!rest && req.method === 'DELETE') { tournaments = tournaments.filter(x => x !== t); return send(res, 200, {}); }
    if (rest === '/open') { t.status = 'registration'; t.entries = players.map(p => ({ player: p.id, status: 'invited' })); return view(t); }
    if (rest === '/close') { t.status = 'closed'; return view(t); }
    if (rest === '/reopen') { t.status = 'registration'; t.closesAt = json.closesAt; return view(t); }
    if (rest === '/cancel') { t.status = 'cancelled'; return view(t); }
    if (rest === '/entry') { const e = t.entries.find(x => x.player === me); e.status = json.status; return view(t); }
    const entry = rest.match(/^\/entries\/(\w+)$/);
    if (entry) { let e = t.entries.find(x => x.player === entry[1]); if (!e) { e = { player: entry[1], status: 'invited' }; t.entries.push(e); } e.status = json.status; e.byAdmin = true; return view(t); }
    if (rest === '/draw') {
        const ids = t.entries.filter(e => e.status === 'in').map(e => e.player);
        if (ids.length < MIN_PLAYERS) return send(res, 409, { message: `A tournament needs at least ${MIN_PLAYERS} players.` });
        if (t.format === 'groups') {
            const size = json.groupSize ?? 4;
            const goOn = json.advance ?? 2;
            const groups = drawGroups(ids, { size, seeding: json.seeding });
            const knockout = knockoutOfGroups(ids.length, size, goOn);
            t.matches = [...groupMatches(groups), ...bracketMatches({ size: knockout.size, slots: Array(knockout.size).fill(null) })];
            t.draw = { at: new Date(), seeding: json.seeding, size: knockout.size, groups, groupSize: size, advance: goOn, knockoutAt: null };
            t.rounds = t.rounds.map(r => ({ ...r, skipped: r.size !== 0 && r.size > knockout.size }));
            t.status = 'drawn';
            return view(t);
        }
        const draw = drawBracket(ids, { seeding: json.seeding });
        t.matches = bracketMatches(draw);
        t.draw = { at: new Date(), seeding: json.seeding, size: draw.size };
        t.rounds = t.rounds.map(r => ({ ...r, skipped: r.size > draw.size }));
        t.status = 'drawn';
        return view(t);
    }
    const start = rest.match(/^\/matches\/([\w-]+)\/start$/);
    if (start) { const x = byId.get(start[1]); x.status = 'running'; x.game = 'x9'; t.status = 'running'; return send(res, 201, { game: 'x9' }); }
    const result = rest.match(/^\/matches\/([\w-]+)\/result$/);
    if (result) {
        const x = byId.get(result[1]);
        // a match of a group: counted in its table; the last one fills the bracket
        if (x.group != null) {
            if (t.draw.knockoutAt) return send(res, 409, { message: 'The knockout stage is drawn from the groups: this result stays.' });
            Object.assign(x, { status: 'walkover', winner: json.winner, score: null });
            t.status = 'running';
            if (groupsDone(t.matches)) {
                const draw = knockoutDraw(t.draw.groups, t.matches, t.draw.advance);
                t.matches = [...t.matches.filter(m => m.group != null), ...bracketMatches(draw)];
                t.draw.knockoutAt = new Date();
            }
            return view(t);
        }
        if (isDecided(x) && !retract(byId, x)) return send(res, 409, { message: 'The next match has started: this result stays.' });
        x.status = 'walkover'; x.winner = json.winner; x.score = null;
        if (!advance(byId, x)) { t.status = 'finished'; t.winner = json.winner; t.finishedAt = new Date(); }
        return view(t);
    }
    return send(res, 404, { message: 'unhandled tournament mock' });
};
