import db from '../models/db.model.js';
import { knownInClub } from '../models/player.model.js';
import { viewOf } from './game.view.js';
import { reviewYears, yearSpan } from './year.review.js';

/**
 * "The club's year": what a club played in one calendar year, and its
 * awards, as a darts evening has them but over the whole year: whoever won
 * most, played most, threw the best average, the most 180s, the highest
 * checkout, came to the most club nights, and the wooden spoon in good
 * humour. The figures count every finished game; the awards leave friendly
 * games out (as the club's leaderboards) and go to members only.
 */

const GAME_TYPES = [
    { kind: 'x01', model: () => db.x01 },
    { kind: 'cricket', model: () => db.cricket },
    { kind: 'elimination', model: () => db.elimination },
    { kind: 'clock', model: () => db.clock },
    { kind: 'rules', model: () => db.rulesGame },
];
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

// the best average only among those with some X01 games: at least this many, or a fifth of the busiest
export const AVERAGE_MIN_GAMES = 5;

/**
 * The awards from the rows of the members: [{ id, player, value }], each only
 * once someone has something to show.
 */
export const yearAwards = (rows) => {
    const played = rows.filter(row => row.games > 0);
    const best = (value, among = played) => [...among].filter(row => value(row) > 0).sort((a, b) => value(b) - value(a) || b.games - a.games)[0] ?? null;
    const awards = [];
    const add = (id, row, value) => { if (row) awards.push({ id, player: row.id, value: value(row) }); };
    const champion = best(row => row.wins);
    add('champion', champion, row => row.wins);
    add('mostGames', best(row => row.games), row => row.games);
    const enoughX01 = Math.max(AVERAGE_MIN_GAMES, Math.ceil(Math.max(0, ...played.map(row => row.x01Games)) / 5));
    add('average', best(row => (row.darts ? row.points / row.darts * 3 : 0), played.filter(row => row.x01Games >= enoughX01)), row => round(row.points / row.darts * 3, 2));
    add('oneEighties', best(row => row.oneEighties), row => row.oneEighties);
    add('checkout', best(row => row.highestCheckout), row => row.highestCheckout);
    add('clubNights', best(row => row.clubNights, rows), row => row.clubNights);
    // the lowest win rate of those who played at least half as many games as the busiest
    const enough = Math.max(1, Math.ceil(Math.max(0, ...played.map(row => row.games)) / 2));
    const spoon = played.filter(row => row.games >= enough).sort((a, b) => a.wins / a.games - b.wins / b.games || a.wins - b.wins || b.games - a.games)[0];
    if (spoon && played.length > 2 && spoon.id !== champion?.id) awards.push({ id: 'woodenSpoon', player: spoon.id, value: spoon.wins });
    return awards;
};

/**
 * The year of a club: { year, years, games: { total, byType }, players, days,
 * darts, oneEighties, clubNights, awards: [{ id, player: { id, nickname }, value }] }.
 */
export const clubYear = async (club, year, now = new Date()) => {
    const { from, to } = yearSpan(year);
    const [players, found, firsts] = await Promise.all([
        db.player.find(knownInClub(club._id), 'nickname guest').lean(),
        Promise.all(GAME_TYPES.map(type => type.model().find({ club: club._id, gameIsRunning: false, hasWinner: true, createdAt: { $gte: from, $lt: to } }).lean()
            .then(list => list.map(game => ({ kind: type.kind === 'rules' ? game.kind : type.kind, x01: type.kind === 'x01', friendly: Boolean(game.friendly), createdAt: game.createdAt, view: viewOf(type.kind === 'rules' ? game.kind : type.kind, game) }))))),
        Promise.all(GAME_TYPES.map(type => type.model().findOne({ club: club._id, hasWinner: true }, 'createdAt').sort({ createdAt: 1 }).lean())),
    ]);
    const games = found.flat();
    const members = new Map(players.filter(player => !player.guest).map(player => [String(player._id), player]));
    const rows = new Map([...members.keys()].map(id => [id, { id, games: 0, wins: 0, x01Games: 0, points: 0, darts: 0, oneEighties: 0, highestCheckout: 0, clubNights: 0 }]));

    // the figures of the club: every finished game
    const byType = {};
    const active = new Set();
    const days = new Set();
    let darts = 0;
    let oneEighties = 0;
    for (const game of games) {
        byType[game.kind] = (byType[game.kind] ?? 0) + 1;
        days.add(new Date(game.createdAt).toISOString().slice(0, 10));
        const ids = (game.view.players ?? []).map(String);
        ids.forEach(id => active.add(id));
        const winner = ids.find(id => game.view.playerModels?.[id]?.hasWonGame);
        for (const id of ids) {
            const model = game.view.playerModels?.[id] ?? {};
            const thrown = game.x01 ? model.totalThrow?.game?.darts ?? 0 : 0;
            const max = game.x01 ? model.scoreRanges?.game?.['180'] ?? 0 : 0;
            darts += thrown;
            oneEighties += max;
            // the awards: the club's own games among its members
            const row = rows.get(id);
            if (!row || game.friendly) continue;
            row.games += 1;
            if (id === winner && ids.length > 1) row.wins += 1;
            if (game.x01) {
                row.x01Games += 1;
                row.darts += thrown;
                row.points += (model.averages?.game?.overall ?? 0) * thrown / 3;
                row.oneEighties += max;
                row.highestCheckout = Math.max(row.highestCheckout, ...Object.keys(model.checkoutScores?.game ?? {}).map(Number).filter(Number.isFinite), 0);
            }
        }
    }

    // the club nights each member said they came to, up to today
    const today = now.toISOString().slice(0, 10);
    const attended = await db.attendance.find({ club: club._id, answer: 'yes', day: { $gte: `${year}-01-01`, $lte: `${year}-12-31` < today ? `${year}-12-31` : today } }, 'player day').lean();
    const nights = new Set();
    for (const entry of attended) {
        nights.add(entry.day);
        const row = rows.get(String(entry.player));
        if (row) row.clubNights += 1;
    }

    const first = firsts.filter(Boolean).map(game => game.createdAt).sort((a, b) => a - b)[0] ?? null;
    return {
        year,
        years: reviewYears(first, now),
        club: { id: String(club._id), name: club.name },
        games: { total: games.length, byType },
        players: active.size,
        days: days.size,
        darts,
        oneEighties,
        clubNights: nights.size,
        awards: yearAwards([...rows.values()]).map(award => ({ ...award, player: { id: award.player, nickname: members.get(award.player)?.nickname ?? '?' } })),
    };
};
