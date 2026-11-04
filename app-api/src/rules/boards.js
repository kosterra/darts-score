/**
 * Boards: games played side by side, each called to a free board from a
 * queue, for a tournament and for a club night. Plain data and functions
 * without texts: the API keeps an identical copy (see shared.js) to call the
 * matches; the app shows the boards and the queue from the same rules.
 *
 * Both hosts are mapped to items { key, players, status, board, held,
 * readyAt, doneAt, stage }:
 *   status 'waiting' (players not known yet), 'queued' (ready, no board),
 *   'called' (on a board, not started), 'playing' (its game runs), 'done'.
 *   stage: the smaller plays first (the group stage, then the bigger round).
 */

export const MAX_BOARDS = 16;
// a club night pairs two players a game
export const NIGHT_STATUSES = ['queued', 'called', 'playing', 'done', 'cancelled'];

const time = (date) => (date ? new Date(date).getTime() : 0);

// an item that holds its board: called to it or playing on it
const onBoard = (item) => Boolean(item.board) && ['called', 'playing'].includes(item.status);

/**
 * Who plays the next game of a darts evening: whoever played least, in
 * pairings that did not happen yet, and nobody who is in a game right now
 * (unless there is no one else). players: [{ id }], games: [{ players,
 * running }], size: how many play (2 to 4). → the ids, in the order they throw.
 */
export const suggestNext = (players, games, size = 2) => {
    const ids = players.map(player => player.id);
    const played = new Map(ids.map(id => [id, 0]));
    const together = new Map();
    const busy = new Set();
    const pair = (a, b) => [a, b].sort().join('|');
    for (const game of games) {
        const inGame = (game.players ?? []).filter(id => played.has(id));
        for (const id of inGame) played.set(id, played.get(id) + 1);
        for (const a of inGame) for (const b of inGame) if (a < b) together.set(pair(a, b), (together.get(pair(a, b)) ?? 0) + 1);
        if (game.running) inGame.forEach(id => busy.add(id));
    }
    const chosen = [];
    const count = Math.min(size, ids.length);
    while (chosen.length < count) {
        const score = (id) => (busy.has(id) ? 1000 : 0)
            + chosen.reduce((sum, other) => sum + (together.get(pair(id, other)) ?? 0), 0) * 10
            + played.get(id);
        const next = ids.filter(id => !chosen.includes(id)).sort((a, b) => score(a) - score(b) || ids.indexOf(a) - ids.indexOf(b))[0];
        chosen.push(next);
    }
    // the one who played least throws first
    return chosen.sort((a, b) => played.get(a) - played.get(b) || ids.indexOf(a) - ids.indexOf(b));
};

// the boards that are played on: 1 … count, without those taken out
export const activeBoards = (boards) => {
    const out = new Set(boards?.out ?? []);
    return Array.from({ length: Math.max(0, Math.min(MAX_BOARDS, boards?.count ?? 0)) }, (_, index) => index + 1).filter(number => !out.has(number));
};

// the players on a board (called or playing) or in a game without one: they cannot be called elsewhere
export const busyPlayers = (items) => new Set(items.filter(item => onBoard(item) || item.status === 'playing').flatMap(item => item.players.filter(Boolean)));

/**
 * The queue: the items ready to be called, without a board and not held
 * back; the group stage first, then the bigger round; within that whoever
 * waited longest (the latest finish of either player the earliest, never
 * played before anyone), then the earlier ready, then the order given.
 */
export const queueOf = (items) => {
    const lastDone = new Map();
    for (const item of items) {
        if (item.status !== 'done' || !item.doneAt) continue;
        for (const player of item.players) if (player) lastDone.set(player, Math.max(lastDone.get(player) ?? 0, time(item.doneAt)));
    }
    const waited = (item) => Math.max(0, ...item.players.map(player => lastDone.get(player) ?? 0));
    return items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.status === 'queued' && !item.board && !item.held && item.players.length >= 2 && item.players.every(Boolean))
        .sort((a, b) => (a.item.stage ?? 0) - (b.item.stage ?? 0)
            || waited(a.item) - waited(b.item)
            || time(a.item.readyAt) - time(b.item.readyAt)
            || a.index - b.index)
        .map(({ item }) => item);
};

/**
 * Calls the queue to the free boards: each free board in number order takes
 * the first item in the queue with nobody on another board. Never a player
 * on two boards. → [{ key, board }]
 */
export const fill = (boards, items) => {
    const taken = new Set(items.filter(onBoard).map(item => item.board));
    const busy = busyPlayers(items);
    const queue = queueOf(items);
    const calls = [];
    for (const number of activeBoards(boards).filter(board => !taken.has(board))) {
        const next = queue.find(item => !calls.some(call => call.key === item.key) && item.players.every(player => !busy.has(player)));
        if (!next) continue;
        calls.push({ key: next.key, board: number });
        next.players.forEach(player => busy.add(player));
    }
    return calls;
};

// the items with changes { key, …fields } applied, as new objects: one not started is called with a board and queued without
export const applyChanges = (items, changes) => items.map(item => {
    const own = changes.filter(change => change.key === item.key);
    if (!own.length) return item;
    // eslint-disable-next-line no-unused-vars
    const next = Object.assign({ ...item }, ...own.map(({ key, ...fields }) => fields));
    if (['queued', 'called'].includes(next.status)) next.status = next.board ? 'called' : 'queued';
    return next;
});

/**
 * The boards set anew ({ count, out }): an item called to a board that is no
 * longer played on goes back to the queue (keeping when it was ready, so it is
 * first again); one playing there finishes, the board is not called again.
 * Then the free boards are filled. → { boards, changes: [{ key, board }] }
 * (the calls among them)
 */
export const setBoards = (items, next) => {
    const count = Math.max(0, Math.min(MAX_BOARDS, Math.round(Number(next.count) || 0)));
    const boards = { count, out: [...new Set((next.out ?? []).map(Number))].filter(number => Number.isInteger(number) && number >= 1 && number <= count).sort((a, b) => a - b) };
    const active = new Set(activeBoards(boards));
    const back = items.filter(item => item.status === 'called' && item.board && !active.has(item.board)).map(item => ({ key: item.key, board: null }));
    const settled = applyChanges(items, back);
    return { boards, changes: [...back, ...fill(boards, settled)] };
};

// a board taken out (broken, or needed for something else): see setBoards
export const takeOut = (boards, items, number) => setBoards(items, { count: boards.count, out: [...(boards.out ?? []), number] });

/**
 * An admin moves an item to a board: a free board takes it; one with an item
 * not started yet swaps with it (that one goes to the queue when the moved
 * one came from there). Only the board changes: the host calls an item
 * with a board and queues one without. Refused when the board is out, a game runs on it, or
 * a player would be on two boards.
 * → { changes: [{ key, board }] } or { error }
 */
export const moveTo = (boards, items, key, number) => {
    const item = items.find(entry => entry.key === key);
    if (!item || !['queued', 'called', 'playing'].includes(item.status) || !item.players.every(Boolean)) return { error: 'This match cannot go to a board.' };
    if (!activeBoards(boards).includes(Number(number))) return { error: 'This board is not played on.' };
    if (item.board === Number(number)) return { changes: [] };
    const there = items.find(entry => onBoard(entry) && entry.board === Number(number));
    if (there?.status === 'playing') return { error: 'A game is going on at this board.' };
    // the players of the moved item must not be on another board (the one swapped away aside)
    const others = items.filter(entry => entry.key !== key && entry.key !== there?.key);
    const busy = busyPlayers(others);
    if (item.players.some(player => busy.has(player))) return { error: 'A player of this match is on another board.' };
    const changes = [{ key, board: Number(number), held: false }];
    // the one there takes the board the moved one leaves, or goes back to the queue
    if (there) changes.push({ key: there.key, board: onBoard(item) ? item.board : null });
    return { changes };
};

/**
 * Holds an item back (a player is not there) or lets it into the queue
 * again: a held item is never called; one called to a board leaves it and
 * the board is filled. A game going on is not held.
 * → { changes: [{ key, … }] } or { error }
 */
export const hold = (boards, items, key, on) => {
    const item = items.find(entry => entry.key === key);
    if (!item || !['queued', 'called'].includes(item.status)) return { error: 'Only a match not started yet can be held back.' };
    const own = on ? [{ key, held: true, board: null }] : [{ key, held: false }];
    return { changes: [...own, ...fill(boards, applyChanges(items, own))] };
};

/**
 * A club night keeps as many pairings waiting as boards are played on, so
 * the queue always shows who is next: new pairs by suggestNext (who played
 * least, against someone new), leaving out everyone on a board or waiting.
 * night: { boards, players: [ids], entries: [{ players, status }] }
 * → [[a, b]] the pairings to add, in order
 */
export const topUp = (night) => {
    const players = (night.players ?? []).map(id => ({ id: String(id) }));
    const entries = night.entries ?? [];
    // a pairing cancelled counts as met, so it is not suggested again at once
    const games = entries.map(entry => ({ players: entry.players.map(String), running: ['queued', 'called', 'playing'].includes(entry.status) }));
    const wanted = activeBoards(night.boards).length;
    let waiting = entries.filter(entry => entry.status === 'queued' && !entry.held).length;
    const added = [];
    while (waiting < wanted && players.length >= 2) {
        const busy = new Set(games.filter(game => game.running).flatMap(game => game.players));
        const pair = suggestNext(players, games, 2);
        // suggestNext takes a busy player when nobody else is left: then nobody is waiting
        if (pair.length < 2 || pair.some(id => busy.has(id))) break;
        added.push(pair);
        games.push({ players: pair, running: true });
        waiting += 1;
    }
    return added;
};

// ---------------------------------------------------------------------------
// The hosts as items
// ---------------------------------------------------------------------------

const TOURNAMENT_STATUS = { waiting: 'waiting', running: 'playing', done: 'done', walkover: 'done' };

/**
 * The matches of a tournament as items (byes left out): the group stage
 * first, then the rounds from the biggest.
 */
export const tournamentItems = (tournament) => (tournament.matches ?? [])
    .filter(match => match.status !== 'bye')
    .map(match => ({
        key: match.id,
        players: [...(match.players ?? [])].map(player => (player ? String(player) : null)),
        status: match.status === 'ready' ? (match.board ? 'called' : 'queued') : TOURNAMENT_STATUS[match.status] ?? 'waiting',
        board: match.board ?? null,
        held: Boolean(match.held),
        readyAt: match.readyAt ?? null,
        doneAt: match.decidedAt ?? null,
        stage: match.group != null ? 0 : 1 / match.size,
    }));

// the entries of a club night as items
export const nightItems = (night) => (night.entries ?? []).map(entry => ({
    key: String(entry.id),
    players: entry.players.map(String),
    status: entry.status === 'cancelled' ? 'done' : entry.status,
    board: entry.board ?? null,
    held: Boolean(entry.held),
    readyAt: entry.readyAt ?? null,
    doneAt: entry.status === 'done' ? entry.doneAt ?? null : null,
    stage: 0,
}));

/**
 * What the boards show: every board with the item on it (or free, or out),
 * the queue in order and the items held back.
 * → { count, out, boards: [{ number, out, key, status }], queue: [key], held: [key] }
 */
export const boardsView = (boards, items) => {
    const count = Math.max(0, Math.min(MAX_BOARDS, boards?.count ?? 0));
    const out = new Set(boards?.out ?? []);
    return {
        count,
        out: [...out].sort((a, b) => a - b),
        boards: Array.from({ length: count }, (_, index) => {
            const number = index + 1;
            const item = items.find(entry => onBoard(entry) && entry.board === number);
            return { number, out: out.has(number), key: item?.key ?? null, status: item?.status ?? (out.has(number) ? 'out' : 'free') };
        }),
        queue: queueOf(items).map(item => item.key),
        held: items.filter(item => item.held && ['queued', 'called'].includes(item.status)).map(item => item.key),
    };
};
