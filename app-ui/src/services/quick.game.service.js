import { gameOf, storedOf } from '../rules/stored';
import { currentLanguage, translateAnswer } from '../utils/i18n';
const API_URL = '/api/public/quick-games';

// the key each quick game was started with stays in this browser: only it plays on
const KEYS = 'darts-score.quickGames';
const readKeys = () => {
    try {
        return JSON.parse(localStorage.getItem(KEYS) ?? '{}') ?? {};
    } catch {
        return {};
    }
};
const keyOf = (id) => readKeys()[id] ?? '';
export const keepKey = (id, key) => {
    try {
        // a month later the game is gone on the server too
        const monthAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
        const kept = Object.fromEntries(Object.entries(readKeys()).filter(([, entry]) => entry?.at > monthAgo));
        localStorage.setItem(KEYS, JSON.stringify({ ...kept, [id]: { key, at: Date.now() } }));
    } catch {
        // without storage the game is played in this tab only
    }
};

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
    if (!response.ok) throw new Error(data.errors?.join(' ') || data.message || response.statusText);
    return data;
};

/**
 * Starts a quick game ('x01', 'cricket' or 'elimination') and keeps its key. → the game
 */
const createQuickGame = async (kind, game) => {
    // stored as its settings, players and visits; the game comes back worked out from them
    const { game: created, key } = await request(API_URL, { method: 'POST', body: { kind, game: storedOf(kind, { ...game, visits: game.visits ?? [] }) } });
    keepKey(created.id, key);
    return gameOf(kind, created);
};

// without the key on this device, a global admin still reads the game (and nobody else)
const ADMIN_URL = '/api/admin/quick-games';
const readQuick = async (path, id) => {
    const key = keyOf(id)?.key;
    try {
        return await request(`${API_URL}/${id}${path}`, { key });
    } catch (error) {
        if (key) throw error;
        return request(`${ADMIN_URL}/${id}${path}`).catch(() => { throw error; });
    }
};

const loadQuickGame = async (id) => {
    const game = await readQuick('', id);
    return gameOf(game.kind, game);
};

const loadQuickGameStats = (id) => readQuick('/stats', id);

const updateQuickGame = (game) => request(`${API_URL}/${game.id}`, { method: 'PUT', body: storedOf(game.kind, game), key: keyOf(game.id)?.key });

// the players of a quick game are only names: made to look like players for the game pages
// in the order they throw in this game (a rematch may switch them)
export const quickPlayersOf = (game) => (game.players ?? []).map(id => game.quickPlayers?.find(player => player.id === id)).filter(Boolean).map(player => ({
    id: player.id,
    nickname: player.nickname,
    firstname: player.nickname,
    lastname: '',
    profileImg: '',
    quick: true,
}));

// what the game pages of X01 and Cricket call on their service
export const QuickX01Service = {
    createX01Game: (game) => createQuickGame('x01', game),
    loadX01GameById: loadQuickGame,
    updateX01Game: updateQuickGame,
    loadX01GameStats: loadQuickGameStats,
};

export const QuickCricketService = {
    createCricketGame: (game) => createQuickGame('cricket', game),
    loadCricketGameById: loadQuickGame,
    updateCricketGame: updateQuickGame,
};

export const QuickEliminationService = {
    createEliminationGame: (game) => createQuickGame('elimination', game),
    loadEliminationGameById: loadQuickGame,
    updateEliminationGame: updateQuickGame,
};

const QuickGameService = { createQuickGame, loadQuickGame, updateQuickGame };

export default QuickGameService;
