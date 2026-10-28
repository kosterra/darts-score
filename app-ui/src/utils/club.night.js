/**
 * The club evening of a club night, on this device: who plays tonight (when
 * it differs from those who said they come), and which games were started
 * from it, so their statistics lead back. The window of the evening is
 * worked out here, in the club's time: from three hours before the night
 * starts until six the next morning.
 */

const PLAYERS_KEY = (clubId, day) => `darts-score.clubNight.${clubId}.${day}`;
const GAMES_KEY = 'darts-score.clubNightGames';
const read = (key, fallback) => {
    try {
        return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
    } catch {
        return fallback;
    }
};
const write = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // without storage the choice lasts as long as the page
    }
};

export const chosenPlayers = (clubId, day) => read(PLAYERS_KEY(clubId, day), null);
export const choosePlayers = (clubId, day, players) => write(PLAYERS_KEY(clubId, day), players);

// a game started from a club evening: its night, for the way back (kept two weeks)
export const noteNightGame = (gameId, day) => {
    const twoWeeks = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const kept = Object.fromEntries(Object.entries(read(GAMES_KEY, {})).filter(([, entry]) => entry?.at > twoWeeks));
    write(GAMES_KEY, { ...kept, [gameId]: { day, at: Date.now() } });
};
export const nightOfGame = (gameId) => read(GAMES_KEY, {})[gameId]?.day ?? null;

// the evening of a night ("YYYY-MM-DD", starting "HH:MM") in the time of this device
export const eveningWindow = (day, start = '19:00') => {
    const [year, month, date] = day.split('-').map(Number);
    const [hours, minutes] = start.split(':').map(Number);
    const from = new Date(year, month - 1, date, hours - 3, minutes);
    const to = new Date(year, month - 1, date + 1, 6, 0);
    return { from, to };
};
