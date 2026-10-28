/**
 * Leagues of a club: a season where everyone plays everyone (once, or twice
 * with the order swapped), in matchdays with dates. A match is an X01 game
 * by the league's rules, played any time up to its date; the admins can move
 * a matchday or a single match. The table counts as in the groups of a
 * tournament: 2 points a win, then leg difference, legs won, the match
 * between two. Plain data and functions without texts: the API keeps an
 * identical copy (see shared.js).
 */
import { groupTable, isDecided, rulesError } from './tournaments.js';

export const LEAGUE_STATUSES = ['draft', 'running', 'finished', 'cancelled'];
// how often everyone meets everyone
export const MEETINGS = [1, 2];
export const MIN_LEAGUE_PLAYERS = 3;
export const MAX_LEAGUE_PLAYERS = 20;
// days from one matchday to the next
export const EVERY_DAYS = [7, 14];

// a match of a league: "d3-1" is the second match of the third matchday
export const leagueMatchId = (day, index) => `d${day}-${index}`;
export const LEAGUE_MATCH_ID = /^d\d+-\d+$/;

/**
 * Everyone against everyone once, in rounds where everyone plays once (one
 * sits out with an odd number): the circle method. Who is named first takes
 * turns, so nobody is always the first. → [[[a, b], …], …] one list per round
 */
export const roundRobin = (players) => {
    const seats = players.length % 2 ? [...players, null] : [...players];
    const rounds = [];
    for (let round = 0; round < seats.length - 1; round += 1) {
        const pairs = [];
        for (let pair = 0; pair < seats.length / 2; pair += 1) {
            const a = seats[pair];
            const b = seats[seats.length - 1 - pair];
            if (a !== null && b !== null) pairs.push(round % 2 ? [b, a] : [a, b]);
        }
        rounds.push(pairs);
        seats.splice(1, 0, seats.pop());
    }
    return rounds;
};

/**
 * The matches of a season: the rounds of everyone against everyone as
 * matchdays, a second time with the order swapped when they meet twice.
 * → [{ id, day, index, players, status, winner, date }] (date null: the matchday's)
 */
export const leagueMatches = (players, meetings = 1) => {
    const rounds = roundRobin(players);
    const all = meetings === 2 ? [...rounds, ...rounds.map(pairs => pairs.map(([a, b]) => [b, a]))] : rounds;
    return all.flatMap((pairs, round) => pairs.map((pair, index) => ({
        id: leagueMatchId(round + 1, index), day: round + 1, index,
        players: [...pair], status: 'ready', winner: null, date: null,
    })));
};

// the days of the matchdays: the first one, then every so many days
export const matchdayDates = (first, everyDays, count) => Array.from({ length: count }, (_, index) => {
    const date = new Date(first);
    date.setDate(date.getDate() + index * everyDays);
    return date;
});

// how many matchdays a season has
export const matchdayCount = (players, meetings = 1) => (players % 2 ? players : players - 1) * meetings;

// by when a match is played: its own date, or its matchday's
export const dueOf = (league, match) => match.date ?? league.matchdays?.find(entry => entry.day === match.day)?.date ?? null;

// the table of a league (see groupTable)
export const leagueTable = (players, matches) => groupTable(players, matches);

// the season is over: every match decided
export const seasonOver = (matches) => matches.length > 0 && matches.every(isDecided);

/**
 * Why a league cannot be set up like this, or null.
 */
export const leagueSetupError = ({ players = [], meetings, rules, first, everyDays }) => {
    if (new Set(players).size !== players.length) return 'Every player plays once in a league.';
    if (players.length < MIN_LEAGUE_PLAYERS) return `A league needs at least ${MIN_LEAGUE_PLAYERS} players.`;
    if (players.length > MAX_LEAGUE_PLAYERS) return `A league has at most ${MAX_LEAGUE_PLAYERS} players.`;
    if (!MEETINGS.includes(Number(meetings))) return 'Choose whether they meet once or twice.';
    if (!EVERY_DAYS.includes(Number(everyDays))) return 'Choose how often a matchday is.';
    if (!first || Number.isNaN(new Date(first).getTime())) return 'Choose the day of the first matchday.';
    return rulesError(rules);
};
