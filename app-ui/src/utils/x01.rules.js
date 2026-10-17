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
