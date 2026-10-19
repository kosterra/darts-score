// How a player finishes and scores, learned from their X01 games, with what
// they set themselves taking precedence: the doubles they hit best and the
// treble they throw at most.

export const DOUBLES = [...Array.from({ length: 20 }, (_, index) => `D${index + 1}`), 'D25'];
export const MAIN_TREBLES = ['T20', 'T19', 'T18'];

// darts at doubles before the learned order counts, and per double before it is ranked
const MIN_DOUBLE_DARTS = 20;
const MIN_DARTS_PER_DOUBLE = 5;
// hits in the 20 and the 19 bed before the main treble is learned, and how clearly the 19 must lead
const MIN_BED_HITS = 60;
const T19_LEAD = 1.3;

const model = (game, playerId) => game.playerModels?.[playerId] ?? {};

/**
 * The player's checkout profile from their X01 games and preferences:
 * { doubles: [{ double, hit, total, rate }] best first, doubleDarts,
 *   doubleOrder (the doubles to finish on, best first), favouriteDouble,
 *   doubleSource ('set' | 'history' | null), mainTreble, trebleSource,
 *   learnedDouble, learnedTreble (what the games say, whatever was set) }
 */
export const checkoutProfile = (games, playerId, preferences = {}) => {
    const totals = new Map();
    let doubleDarts = 0;
    const beds = { 20: 0, 19: 0 };

    for (const game of games) {
        const playerModel = model(game, playerId);
        for (const [section, figures] of Object.entries(playerModel.checkout?.sections ?? {})) {
            const total = Number(figures?.total) || 0;
            if (!total) continue;
            const name = `D${section}`;
            const entry = totals.get(name) ?? { double: name, hit: 0, total: 0 };
            entry.hit += Number(figures.hit) || 0;
            entry.total += total;
            totals.set(name, entry);
            doubleDarts += total;
        }
        for (const [field, count] of Object.entries(playerModel.hit ?? {})) {
            const bed = Number(field.slice(1));
            if (bed === 20 || bed === 19) beds[bed] += Number(count) || 0;
        }
    }

    // the hit rate, pulled a little towards the middle so a few lucky darts do not lead
    const doubles = [...totals.values()]
        .filter(entry => entry.total >= MIN_DARTS_PER_DOUBLE && entry.hit > 0)
        .map(entry => ({ ...entry, rate: Math.round(entry.hit / entry.total * 1000) / 10, score: (entry.hit + 1) / (entry.total + 4) }))
        .sort((a, b) => b.score - a.score || b.total - a.total)
        .map(({ score: _score, ...entry }) => entry);
    const learned = doubleDarts >= MIN_DOUBLE_DARTS ? doubles.map(entry => entry.double) : [];

    const setDouble = DOUBLES.includes(preferences.favouriteDouble) ? preferences.favouriteDouble : null;
    const doubleOrder = setDouble ? [setDouble, ...learned.filter(double => double !== setDouble)] : learned;

    const setTreble = MAIN_TREBLES.includes(preferences.mainTreble) ? preferences.mainTreble : null;
    const learnedTreble = beds[20] + beds[19] >= MIN_BED_HITS
        ? (beds[19] >= beds[20] * T19_LEAD ? 'T19' : 'T20')
        : null;

    return {
        doubles,
        doubleDarts,
        doubleOrder,
        favouriteDouble: doubleOrder[0] ?? null,
        doubleSource: setDouble ? 'set' : learned.length ? 'history' : null,
        mainTreble: setTreble ?? learnedTreble,
        trebleSource: setTreble ? 'set' : learnedTreble ? 'history' : null,
        learnedDouble: learned[0] ?? null,
        learnedTreble,
    };
};
