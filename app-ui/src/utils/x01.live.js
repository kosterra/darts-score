// What the header of a running X01 game shows besides the score: the player's
// last visit, darts and average in the current leg.

import { legScores } from '../rules/x01';

/**
 * The current leg of a player: their last visit ({ score, bust } or null),
 * the darts thrown and the average per visit.
 */
export const legSummaryOf = (game, playerId) => {
    // one player, or several (a team in doubles)
    const ids = [].concat(playerId);
    const visits = (game.currentLegThrows ?? []).filter(visit => ids.includes(visit.playerId));
    // (in doubles from the team's score, which the partner's visits take off too)
    const scores = legScores(game, game.currentLegThrows).filter(({ visit }) => ids.includes(visit.playerId))
        // darts that scored but took nothing off: a bust
        .map(({ visit, taken }) => ({ score: taken, bust: taken === 0 && Number(visit.roundScore) > 0 }));
    return {
        lastVisit: scores.at(-1) ?? null,
        darts: visits.reduce((sum, visit) => sum + (visit.darts?.filter(dart => String(dart).trim() !== '').length ?? 0), 0),
        average: scores.length ? scores.reduce((sum, visit) => sum + visit.score, 0) / scores.length : null,
    };
};

/**
 * Doubles: who of a team throws next, from the player at the oche on in the
 * order of the game (the teams and partners take turns). → a player id
 */
export const nextOfTeam = (game, team) => {
    const players = game.players ?? [];
    const from = Math.max(0, players.indexOf(game.currentPlayerTurn));
    for (let step = 0; step < players.length; step++) {
        const id = players[(from + step) % players.length];
        if (team.includes(id)) return id;
    }
    return team[0];
};
