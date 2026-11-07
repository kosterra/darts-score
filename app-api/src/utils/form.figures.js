import { withView } from './game.view.js';
import { thrownDarts } from './badges.js';
import { legScores, legWinnerOf, partnersOf } from '../rules/x01.js';

/**
 * The figures of a player's X01 form, from the visits of a few games: how
 * often they check out, score a ton or more, throw a weak visit, and how many
 * darts a won leg takes. The visits on the way to a finish (100 or less left)
 * do not count as scoring visits: there a small score is the plan. A bust
 * scores nothing, and the darts of a leg are those thrown (not the empty
 * places after a checkout).
 */

const round1 = (value) => Math.round(value * 10) / 10;
const share = (count, total) => total ? round1(count / total * 100) : null;
const SCORING_FROM = 100;

// the visits of every leg of the game: [[visit, …], …]
const legsOf = (game) => Object.values(withView('x01', game).allSetsThrows ?? {})
    .flatMap(set => Object.values(set ?? {}))
    .filter(Array.isArray);

const dartValue = (dart) => {
    const match = /^([SDT])(\d+)$/.exec(String(dart ?? ''));
    return match ? { S: 1, D: 2, T: 3 }[match[1]] * Number(match[2]) : 0;
};

/**
 * → { games, visits, checkoutRate, checkoutHits, checkoutAttempts, tonPlus, under10, under30, under50,
 *     oneOrFive, dartsPerLeg, legsWon, firstNine, oneEighties } (rates in %, null without visits)
 */
export const formFigures = (games, playerId) => {
    let hits = 0;
    let attempts = 0;
    let scoring = 0;
    let tons = 0;
    const under = { 10: 0, 30: 0, 50: 0 };
    let wonDarts = 0;
    let legsWon = 0;
    let checkedOut = 0;
    let firstNineScore = 0;
    let firstNineVisits = 0;
    let oneEighties = 0;
    let visits = 0;
    // the darts of the scoring visits, and those of them in the 1 or the 5, next to the 20
    let scoringDarts = 0;
    let oneOrFive = 0;

    for (const game of games) {
        const checkout = game.playerModels?.[playerId]?.checkout?.game;
        hits += checkout?.hit ?? 0;
        attempts += checkout?.total ?? 0;
        const team = [playerId, ...partnersOf(game, playerId)];
        for (const leg of legsOf(game)) {
            // what each visit took off (0 for a bust), from what was left before it (in doubles the team's score)
            const own = legScores(game, leg).filter(({ visit }) => visit?.playerId === playerId);
            own.forEach(({ visit, before, taken }, index) => {
                const darts = thrownDarts(visit.darts);
                // a bust scores nothing, though its darts did
                const bust = taken === 0 && darts.some(dart => dartValue(dart) > 0);
                visits += 1;
                if (taken === 180) oneEighties += 1;
                if (index < 3) {
                    firstNineScore += taken;
                    firstNineVisits += 1;
                }
                if (before > SCORING_FROM) {
                    for (const dart of darts) {
                        scoringDarts += 1;
                        if (/^[SDT](1|5)$/.test(String(dart))) oneOrFive += 1;
                    }
                }
                if (before > SCORING_FROM && !bust) {
                    scoring += 1;
                    if (taken >= 100) tons += 1;
                    for (const limit of [10, 30, 50]) if (taken < limit) under[limit] += 1;
                }
            });
            // the winner as the rules count it (a club's round limit decides some legs without a checkout)
            if (!own.length || !team.includes(legWinnerOf(game, leg))) continue;
            legsWon += 1;
            // the darts of a leg the player checked out alone (in doubles they are the team's)
            if (team.length === 1 && own.at(-1).scoreLeft === 0) {
                checkedOut += 1;
                wonDarts += own.reduce((sum, { visit }) => sum + thrownDarts(visit.darts).length, 0);
            }
        }
    }

    return {
        games: games.length,
        visits,
        checkoutRate: share(hits, attempts),
        checkoutHits: hits,
        checkoutAttempts: attempts,
        tonPlus: share(tons, scoring),
        under10: share(under[10], scoring),
        under30: share(under[30], scoring),
        under50: share(under[50], scoring),
        oneOrFive: share(oneOrFive, scoringDarts),
        dartsPerLeg: checkedOut ? round1(wonDarts / checkedOut) : null,
        legsWon,
        firstNine: firstNineVisits ? round1(firstNineScore / firstNineVisits) : null,
        oneEighties,
    };
};
