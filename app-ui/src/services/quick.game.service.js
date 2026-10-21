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
const keepKey = (id, key) => {
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
 * Starts a quick game ('x01' or 'cricket') and keeps its key. → the game
 */
const createQuickGame = async (kind, game) => {
    const { game: created, key } = await request(API_URL, { method: 'POST', body: { kind, game } });
    keepKey(created.id, key);
    return created;
};

const loadQuickGame = (id) => request(`${API_URL}/${id}`, { key: keyOf(id)?.key });

const loadQuickGameStats = (id) => request(`${API_URL}/${id}/stats`, { key: keyOf(id)?.key });

const updateQuickGame = (game) => request(`${API_URL}/${game.id}`, { method: 'PUT', body: game, key: keyOf(game.id)?.key });

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

const QuickGameService = { createQuickGame, loadQuickGame, updateQuickGame };

export default QuickGameService;
