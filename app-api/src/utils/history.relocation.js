import logger from '../models/logger.model.js';
import db from '../models/db.model.js';

// the games that can follow their players to another club
const GAME_MODELS = [() => db.x01, () => db.cricket, () => db.elimination, () => db.clock, () => db.rulesGame];

const same = (a, b) => String(a) === String(b);

/**
 * Where a game played in "fromClub" belongs now: the one club all its players
 * are members of, once none of them is a member of "fromClub" any more; null
 * when it stays (someone is still there, a player is gone, or they share no
 * club or more than one).
 * players: the game's players as stored, each { clubs } or null when deleted.
 */
export const targetClubOf = (players, fromClub) => {
    if (!players.length || players.some(player => !player)) return null;
    if (players.some(player => (player.clubs ?? []).some(club => same(club, fromClub)))) return null;
    const [first, ...others] = players;
    const shared = (first.clubs ?? []).filter(club => others.every(player => (player.clubs ?? []).some(other => same(other, club))));
    return shared.length === 1 ? shared[0] : null;
};

/**
 * Where a training of a player who left "fromClub" belongs now: their only
 * club, or null (still a member there, or in several clubs).
 */
export const targetClubOfTraining = (player, fromClub) => {
    const clubs = player?.clubs ?? [];
    if (clubs.some(club => same(club, fromClub)) || clubs.length !== 1) return null;
    return clubs[0];
};

/**
 * Moves the games and trainings of these players that were played in clubs
 * they have left, where the rules above say so. Resolves to { games, trainings }
 * moved. Never throws: moving history must not get in the way of the move itself.
 */
export const relocateHistory = async (playerIds) => {
    const moved = { games: 0, trainings: 0 };
    try {
        const players = await db.player.find({ _id: { $in: playerIds } }, 'clubs formerClubs nickname').lean();
        for (const player of players) {
            const id = String(player._id);
            for (const fromClub of player.formerClubs ?? []) {
                for (const model of GAME_MODELS) {
                    const games = await model().find({ club: fromClub, players: id }, 'players club').lean();
                    for (const game of games) {
                        const ids = (game.players ?? []).map(String);
                        const found = await db.player.find({ _id: { $in: ids.filter(other => db.mongoose.isValidObjectId(other)) } }, 'clubs').lean();
                        const byId = new Map(found.map(other => [String(other._id), other]));
                        const target = targetClubOf(ids.map(other => byId.get(other) ?? null), fromClub);
                        if (!target) continue;
                        // straight on the collection: the game keeps its own timestamps
                        await model().collection.updateOne({ _id: game._id }, { $set: { club: target } });
                        moved.games += 1;
                    }
                }
                const target = targetClubOfTraining(player, fromClub);
                if (target) {
                    for (const model of [db.atc, db.rulesTraining]) {
                        const { modifiedCount } = await model.collection.updateMany({ club: fromClub, 'player.id': id }, { $set: { club: target } });
                        moved.trainings += modifiedCount;
                    }
                }
            }
        }
        if (moved.games || moved.trainings) logger.info(`Moved ${moved.games} games and ${moved.trainings} trainings along with their players`);
    } catch (err) {
        logger.error(err, 'Failed to move the history of moved players');
    }
    return moved;
};
