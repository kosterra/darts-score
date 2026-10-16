import logger from '../models/logger.model.js';
import db from '../models/db.model.js';

const DEFAULT_CLUB_NAME = 'Default Club';

/**
 * Database migrations, run in this order on startup. Each one runs once and is
 * then recorded in the "migrations" collection. A migration must be safe to
 * run again after a crash, and returns false when it cannot run yet.
 */
const migrations = [
    {
        id: '2026-10-clubs',
        description: 'Move players, games and training entries from before clubs existed into a default club',
        run: async ({ admin }) => {
            const clubless = { club: { $in: [null, undefined] } };
            const models = [db.player, db.x01, db.cricket, db.elimination, db.atc];

            const counts = await Promise.all(models.map(model => model.countDocuments(clubless)));
            if (counts.every(count => count === 0)) return true;

            if (!admin) {
                logger.error('Existing data needs a global admin to own it: set ADMIN_EMAIL and ADMIN_PASSWORD and restart. Until then that data is not visible in the app.');
                return false;
            }

            // The club has existed for as long as games were played, not just since this upgrade
            const firstGames = await Promise.all([db.x01, db.cricket, db.elimination].map(model =>
                model.findOne(clubless, 'createdAt').sort({ createdAt: 1 }).lean()));
            const firstGameAt = firstGames.filter(Boolean).map(game => game.createdAt).sort((a, b) => a - b)[0];

            const club = await db.club.findOne({ name: DEFAULT_CLUB_NAME, admins: admin._id })
                ?? await db.club.create({
                    name: DEFAULT_CLUB_NAME,
                    admins: [admin._id],
                    ...(firstGameAt && { createdAt: firstGameAt }),
                });
            // timestamps: false keeps each record's own "last updated" time, which is when a game was finished
            await Promise.all(models.map(model => model.updateMany(clubless, { $set: { club: club._id } }, { timestamps: false })));
            logger.info(`Moved existing data into "${club.name}": ${counts.join(' / ')} (players / x01 / cricket / elimination / atc)`);
            return true;
        },
    },
    {
        id: '2026-10-badges',
        description: 'Award the badges players have already earned in their past games and trainings',
        run: async () => {
            const { syncPlayerBadges } = await import('./badge.service.js');
            const players = await db.player.find({ guest: { $ne: true }, club: { $ne: null } });
            for (const player of players) await syncPlayerBadges(player);
            logger.info(`Checked the badges of ${players.length} players`);
            return true;
        },
    },
    {
        id: '2026-10-badges-weekly-streaks',
        description: 'Award the badges added later and work out every player\'s weekly streak',
        run: async () => {
            const { syncPlayerBadges } = await import('./badge.service.js');
            const players = await db.player.find({ guest: { $ne: true }, club: { $ne: null } });
            for (const player of players) await syncPlayerBadges(player);
            return true;
        },
    },
];

export const runMigrations = async (context) => {
    const applied = db.mongoose.connection.collection('migrations');

    for (const migration of migrations) {
        if (await applied.findOne({ _id: migration.id })) continue;

        logger.info(`Running migration ${migration.id}: ${migration.description}`);
        if (await migration.run(context) === false) {
            // Later migrations build on this one, so they wait as well
            logger.error(`Migration ${migration.id} is pending`);
            return;
        }
        await applied.insertOne({ _id: migration.id, appliedAt: new Date() });
        logger.info(`Migration ${migration.id} done`);
    }
};
