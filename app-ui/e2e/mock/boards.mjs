// boards for the mock API, with the real rules of the boards: club nights played on boards (kept in memory),
// the user's own boards, the big screen of the boards and the club's number of boards
import { boardsView, fill, hold, moveTo, nightItems, setBoards, topUp } from '../../src/rules/boards.js';
import { allTournaments, finishOnBoard, tournamentBoardView } from './tournaments.mjs';

const NIGHT_SETUP = { kind: 'x01', startingScore: 501, legOutMode: 'Double Out', numberOfLegs: 3, variant: 'Standard', targetScore: 301, gameOutMode: 'Double Out' };
const expiresAt = () => new Date(Date.now() + 12 * 3600e3).toISOString();
let nights = new Map();
let entrySeq = 0;
let clubBoards = 0;

// for GET /api/calendar
export const mockClubBoards = () => clubBoards;

// a night's entries changed by the rules: { key, board?, held? }; a board given calls it
const applyNight = (night, changes) => {
    for (const change of changes) {
        const entry = night.entries.find(item => item.id === change.key);
        if (!entry) continue;
        if ('board' in change) {
            entry.board = change.board;
            if (['queued', 'called'].includes(entry.status)) entry.status = change.board ? 'called' : 'queued';
            if (change.board && !entry.calledAt) entry.calledAt = new Date().toISOString();
        }
        if ('held' in change) entry.held = change.held;
    }
};
// as the API: as many pairings waiting as boards, the free boards called, then the queue topped up again
const refill = (night) => {
    const top = () => topUp(night).forEach(players => night.entries.push({ id: `be${++entrySeq}`, players, status: 'queued', board: null, held: false, game: null, winner: null, readyAt: new Date().toISOString(), calledAt: null, doneAt: null }));
    top();
    applyNight(night, fill(night.boards, nightItems(night)));
    top();
};

const newNight = (day, players, count) => ({ id: `bn-${day}`, day, boards: { count, out: [] }, setup: { ...NIGHT_SETUP }, players, entries: [] });

const nightView = (night, players, me, isAdmin) => ({
    ...night,
    players: night.players.map(id => players.find(p => p.id === id)).filter(Boolean).map(p => ({ id: p.id, nickname: p.nickname, firstname: p.firstname, lastname: p.lastname, profileImg: p.profileImg ?? '' })),
    boardView: boardsView(night.boards, nightItems(night)),
    myPlayer: me,
    canRun: isAdmin,
});

/**
 * POST /__test/boards: { scenario: 'night', day, players? } a club night on two boards, the user called to board 1 and a
 * game live on board 2; { finish: key } the game of a match or pairing on a board is won; { reset: true } nothing on boards.
 */
export const seedBoards = (json, players) => {
    if (json.reset) { nights = new Map(); clubBoards = 0; return; }
    if (json.finish) {
        if (finishOnBoard(json.finish)) return;
        for (const night of nights.values()) {
            const entry = night.entries.find(item => item.id === json.finish);
            if (!entry) continue;
            Object.assign(entry, { status: 'done', winner: entry.players[0], doneAt: new Date().toISOString(), board: null });
            refill(night);
        }
        return;
    }
    if (json.scenario === 'night') {
        const ids = json.players ?? players.slice(0, 6).map(p => p.id);
        const night = newNight(json.day, ids, 2);
        // the user and Ben first, so they are called to board 1
        night.entries.push({ id: `be${++entrySeq}`, players: [ids[0], ids[1]], status: 'queued', board: null, held: false, game: null, winner: null, readyAt: new Date(Date.now() - 600e3).toISOString(), calledAt: null, doneAt: null });
        refill(night);
        const live = night.entries.find(entry => entry.board === 2);
        if (live) Object.assign(live, { status: 'playing', game: { kind: 'x01', id: 'x2' } });
        nights.set(json.day, night);
    }
};

// the English name of a round, as the API sends it
const roundOf = (match) => (match.group != null ? 'Group stage' : ({ 2: 'Final', 4: 'Semi-finals', 8: 'Quarter-finals' })[match.size] ?? `Last ${match.size}`);

// the big screen of the boards: every board with its players, the legs of a game going on, and the next up
const screenOf = (kind, title, view, itemOf, players) => {
    const who = (ids) => ids.map(id => players.find(p => p.id === id)).filter(Boolean).map(p => ({ id: p.id, nickname: p.nickname, country: p.country ?? '' }));
    return {
        kind, title,
        club: { name: 'Test Club', logo: '', accent: null },
        boards: view.boards.map(board => {
            const item = board.key ? itemOf(board.key) : null;
            const playing = board.status === 'playing';
            return { number: board.number, out: board.out, status: board.status, calledAt: item?.calledAt ?? null, round: item?.round ?? null, players: item ? who(item.players) : [], legs: playing ? [2, 1] : null, sets: null, score: playing ? [140, 32] : null };
        }),
        queue: view.queue.slice(0, 8).map(key => ({ round: itemOf(key)?.round ?? null, players: who(itemOf(key)?.players ?? []) })),
        expiresAt: expiresAt(),
    };
};

const pairTo = (code, token) => {
    const pairing = [...(globalThis.mockPairings ?? new Map()).values()].find(entry => entry.code === code);
    if (!pairing) return null;
    pairing.token = token;
    return pairing;
};

export const boardsMock = (req, res, path, json, send, { players, me, isAdmin, club }) => {
    if (path === '/api/calendar/boards' && req.method === 'PUT') {
        clubBoards = Math.max(0, Math.min(16, Number(json.count) || 0));
        club.boards = clubBoards;
        return send(res, 200, { boards: clubBoards });
    }
    if (path === '/api/boards/mine') {
        const name = (id) => { const p = players.find(x => x.id === id); return p ? { id: p.id, nickname: p.nickname, profileImg: '' } : null; };
        const list = [];
        for (const t of allTournaments()) {
            for (const m of t.matches ?? []) {
                if (!m.board || !['ready', 'running'].includes(m.status) || !m.players.includes(me)) continue;
                list.push({ source: 'tournament', id: t.id, key: m.id, club: { id: 'c1', name: 'Test Club' }, title: t.name, link: `/tournaments/${t.id}`, board: m.board, status: m.status === 'running' ? 'playing' : 'called', opponent: name(m.players.find(p => p !== me)), game: m.game ? { kind: 'x01', id: m.game } : null, calledAt: m.calledAt ?? null });
            }
        }
        for (const night of nights.values()) {
            for (const entry of night.entries) {
                if (!entry.board || !['called', 'playing'].includes(entry.status) || !entry.players.includes(me)) continue;
                list.push({ source: 'night', id: night.day, key: entry.id, club: { id: 'c1', name: 'Test Club' }, title: 'Club night', link: `/club-night/${night.day}`, board: entry.board, status: entry.status, opponent: name(entry.players.find(p => p !== me)), game: entry.game, calledAt: entry.calledAt });
            }
        }
        return send(res, 200, list);
    }

    // the big screens of the boards, without a login
    const screen = path.match(/^\/api\/screen\/boards-(tournament|night)-(.+)$/);
    if (screen) {
        if (screen[1] === 'tournament') {
            const t = allTournaments().find(entry => entry.id === screen[2]);
            if (!t) return send(res, 404, { message: 'This big screen link is not valid any more. Open a new one from the game.', expired: true });
            const itemOf = (key) => { const m = t.matches.find(entry => entry.id === key); return m && { players: m.players, calledAt: m.calledAt, round: roundOf(m) }; };
            return send(res, 200, screenOf('tournamentBoards', t.name, tournamentBoardView(t), itemOf, players));
        }
        const night = nights.get(screen[2]);
        if (!night) return send(res, 404, { message: 'This big screen link is not valid any more. Open a new one from the game.', expired: true });
        const itemOf = (key) => night.entries.find(entry => entry.id === key);
        return send(res, 200, screenOf('nightBoards', 'Club night', boardsView(night.boards, nightItems(night)), itemOf, players));
    }

    const m = path.match(/^\/api\/calendar\/nights\/(\d{4}-\d{2}-\d{2})\/boards(\/.*)?$/);
    if (!m) return false;
    const [, day, rest = ''] = m;
    let night = nights.get(day);
    const view = () => send(res, 200, nightView(night, players, me, isAdmin));
    if (!rest && req.method === 'GET') return night ? view() : send(res, 200, null);
    if (!rest && req.method === 'PUT') {
        if (!isAdmin) return send(res, 403, { message: 'Only club admins can do this.' });
        if (!night) { night = newNight(day, json.players ?? [], json.count ?? (clubBoards || 2)); nights.set(day, night); }
        if (json.players) {
            night.players = json.players;
            night.entries.filter(entry => ['queued', 'called'].includes(entry.status) && entry.players.some(p => !json.players.includes(p))).forEach(entry => Object.assign(entry, { status: 'cancelled', board: null }));
        }
        if (json.setup) night.setup = { ...night.setup, ...json.setup };
        if (json.count !== undefined || json.out) {
            const result = setBoards(nightItems(night), { count: json.count ?? night.boards.count, out: json.out ?? night.boards.out });
            night.boards = result.boards;
            applyNight(night, result.changes);
        }
        refill(night);
        return view();
    }
    if (!night) return send(res, 404, { message: 'This club night is not played on boards.' });
    if (rest === '/screen') return send(res, 200, { token: `boards-night-${day}`, expiresAt: expiresAt() });
    if (rest === '/screen/send') return pairTo(json.code, `boards-night-${day}`) ? send(res, 200, { sent: true }) : send(res, 404, { message: 'No TV shows this code. Check the code on the TV, or open /tv there again.' });
    const entryPath = rest.match(/^\/entries\/([\w-]+)(\/start)?$/);
    const entry = entryPath && night.entries.find(item => item.id === entryPath[1]);
    if (!entry) return send(res, 404, { message: 'There is no such game on the boards.' });
    if (entryPath[2]) {
        if (!isAdmin && !entry.players.includes(me)) return send(res, 403, { message: 'Only the players of a match or a club admin can start it.' });
        if (['done', 'cancelled'].includes(entry.status)) return send(res, 409, { message: 'This game is over.' });
        if (entry.game) return send(res, 200, { game: entry.game });
        Object.assign(entry, { status: 'playing', game: { kind: night.setup.kind, id: `x-${entry.id}` } });
        return send(res, 201, { game: entry.game });
    }
    if (!isAdmin) return send(res, 403, { message: 'Only club admins can do this.' });
    let result = { changes: [] };
    if (json.board !== undefined) result = moveTo(night.boards, nightItems(night), entry.id, json.board);
    else if (json.held !== undefined) result = hold(night.boards, nightItems(night), entry.id, Boolean(json.held));
    else if (json.status === 'cancelled') Object.assign(entry, { status: 'cancelled', board: null });
    if (result.error) return send(res, 409, { message: result.error });
    applyNight(night, result.changes);
    refill(night);
    return view();
};
