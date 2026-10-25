import { storedOf } from '../rules/stored';
import { currentLanguage, translateAnswer } from '../utils/i18n';
import { keepKey as keepGameKey } from './quick.game.service';

const API_URL = '/api/public/evenings';

// the key of each evening started in this browser: only it plays its games and makes it a club
const KEYS = 'darts-score.evenings';
const readKeys = () => {
    try {
        return JSON.parse(localStorage.getItem(KEYS) ?? '{}') ?? {};
    } catch {
        return {};
    }
};
export const eveningKeyOf = (id) => readKeys()[id]?.key ?? '';
const keepKey = (id, key) => {
    try {
        const monthAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
        const kept = Object.fromEntries(Object.entries(readKeys()).filter(([, entry]) => entry?.at > monthAgo));
        localStorage.setItem(KEYS, JSON.stringify({ ...kept, [id]: { key, at: Date.now() } }));
    } catch {
        // without storage the evening is played in this tab only
    }
};

// the evenings of this browser, the newest first: [{ id, at }]
export const myEvenings = () => Object.entries(readKeys()).map(([id, entry]) => ({ id, at: entry?.at ?? 0 })).sort((a, b) => b.at - a.at);

const request = async (url, { method = 'GET', body, key } = {}) => {
    const response = await fetch(url, {
        method,
        headers: {
            ...(body !== undefined && { 'Content-Type': 'application/json' }),
            ...(key && { 'X-Quick-Key': key }),
            'Accept-Language': currentLanguage(),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const data = translateAnswer(await response.json().catch(() => ({})));
    if (!response.ok) throw Object.assign(new Error(data.errors?.join(' ') || data.message || response.statusText), { status: response.status });
    return data;
};

/**
 * Starts an evening: { name, names } → the evening (its key kept here).
 */
const createEvening = async (setup) => {
    const { evening, key } = await request(API_URL, { method: 'POST', body: setup });
    keepKey(evening.id, key);
    return evening;
};

const loadEvening = (id) => request(`${API_URL}/${id}`, { key: eveningKeyOf(id) });
const loadShared = (token) => request(`${API_URL}/shared/${encodeURIComponent(token)}`);

/**
 * A game of the evening: kind and the game (see utils/quick.games) → the
 * quick game, played on with the evening's key.
 */
const addGame = async (id, kind, game) => {
    const key = eveningKeyOf(id);
    const { game: created } = await request(`${API_URL}/${id}/games`, { method: 'POST', body: { kind, game: storedOf(kind, { ...game, visits: game.visits ?? [] }) }, key });
    keepGameKey(created.id, key);
    return created;
};

// the evening becomes a club of the logged-in user: { name, me } → { club, games }
const makeClub = (id, setup) => request(`/api/evenings/${id}/club`, { method: 'POST', body: setup, key: eveningKeyOf(id) });

const EveningService = { createEvening, loadEvening, loadShared, addGame, makeClub };

export default EveningService;
