// What the header of a running X01 game shows besides the score: the player's
// last visit, darts and average in the current leg.

import { startingScoreOf } from './x01.rules';

/**
 * The current leg of a player: their last visit ({ score, bust } or null),
 * the darts thrown and the average per visit.
 */
export const legSummaryOf = (game, playerId) => {
    const visits = (game.currentLegThrows ?? []).filter(visit => visit.playerId === playerId);
    let left = startingScoreOf(game, playerId);
    const scores = visits.map(visit => {
        const scoreLeft = Number(visit.scoreLeft);
        const taken = Math.max(0, left - scoreLeft);
        left = scoreLeft;
        // darts that scored but took nothing off: a bust
        return { score: taken, bust: taken === 0 && Number(visit.roundScore) > 0 };
    });
    return {
        lastVisit: scores.at(-1) ?? null,
        darts: visits.reduce((sum, visit) => sum + (visit.darts?.filter(dart => String(dart).trim() !== '').length ?? 0), 0),
        average: scores.length ? scores.reduce((sum, visit) => sum + visit.score, 0) / scores.length : null,
    };
};
