// The rules a player plays an X01 game by: with a handicap each player may
// have their own starting score and in/out mode in their player model,
// otherwise the game's settings apply.

const own = (game, playerId) => game?.playerModels?.[playerId] ?? {};

export const startingScoreOf = (game, playerId) => Number(own(game, playerId).startingScore ?? game?.startingScore);

export const inModeOf = (game, playerId) => own(game, playerId).legInMode ?? game?.legInMode;

export const outModeOf = (game, playerId) => own(game, playerId).legOutMode ?? game?.legOutMode;
