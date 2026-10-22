import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { storedOf } from './game.view.js';

/**
 * Moves the games of X01 (and the trainings against the bot), Cricket,
 * Elimination and Around the Clock, and the quick games, to visits: a game is
 * kept as its settings, players and visits, with the results worked out from
 * them by the rules of the app. Each game is copied unchanged to a collection
 * "<collection>_before_visits" first, so nothing is lost.
 */

// what is no longer stored: it follows from the visits
const OLD_FIELDS = {
    x01: ['allSetsThrows', 'currentLegThrows', 'currentThrow', 'currentSet', 'currentSetLeg', 'setsPlayed', 'legsPlayed', 'startingPlayerLeg', 'startingPlayerSet'],
    cricket: ['allThrows', 'currentThrow'],
    elimination: ['allThrows', 'currentThrow', 'startingPlayer'],
    clock: ['throws'],
};
OLD_FIELDS.x01training = OLD_FIELDS.x01;

const winnersOf = (game) => (game.players ?? []).filter(id => game.playerModels?.[id]?.hasWonGame).sort().join(',');

/**
 * A game stored the old way as visits: { set, unset, changed } for the update,
 * "changed" telling when the result is not what was stored (old games whose
 * figures an earlier version of the app got wrong, worked out again now).
 */
export const convertGame = (type, doc) => {
    const stored = storedOf(type, doc);
    const set = {
        visits: stored.visits,
        playerModels: stored.playerModels,
        currentPlayerTurn: stored.currentPlayerTurn,
        gameIsRunning: stored.gameIsRunning,
        hasWinner: stored.hasWinner,
        numberOfPlayers: stored.numberOfPlayers,
        ...(stored.handicap ? { handicap: stored.handicap } : {}),
        ...(stored.starter ? { starter: stored.starter } : {}),
    };
    const unset = Object.fromEntries(OLD_FIELDS[type].filter(key => key in doc).map(key => [key, '']));
    const changed = Boolean(doc.hasWinner) !== Boolean(stored.hasWinner) || winnersOf(doc) !== winnersOf(stored);
    return { set, unset, changed, stored };
};

const COLLECTIONS = [
    ['x01', () => db.x01],
    ['x01training', () => db.x01Training],
    ['cricket', () => db.cricket],
    ['elimination', () => db.elimination],
    ['clock', () => db.clock],
];

const backupOf = (collection) => db.mongoose.connection.collection(`${collection.collectionName}_before_visits`);

/**
 * Runs the move; safe to run again (only games without visits are moved, and
 * their copy is replaced, not doubled). Resolves to { moved, changed: [{ type, id }] }.
 */
export const migrateToVisits = async () => {
    const report = { moved: 0, changed: [] };
    for (const [type, model] of COLLECTIONS) {
        const collection = model().collection;
        const backup = backupOf(collection);
        for await (const doc of collection.find({ visits: { $exists: false } })) {
            try {
                const { set, unset, changed } = convertGame(type, doc);
                await backup.replaceOne({ _id: doc._id }, doc, { upsert: true });
                // straight on the collection: the game keeps when it was played (updatedAt)
                await collection.updateOne({ _id: doc._id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
                report.moved += 1;
                if (changed) report.changed.push({ type, id: String(doc._id) });
            } catch (err) {
                logger.error(err, `Could not move ${type} ${doc._id} to visits; it stays as it was`);
            }
        }
    }

    const quick = db.quickGame.collection;
    const quickBackup = backupOf(quick);
    for await (const doc of quick.find({ 'data.visits': { $exists: false } })) {
        try {
            const { stored, changed } = convertGame(doc.kind, doc.data ?? {});
            const data = Object.fromEntries(Object.entries(stored).filter(([key]) => !OLD_FIELDS[doc.kind].includes(key)));
            const winner = Object.entries(data.playerModels ?? {}).find(([, model]) => model?.hasWonGame)?.[0];
            await quickBackup.replaceOne({ _id: doc._id }, doc, { upsert: true });
            await quick.updateOne({ _id: doc._id }, { $set: {
                data,
                gameIsRunning: data.gameIsRunning !== false,
                hasWinner: Boolean(data.hasWinner),
                winner: winner ? data.quickPlayers?.find(player => player.id === winner)?.nickname ?? null : null,
            } });
            report.moved += 1;
            if (changed) report.changed.push({ type: `quick ${doc.kind}`, id: String(doc._id) });
        } catch (err) {
            logger.error(err, `Could not move quick game ${doc._id} to visits; it stays as it was`);
        }
    }
    return report;
};
