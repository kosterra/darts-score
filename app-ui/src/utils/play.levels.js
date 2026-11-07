/**
 * The level a player played a game or training at, as the API keeps it with
 * the game ("playLevels": [{ player, level }], see app-api utils/play.levels.js):
 * the estimate for PlayLevelTag ({ level }), or null without one.
 */
export const playLevelOf = (item, playerId) => {
    const level = (item?.playLevels ?? []).find(entry => String(entry.player) === String(playerId))?.level;
    return level ? { level } : null;
};

/**
 * The query string of the filter by level ('all' for none): with the player
 * the list is filtered to, the games that player played at that level.
 */
export const levelQuery = (level, playerId = null) => {
    if (!level || level === 'all') return '';
    const params = new URLSearchParams({ level });
    if (playerId) params.set('player', playerId);
    return `?${params}`;
};
