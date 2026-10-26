import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Scoring without a connection: a running game whose save did not get through
 * is kept on this device, with its players, and sent again until the server
 * has it (every few seconds, and at once when the connection is back). Every
 * save sends the whole game, so only its newest state is kept. A reload
 * without a connection opens the kept game; elsewhere in the app a note
 * leads back to games not sent yet.
 */
const KEY = 'darts-score.unsent-games';
export const UNSENT_CHANGED = 'darts-score:unsent-changed';
const RETRY_MS = 10000;

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

/**
 * The saves of a running game. key: the game's own key ('x01:<id>');
 * send(game): the save of the API, rejecting when it did not get through;
 * onSent(game): after a state is on the server (e.g. a won game opens its
 * result then). save(game, { players, link, kind }) keeps the state and sends
 * it; unsent is true while one is waiting for the connection.
 */
export const useGameSaves = (key, send, onSent) => {
    const [unsent, setUnsent] = useState(() => Boolean(key && unsentGame(key)));
    // the saves run one after the other, so they arrive in order
    const chain = useRef(Promise.resolve());
    const latest = useRef({ send, onSent });
    latest.current = { send, onSent };

    // sends what is kept for the game, if it is still the newest state
    const flush = useCallback(() => {
        chain.current = chain.current.then(async () => {
            const entry = key && unsentGame(key);
            if (!entry) return;
            try {
                await latest.current.send(entry.game);
                drop(key, entry.at);
                setUnsent(Boolean(unsentGame(key)));
                latest.current.onSent?.(entry.game);
            } catch {
                setUnsent(true);
            }
        });
        return chain.current;
    }, [key]);

    const save = useCallback((game, { players, link, kind } = {}) => {
        if (!key) return Promise.resolve();
        // a little later than the last one, even within the same millisecond
        const at = Math.max(Date.now(), (unsentGame(key)?.at ?? 0) + 1);
        keep(key, { game, players, link: link ?? window.location.pathname, kind, at });
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
 * one is used alone. load(): the game from the API; players(game): its players.
 */
export const loadWithUnsent = async (key, load, players) => {
    const kept = unsentGame(key);
    let game;
    try {
        game = await load();
    } catch (error) {
        if (!kept) throw error;
    }
    const chosen = kept?.game ?? game;
    let found;
    try {
        found = await players(chosen);
    } catch (error) {
        if (!kept?.players) throw error;
        found = kept.players;
    }
    return { game: chosen, players: found, kept: Boolean(kept) };
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
