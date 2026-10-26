import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { countBadges, getBadge, replayBadges } from './badges.js';
import { knownInClub } from '../models/player.model.js';
import { isRulesGame } from './rules.kinds.js';
import { viewOf } from './game.view.js';
import { syncClubAfterGame } from './club.badge.service.js';
import { levelInputs, playerLevel } from './levels.js';
import { progressNotices, tellPlayer } from './player.notices.js';

export const GAME_MODELS = {
    x01: () => db.x01,
    cricket: () => db.cricket,
    elimination: () => db.elimination,
    clock: () => db.clock,
    // the games of the rules engine: each by its kind (shanghai, killer, …)
    rules: () => db.rulesGame,
};

// the model of a game by its type; the games of the rules engine by their kind
export const gameModelOf = (type) => GAME_MODELS[type] ?? (isRulesGame(type) ? GAME_MODELS.rules : null);

/**
 * Everything a player finished, in all their clubs, as events for the badge replay.
 */
export const loadPlayerEvents = async (player) => {
    const playerId = String(player._id);
    const [gamesByType, trainings, rulesTrainings, finals] = await Promise.all([
        Promise.all(Object.entries(GAME_MODELS).map(async ([type, model]) => ({
            type,
            games: await model().find({ players: playerId, hasWinner: true }).lean(),
        }))),
        db.atc.find({ 'player.id': playerId }).lean(),
        db.rulesTraining.find({ 'player.id': playerId }).lean(),
        // the finals of tournaments the player reached
        db.tournament.find({ status: 'finished', matches: { $elemMatch: { size: 2, players: playerId } } }, 'winner finishedAt').lean(),
    ]);

    return [
        ...gamesByType.flatMap(({ type, games }) =>
            // X01 & co. with their legs and visits, worked out from the stored visits
            games.map(game => ({ type: type === 'rules' ? game.kind : type, id: String(game._id), at: game.updatedAt, data: viewOf(type, game) }))),
        ...trainings.map(entry => ({ type: 'atc', id: String(entry._id), at: entry.createdAt, data: entry })),
        ...rulesTrainings.map(entry => ({ type: 'rulesTraining', id: String(entry._id), at: entry.createdAt, data: entry })),
        ...finals.map(entry => ({ type: 'tournament', id: String(entry._id), at: entry.finishedAt, data: { won: entry.winner === playerId } })),
    ];
};

// the level of a player from their events (as their statistics show it)
const levelOfEvents = (player, events) => playerLevel(levelInputs({
    x01Games: events.filter(event => event.type === 'x01').map(event => event.data),
    cricketGames: events.filter(event => event.type === 'cricket').map(event => event.data),
    eliminationGames: events.filter(event => event.type === 'elimination').map(event => event.data),
    clockGames: events.filter(event => event.type === 'clock').map(event => event.data),
    rulesGames: events.filter(event => isRulesGame(event.type)).map(event => event.data),
    playerId: String(player._id),
    badgeCount: countBadges(player.badges),
})).level;

/**
 * Brings a player's stored badges up to date with their history. Badges are
 * only ever added, so deleting an old game does not take one away.
 * With "notify" (after a game or training just played) the player hears
 * about new badges, the Hall of Shame and a new level.
 *
 * Resolves to the newly earned badges and the player's current metrics.
 */
export const syncPlayerBadges = async (player, { notify = false } = {}) => {
    const events = await loadPlayerEvents(player);
    const { earned, metrics, shame, washes } = replayBadges(events, String(player._id), { privateTrainings: Boolean(player.privateTrainings) });
    const shameBefore = [...(player.shame ?? [])];
    const washesBefore = [...(player.shameWashes ?? [])];
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
    // a new level: told from the second one on (the first time it is only noted)
    let newLevel = null;
    let levelChanged = false;
    if (notify) {
        const level = levelOfEvents(player, events);
        if (player.notifiedLevel == null || level.index > player.notifiedLevel) {
            if (player.notifiedLevel != null) newLevel = level;
            player.notifiedLevel = level.index;
            levelChanged = true;
        }
        // the highest level reached keeps the shirts it opened
        if (level.index > (player.bestLevel ?? 0)) {
            player.bestLevel = level.index;
            levelChanged = true;
        }
    }
    if (fresh.length > 0 || activityChanged || shameChanged || levelChanged) await player.save();
    if (fresh.length > 0) {
        logger.info(`${player.nickname} earned ${fresh.map(entry => entry.badge).join(', ')}`);
    }
    if (notify) {
        await tellPlayer(player, progressNotices(player, { fresh, shameBefore, shameAfter: shame, washesBefore, washesAfter: washes, level: newLevel }));
    }
    return { newBadges: fresh.map(entry => getBadge(entry.badge)), metrics };
};

/**
 * Updates the badges of everyone who played a finished game, and with its
 * type ("x01", … or the kind of a newer game) those of the club. Failures are
 * logged, never thrown: a badge must not get in the way of saving a game.
 * Resolves to the club badges the game earned.
 */
export const syncGameBadges = async (clubId, game, type = null) => {
    try {
        const ids = (game.players ?? []).filter(id => db.mongoose.isValidObjectId(id));
        const players = await db.player.find({ _id: { $in: ids }, ...knownInClub(clubId), guest: { $ne: true } });
        for (const player of players) await syncPlayerBadges(player, { notify: true });
    } catch (err) {
        logger.error(err, 'Failed to update badges after a game');
    }
    return type ? syncClubAfterGame(clubId, type, game) : [];
};

/**
 * Deletes a game or training and takes back the badges earned in it (they
 * come back if the player earned them again elsewhere); its fair play review
 * goes along. type: a key of GAME_MODELS or 'training'. Resolves to the
 * players concerned.
 */
export const removeWithBadges = async (type, doc) => {
    const id = String(doc._id);
    const playerIds = (type === 'training' || type === 'rulesTraining' ? [doc.player?.id] : (doc.players ?? []).map(String))
        .filter(playerId => playerId && db.mongoose.isValidObjectId(playerId));
    await doc.deleteOne();
    await db.integrityReview.deleteMany({ sourceType: type, sourceId: id });
    // what it added to the club goes too (the club keeps the badges it earned)
    await db.clubTally.deleteOne({ sourceId: id });
    const players = await db.player.find({ _id: { $in: playerIds } });
    for (const player of players) {
        const before = player.badges.length;
        player.badges = player.badges.filter(entry => entry.sourceId !== id);
        if (player.badges.length !== before) await player.save();
        await syncPlayerBadges(player);
    }
    return players;
};
