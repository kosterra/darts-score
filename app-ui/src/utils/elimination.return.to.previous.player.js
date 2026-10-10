/**
 * Reverts the last completed throw in an Elimination game.
 * Mutates and returns the game object for use with the RETURN_PREV_PLAYER dispatch.
 */
const EliminationReturnToPreviousPlayer = (game) => {
    // Clone to avoid direct mutation of the state reference
    const newGame = JSON.parse(JSON.stringify(game));

    if (!newGame.allThrows || newGame.allThrows.length === 0) return newGame;

    const prevThrow = newGame.allThrows[newGame.allThrows.length - 1];
    newGame.allThrows = newGame.allThrows.slice(0, -1);

    const { playerId, darts, roundScore } = prevThrow;

    // Restore previous player turn
    newGame.currentPlayerTurn = playerId;

    // Restore the dart inputs so the player can see what they threw
    newGame.currentThrow = [...darts];

    // Restore player score
    const playerModel = newGame.playerModels[playerId];
    if (playerModel) {
        playerModel.score = Math.max(0, (playerModel.score ?? 0) - roundScore);

        // Update totalThrow stats
        if (playerModel.totalThrow) {
            const dartCount = darts.filter(d => d && d.trim() !== '').length;
            playerModel.totalThrow.darts = Math.max(0, (playerModel.totalThrow.darts ?? 0) - dartCount);
            playerModel.totalThrow.rounds = Math.max(0, (playerModel.totalThrow.rounds ?? 0) - 1);
        }

        // Update bestThreeDarts: recalculate from remaining throws for this player
        const playerThrows = newGame.allThrows.filter(t => t.playerId === playerId);
        playerModel.bestThreeDarts = playerThrows.length > 0
            ? Math.max(...playerThrows.map(t => t.roundScore))
            : 0;

        // Update scoreRanges: remove the entry for the reverted throw
        if (playerModel.scoreRanges) {
            const label = getScoreRangeLabel(roundScore);
            if (label && playerModel.scoreRanges[label] > 0) {
                playerModel.scoreRanges[label]--;
                if (playerModel.scoreRanges[label] === 0) {
                    delete playerModel.scoreRanges[label];
                }
            }
        }
    }

    // If the eliminated player's score was reset because of this throw, we can't
    // easily restore it — so we just leave it. This edge case is documented.

    return newGame;
};

const getScoreRangeLabel = (score) => {
    if (score === 0) return '0';
    if (score === 180) return '180';
    if (score >= 1 && score <= 40) return '1-40';
    if (score >= 41 && score <= 60) return '41-60';
    if (score >= 61 && score <= 80) return '61-80';
    if (score >= 81 && score <= 100) return '81-100';
    if (score >= 101 && score <= 120) return '101-120';
    if (score >= 121 && score <= 140) return '121-140';
    if (score >= 141 && score <= 160) return '141-160';
    if (score >= 161 && score <= 180) return '161-180';
    return null;
};

export { getScoreRangeLabel };
export default EliminationReturnToPreviousPlayer;
