import { visitPoints } from '../../rules/x01';

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
    return visits.slice(seen).map((visit, index, fresh) => {
        const points = visitPoints(visit.darts ?? [], after.bull);
        if (index < fresh.length - 1) return { playerId: visit.player, points, busted: false, wonLeg: false, wonSet: false, wonMatch: false };
        const left = before.playerModels?.[visit.player]?.score;
        const legChanged = after.currentSetLeg !== before.currentSetLeg || after.currentSet !== before.currentSet || Boolean(after.hasWinner);
        const wonLeg = legChanged && points === left;
        const busted = !wonLeg && points > 0 && after.playerModels?.[visit.player]?.score === left;
        return {
            playerId: visit.player,
            points: busted ? 0 : points,
            busted,
            wonLeg,
            wonSet: wonLeg && after.currentSet !== before.currentSet,
            wonMatch: wonLeg && Boolean(after.hasWinner),
        };
    });
};
