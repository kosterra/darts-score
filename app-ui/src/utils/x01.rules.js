// The rules a player plays an X01 game by. With a handicap each player may
// have their own starting score and in/out mode (kept in their player model);
// without one, the game's settings apply to everyone.

const own = (game, playerId) => game?.playerModels?.[playerId] ?? {};

export const startingScoreOf = (game, playerId) => Number(own(game, playerId).startingScore ?? game?.startingScore);

export const inModeOf = (game, playerId) => own(game, playerId).legInMode ?? game?.legInMode;

export const outModeOf = (game, playerId) => own(game, playerId).legOutMode ?? game?.legOutMode;

export const rulesOf = (game, playerId) => ({
    startingScore: startingScoreOf(game, playerId),
    legInMode: inModeOf(game, playerId),
    legOutMode: outModeOf(game, playerId),
});

// whether the players do not all play by the game's settings
export const hasHandicap = (game) => (game?.players ?? []).some(playerId => {
    const rules = rulesOf(game, playerId);
    return rules.startingScore !== Number(game.startingScore)
        || rules.legInMode !== game.legInMode
        || rules.legOutMode !== game.legOutMode;
});

const MODE_SHORT = {
    'Straight In': 'SI', 'Double In': 'DI', 'Master In': 'MI',
    'Straight Out': 'SO', 'Double Out': 'DO', 'Master Out': 'MO',
};

// e.g. "301 · SI/SO"
export const describeRules = ({ startingScore, legInMode, legOutMode }) =>
    `${startingScore} · ${MODE_SHORT[legInMode] ?? legInMode}/${MODE_SHORT[legOutMode] ?? legOutMode}`;

/**
 * Whether what is left after the darts of the visit so far is a bust: below
 * zero, or with double (master) out a rest of 1 or a finish on the wrong
 * dart. A rest of 0 without a dart in this visit is no bust: that is the
 * player who has just won, while the game shows its end.
 */
export const isBust = (score, currentThrow = [], outMode = 'Double Out') => {
    if (score < 0) return true;
    const thrown = currentThrow.filter(dart => dart && String(dart).trim() !== '');
    const last = String(thrown.at(-1) ?? '').toUpperCase();
    if (outMode === 'Double Out') return score === 1 || (score === 0 && thrown.length > 0 && !last.startsWith('D'));
    if (outMode === 'Master Out') return score === 1 || (score === 0 && thrown.length > 0 && !/^[DT]/.test(last));
    return false;
};

