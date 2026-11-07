import { LEVELS } from '../rules/levels.play.js';

/**
 * The level every player played a game or training at, worked out by the API
 * when it is saved (utils/play.levels.js): [{ player, level }], only players
 * with enough darts to judge. Indexed for the lists' filter by level.
 */
export const addPlayLevels = (schema) => {
  schema.add({
    playLevels: { type: [{ _id: false, player: String, level: { type: String, enum: LEVELS } }], default: undefined },
  });
  schema.index({ 'playLevels.level': 1 });
};
