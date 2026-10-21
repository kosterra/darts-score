/**
 * The figures of a player's X01 form, from the visits of a few games: how
 * often they check out, score a ton or more, throw a weak visit, and how many
 * darts a won leg takes. The visits on the way to a finish (100 or less left)
 * do not count as scoring visits: there a small score is the plan.
 */

const round1 = (value) => Math.round(value * 10) / 10;
const share = (count, total) => total ? round1(count / total * 100) : null;
const SCORING_FROM = 100;

// the visits of every leg of the game: [[visit, …], …]
const legsOf = (game) => Object.values(game.allSetsThrows ?? {})
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
        for (const leg of legsOf(game)) {
            const own = leg.filter(visit => visit?.playerId === playerId);
            own.forEach((visit, index) => {
                const score = Number(visit.roundScore) || 0;
                const before = (Number(visit.scoreLeft) || 0) + score;
                // a bust scores nothing, though its darts did
                const bust = score === 0 && (visit.darts ?? []).some(dart => dartValue(dart) > 0);
                visits += 1;
                if (score === 180) oneEighties += 1;
                if (index < 3) {
                    firstNineScore += score;
                    firstNineVisits += 1;
                }
                if (before > SCORING_FROM) {
                    for (const dart of visit.darts ?? []) {
                        scoringDarts += 1;
                        if (/^[SDT](1|5)$/.test(String(dart))) oneOrFive += 1;
                    }
                }
                if (before > SCORING_FROM && !bust) {
                    scoring += 1;
                    if (score >= 100) tons += 1;
                    for (const limit of [10, 30, 50]) if (score < limit) under[limit] += 1;
                }
            });
            const last = own.at(-1);
            if (last && Number(last.scoreLeft) === 0) {
                legsWon += 1;
                wonDarts += own.reduce((sum, visit) => sum + (visit.darts?.length || 3), 0);
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
        dartsPerLeg: legsWon ? round1(wonDarts / legsWon) : null,
        legsWon,
        firstNine: firstNineVisits ? round1(firstNineScore / firstNineVisits) : null,
        oneEighties,
    };
};
