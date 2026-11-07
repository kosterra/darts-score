import db from '../models/db.model.js';

/**
 * The games of the matches of a tournament or a league, looked up in one
 * query, for the app to show with each match: the level each player played
 * at (playLevels, as the game keeps them; [] when none was judged) and, for
 * a match going on, the score so far (live: the legs, and the sets when
 * played in sets, in the order of the match's players). A match without a
 * game (to come, a walkover, a bye) is left as it is.
 */
export const withMatchGames = async (matches = []) => {
    const ids = [...new Set(matches.filter(match => match.game).map(match => String(match.game)))];
    if (!ids.length) return matches;
    const games = await db.x01.find({ _id: { $in: ids } }, 'playLevels playerModels numberOfSets').lean();
    const byId = new Map(games.map(game => [String(game._id), game]));
    return matches.map(match => {
        const game = match.game ? byId.get(String(match.game)) : null;
        if (!game) return match;
        const playLevels = (game.playLevels ?? [])
            .filter(entry => match.players.includes(String(entry.player)))
            .map(entry => ({ player: String(entry.player), level: entry.level }));
        if (match.status !== 'running') return { ...match, playLevels };
        const models = game.playerModels ?? {};
        const inSets = game.numberOfSets > 1;
        const live = {
            legs: match.players.map(id => (inSets ? models[id]?.currentSetLegsWon : models[id]?.legsWon?.game) ?? 0),
            ...(inSets ? { sets: match.players.map(id => models[id]?.setsWon ?? 0) } : {}),
        };
        return { ...match, playLevels, live };
    });
};
