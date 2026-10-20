import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { getBadge, replayBadges } from './badges.js';
import { knownInClub } from '../models/player.model.js';

export const GAME_MODELS = {
    x01: () => db.x01,
    cricket: () => db.cricket,
    elimination: () => db.elimination,
    clock: () => db.clock,
};

/**
 * Everything a player finished, in all their clubs, as events for the badge replay.
 */
export const loadPlayerEvents = async (player) => {
    const playerId = String(player._id);
    const [gamesByType, trainings] = await Promise.all([
        Promise.all(Object.entries(GAME_MODELS).map(async ([type, model]) => ({
            type,
            games: await model().find({ players: playerId, hasWinner: true }).lean(),
        }))),
        db.atc.find({ 'player.id': playerId }).lean(),
    ]);

    return [
        ...gamesByType.flatMap(({ type, games }) =>
            games.map(game => ({ type, id: String(game._id), at: game.updatedAt, data: game }))),
        ...trainings.map(entry => ({ type: 'atc', id: String(entry._id), at: entry.createdAt, data: entry })),
    ];
};

/**
 * Brings a player's stored badges up to date with their history. Badges are
 * only ever added, so deleting an old game does not take one away.
 *
 * Resolves to the newly earned badges and the player's current metrics.
 */
export const syncPlayerBadges = async (player) => {
    const { earned, metrics, shame, washes } = replayBadges(await loadPlayerEvents(player), String(player._id));
    const known = new Set((player.badges ?? []).map(entry => entry.badge));
    const fresh = earned.filter(entry => !known.has(entry.badge));
    const activity = { lastWeek: metrics.lastWeek, weekStreak: metrics.weekStreak, bestWeekStreak: metrics.bestWeekStreak };
    const activityChanged = Object.entries(activity).some(([key, value]) => player.activity?.[key] !== value);

    // the Hall of Shame follows the games as they are now: a deleted game takes its shame along
    const shameKey = (entries) => JSON.stringify(entries.map(({ badge, at, count, sourceId }) => [badge, new Date(at).getTime(), count, sourceId]));
    const shameChanged = shameKey(player.shame ?? []) !== shameKey(shame) || shameKey(player.shameWashes ?? []) !== shameKey(washes);

    if (fresh.length > 0) player.badges.push(...fresh);
    if (activityChanged) player.activity = activity;
    if (shameChanged) {
        player.shame = shame;
        player.shameWashes = washes;
    }
    if (fresh.length > 0 || activityChanged || shameChanged) await player.save();
    if (fresh.length > 0) {
        logger.info(`${player.nickname} earned ${fresh.map(entry => entry.badge).join(', ')}`);
    }
    return { newBadges: fresh.map(entry => getBadge(entry.badge)), metrics };
};

/**
 * Updates the badges of everyone who played a finished game. Failures are
 * logged, never thrown: a badge must not get in the way of saving a game.
 */
export const syncGameBadges = async (clubId, game) => {
    try {
        const ids = (game.players ?? []).filter(id => db.mongoose.isValidObjectId(id));
        const players = await db.player.find({ _id: { $in: ids }, ...knownInClub(clubId), guest: { $ne: true } });
        for (const player of players) await syncPlayerBadges(player);
    } catch (err) {
        logger.error(err, 'Failed to update badges after a game');
    }
};

/**
 * Deletes a game or training and takes back the badges earned in it (they
 * come back if the player earned them again elsewhere); its fair play review
 * goes along. type: a key of GAME_MODELS or 'training'. Resolves to the
 * players concerned.
 */
export const removeWithBadges = async (type, doc) => {
    const id = String(doc._id);
    const playerIds = (type === 'training' ? [doc.player?.id] : (doc.players ?? []).map(String))
        .filter(playerId => playerId && db.mongoose.isValidObjectId(playerId));
    await doc.deleteOne();
    await db.integrityReview.deleteMany({ sourceType: type, sourceId: id });
    const players = await db.player.find({ _id: { $in: playerIds } });
    for (const player of players) {
        const before = player.badges.length;
        player.badges = player.badges.filter(entry => entry.sourceId !== id);
        if (player.badges.length !== before) await player.save();
        await syncPlayerBadges(player);
    }
    return players;
};
