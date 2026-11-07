import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Scoring without a connection: a running game whose save did not get through
 * is kept on this device, with its players, and sent again until the server
 * has it (every few seconds, and at once when the connection is back). Every
 * save sends the whole game, so only its newest state is kept. A reload
 * without a connection opens the kept game; elsewhere in the app a note
 * leads back to games not sent yet.
 *
 * Each save says which stored state it builds on (basedOn: its "updatedAt"):
 * the server refuses an older state over a newer one (another device scored
 * meanwhile) and a finished game sent back unfinished. Such a refusal, a game
 * gone (deleted meanwhile) or a save refused for good is not tried again: the
 * kept state goes and the page loads the server's.
 */
const KEY = 'darts-score.unsent-games';
export const UNSENT_CHANGED = 'darts-score:unsent-changed';
const RETRY_MS = 10000;

// the answers no retry changes: the game gone (404), a newer state or a finished game (409), refused (422)
const REFUSED = [404, 409, 422];
export const isRefused = (error) => REFUSED.includes(error?.status);

// the stored state each game of this page builds on, by key: its "updatedAt" on the server
const serverAt = new Map();

// the darts of a visit as stored: no empty ones
const dartsOf = (visit) => (visit?.darts ?? []).filter(dart => dart !== '' && dart != null).map(String);
const sameVisit = (a, b) => String(a?.player) === String(b?.player) && dartsOf(a).join() === dartsOf(b).join();

// "after" has every visit of "before", in order, and maybe more
export const extendsVisits = (before = [], after = []) => after.length >= before.length && before.every((visit, index) => sameVisit(visit, after[index]));

const timeOf = (value) => (value ? new Date(value).getTime() : NaN);

/**
 * A kept state the server would refuse, by the game it has now: the game is
 * finished there (and the kept state is not the same), or the kept state
 * takes visits back or differs while the server's moved on since it was kept.
 */
export const outdatedBy = (server, kept) => {
    if (!server || !kept?.game) return false;
    const before = server.visits ?? [];
    const after = kept.game.visits ?? [];
    if (server.hasWinner) return !(after.length === before.length && extendsVisits(before, after));
    if (extendsVisits(before, after)) return false;
    return timeOf(kept.basedOn) !== timeOf(server.updatedAt);
};

const readAll = () => {
    try {
        return JSON.parse(localStorage.getItem(KEY) || '{}') ?? {};
    } catch {
        return {};
    }
};

const writeAll = (all) => {
    try {
        if (Object.keys(all).length) localStorage.setItem(KEY, JSON.stringify(all));
        else localStorage.removeItem(KEY);
    } catch {
        // storage full or unavailable: the game stays on the page until it is sent
    }
    window.dispatchEvent(new Event(UNSENT_CHANGED));
};

// { game, players, link, kind, at } of a game not sent yet, or null
export const unsentGame = (key) => readAll()[key] ?? null;

// every game not sent yet, the oldest first: [{ key, game, players, link, kind, at }]
export const unsentGames = () => Object.entries(readAll()).map(([key, entry]) => ({ key, ...entry })).sort((a, b) => a.at - b.at);

const keep = (key, entry) => writeAll({ ...readAll(), [key]: entry });

// gone once sent; only the state that was sent (a newer one waits for its own turn)
const drop = (key, at) => {
    const all = readAll();
    if (!all[key] || (at !== undefined && all[key].at !== at)) return;
    delete all[key];
    writeAll(all);
};

// given up on (e.g. the game was deleted meanwhile)
export const discardUnsent = (key) => drop(key);

// a state kept meanwhile builds on what the server has now
const rebase = (key, basedOn) => {
    const all = readAll();
    if (!all[key]) return;
    all[key] = { ...all[key], basedOn };
    writeAll(all);
};

/**
 * The saves of a running game. key: the game's own key ('x01:<id>');
 * send(game, { basedOn }): the save of the API, resolving with the game as
 * stored and rejecting when it did not get through (with the status when the
 * server answered); onSent(game): after a state is on the server and is still
 * the newest (e.g. a won game opens its result then); onRefused(error): the
 * server refused the save for good (isRefused): the kept state is gone, the
 * page loads the server's. save(game, { players, link, kind }) keeps the state
 * and sends it; unsent is true while one is waiting for the connection.
 */
export const useGameSaves = (key, send, onSent, onRefused) => {
    const [unsent, setUnsent] = useState(() => Boolean(key && unsentGame(key)));
    // the saves run one after the other, so they arrive in order
    const chain = useRef(Promise.resolve());
    const latest = useRef({ send, onSent, onRefused });
    latest.current = { send, onSent, onRefused };

    // sends what is kept for the game, if it is still the newest state
    const flush = useCallback(() => {
        chain.current = chain.current.then(async () => {
            const entry = key && unsentGame(key);
            if (!entry) return;
            try {
                const stored = await latest.current.send(entry.game, { basedOn: serverAt.has(key) ? serverAt.get(key) : entry.basedOn });
                if (stored?.updatedAt) {
                    serverAt.set(key, stored.updatedAt);
                    rebase(key, stored.updatedAt);
                }
                drop(key, entry.at);
                const newer = unsentGame(key);
                setUnsent(Boolean(newer));
                // a state replaced since (e.g. by an undo) opens nothing
                if (!newer) latest.current.onSent?.(entry.game);
            } catch (error) {
                if (!isRefused(error)) {
                    setUnsent(true);
                    return;
                }
                // not tried again: the newer states kept meanwhile build on the same refused one
                drop(key);
                serverAt.delete(key);
                setUnsent(false);
                latest.current.onRefused?.(error, entry.game);
            }
        });
        return chain.current;
    }, [key]);

    const save = useCallback((game, { players, link, kind } = {}) => {
        if (!key) return Promise.resolve();
        const kept = unsentGame(key);
        // a little later than the last one, even within the same millisecond
        const at = Math.max(Date.now(), (kept?.at ?? 0) + 1);
        const basedOn = serverAt.has(key) ? serverAt.get(key) : kept?.basedOn;
        keep(key, { game, players, link: link ?? window.location.pathname, kind, at, ...(basedOn && { basedOn }) });
        return flush();
    }, [key, flush]);

    // a game kept from before (e.g. reloaded without a connection) goes out at once;
    // a waiting one again every few seconds and when the connection is back
    useEffect(() => {
        if (key && unsentGame(key)) flush();
    }, [key, flush]);
    useEffect(() => {
        if (!unsent) return undefined;
        const timer = setInterval(flush, RETRY_MS);
        window.addEventListener('online', flush);
        return () => {
            clearInterval(timer);
            window.removeEventListener('online', flush);
        };
    }, [unsent, flush]);

    return { save, unsent };
};

/**
 * Loads a game and its players for its page: a state kept on this device
 * (not sent yet) wins over the server's, and without a connection the kept
 * one is used alone. A kept state the server would refuse (outdatedBy) goes,
 * and so does that of a game gone from the server (the load rejects then).
 * load(): the game from the API; players(game): its players. → { game,
 * players, kept, dropped: a kept state went for the server's }
 */
export const loadWithUnsent = async (key, load, players) => {
    let kept = unsentGame(key);
    let game;
    let dropped = false;
    try {
        game = await load();
    } catch (error) {
        // deleted meanwhile: nothing to send it to
        if (kept && error?.status === 404) discardUnsent(key);
        if (!kept || error?.status === 404) throw error;
    }
    if (kept && outdatedBy(game, kept)) {
        discardUnsent(key);
        kept = null;
        dropped = true;
    }
    // what the saves of this page build on; a save that got through while this loaded knows a newer one
    const basedOn = kept ? kept.basedOn : game?.updatedAt;
    const known = serverAt.get(key);
    if (basedOn && !(timeOf(known) > timeOf(basedOn))) serverAt.set(key, basedOn);
    const chosen = kept?.game ?? game;
    let found;
    try {
        found = await players(chosen);
    } catch (error) {
        if (!kept?.players) throw error;
        found = kept.players;
    }
    return { game: chosen, players: found, kept: Boolean(kept), dropped };
};

// the browser knows it has no network
export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

// follows the network of the browser: true while it is gone
export const useOffline = () => {
    const [offline, setOffline] = useState(isOffline);
    useEffect(() => {
        const update = () => setOffline(isOffline());
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);
    return offline;
};

// the games not sent yet, following changes in this tab and others
export const useUnsentGames = () => {
    const [list, setList] = useState(unsentGames);
    useEffect(() => {
        const update = () => setList(unsentGames());
        const storage = (event) => { if (event.key === KEY) update(); };
        window.addEventListener(UNSENT_CHANGED, update);
        window.addEventListener('storage', storage);
        return () => {
            window.removeEventListener(UNSENT_CHANGED, update);
            window.removeEventListener('storage', storage);
        };
    }, []);
    return list;
};
