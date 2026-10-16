// How a player is doing in a running X01 game: every visit's score in order,
// recent and overall averages, and whether they are getting better or worse.

const RECENT_VISITS = 3;
const TREND_VISITS = 5;
// points of 3-dart average a player must be above or below their game average to count as a trend
const TREND_MARGIN = 5;

const numbered = (key, prefix) => Number(String(key).replace(prefix, ''));

/**
 * The legs of a game in the order they were played, the running one last:
 * [{ set, leg, throws }]. Keys other than "set-<n>" / "leg-<n>" are ignored.
 */
const legsInOrder = (game) => {
    const legs = [];
    Object.entries(game.allSetsThrows ?? {})
        .filter(([setKey, legsOfSet]) => /^set-\d+$/.test(setKey) && legsOfSet && typeof legsOfSet === 'object' && !Array.isArray(legsOfSet))
        .sort(([a], [b]) => numbered(a, 'set-') - numbered(b, 'set-'))
        .forEach(([setKey, legsOfSet]) => Object.entries(legsOfSet)
            .filter(([legKey, throws]) => /^leg-\d+$/.test(legKey) && Array.isArray(throws))
            .sort(([a], [b]) => numbered(a, 'leg-') - numbered(b, 'leg-'))
            .forEach(([legKey, throws]) => legs.push({ set: numbered(setKey, 'set-'), leg: numbered(legKey, 'leg-'), throws })));
    legs.push({ set: game.currentSet, leg: game.currentSetLeg, throws: game.currentLegThrows ?? [], running: true });
    return legs;
};

/**
 * Every visit of a player, in order: { score, set, leg, running }. The score is
 * what the visit really took off, so a busted visit counts as 0.
 */
export const visitsOf = (game, playerId) => {
    const visits = [];
    for (const { set, leg, throws, running } of legsInOrder(game)) {
        let left = Number(game.startingScore);
        for (const visit of throws) {
            if (visit.playerId !== playerId) continue;
            const scoreLeft = Number(visit.scoreLeft);
            visits.push({ score: Math.max(0, left - scoreLeft), set, leg, running: !!running });
            left = scoreLeft;
        }
    }
    return visits;
};

const average = (scores) => scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;

/**
 * A player's form: recent average (last 3 visits), leg and game average, and
 * the trend: "up" or "down" when the last 5 visits are clearly above or below
 * the game average, "steady" otherwise, null with too few visits.
 */
export const formOf = (game, playerId) => {
    const visits = visitsOf(game, playerId);
    const scores = visits.map(visit => visit.score);
    const gameAverage = average(scores);
    const recent = scores.slice(-RECENT_VISITS);
    const legScores = visits.filter(visit => visit.running).map(visit => visit.score);

    let trend = null;
    if (scores.length >= TREND_VISITS + 1) {
        const difference = average(scores.slice(-TREND_VISITS)) - gameAverage;
        trend = difference > TREND_MARGIN ? 'up' : difference < -TREND_MARGIN ? 'down' : 'steady';
    }

    return {
        visits: visits.map((visit, index) => ({
            ...visit,
            index: index + 1,
            // the average of this and the two visits before, the line the chart draws
            rolling: average(scores.slice(Math.max(0, index - RECENT_VISITS + 1), index + 1)),
        })),
        recentAverage: recent.length ? average(recent) : null,
        legAverage: average(legScores),
        gameAverage,
        trend,
    };
};
