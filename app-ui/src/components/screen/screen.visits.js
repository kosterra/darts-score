import { replayX01, visitPoints } from '../../rules/x01';

// the game without its last visit, by the rules; null when it cannot be worked out
const priorTo = (game) => {
    try {
        return replayX01({ ...game, visits: game.visits.slice(0, -1) });
    } catch {
        return null;
    }
};

/**
 * The visits a big screen has not seen yet, from the game as it was and as it
 * is: [{ playerId, points, busted, wonLeg, wonSet, wonMatch }]. An undo (fewer
 * visits) gives none.
 */
export const newVisits = (before, after) => {
    if (!before || !after) return [];
    const seen = before.visits?.length ?? 0;
    const visits = after.visits ?? [];
    if (visits.length <= seen) return [];
    // what changed is told for the last visit only; earlier ones (a screen that fell behind) just by their points
    const plain = (visit, points) => ({ playerId: visit.player, points, busted: false, wonLeg: false, wonSet: false, wonMatch: false });
    return visits.slice(seen).map((visit, index, fresh) => {
        const points = visitPoints(visit.darts ?? [], after.bull);
        if (index < fresh.length - 1) return plain(visit, points);
        // the game just before the last visit: when the screen fell several behind, worked out from the visits
        const prior = fresh.length > 1 ? priorTo(after) : before;
        if (!prior) return plain(visit, points);
        const left = prior.playerModels?.[visit.player]?.score;
        const legChanged = after.currentSetLeg !== prior.currentSetLeg || after.currentSet !== prior.currentSet || Boolean(after.hasWinner);
        const wonLeg = legChanged && points === left;
        const busted = !wonLeg && points > 0 && after.playerModels?.[visit.player]?.score === left;
        return {
            playerId: visit.player,
            points: busted ? 0 : points,
            busted,
            wonLeg,
            wonSet: wonLeg && after.currentSet !== prior.currentSet,
            wonMatch: wonLeg && Boolean(after.hasWinner),
        };
    });
};
