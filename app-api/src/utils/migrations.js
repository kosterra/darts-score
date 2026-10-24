import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { layoutFromWidgets } from './dashboard.layout.js';

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
            // players are counted on the raw collection: from 2026-10-player-clubs on
            // their model has a list of clubs, and this migration still sets the old field
            const playersWithoutClub = { ...clubless, 'clubs.0': { $exists: false } };
            const collections = [
                [db.player.collection, playersWithoutClub],
                ...[db.x01, db.cricket, db.elimination, db.atc].map(model => [model.collection, clubless]),
            ];

            const counts = await Promise.all(collections.map(([collection, filter]) => collection.countDocuments(filter)));
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
            // straight on the collections, so each record keeps its own "last updated" time, which is when a game was finished
            await Promise.all(collections.map(([collection, filter]) => collection.updateMany(filter, { $set: { club: club._id } })));
            logger.info(`Moved existing data into "${club.name}": ${counts.join(' / ')} (players / x01 / cricket / elimination / atc)`);
            return true;
        },
    },
    {
        id: '2026-10-player-clubs',
        description: 'Let players be members of several clubs: their one club becomes a list of clubs',
        run: async () => {
            const players = db.player.collection;
            // timestamps stay as they are: nothing about the players themselves changed
            const { modifiedCount } = await players.updateMany(
                { club: { $type: 'objectId' } },
                [{ $set: { clubs: ['$club'], formerClubs: { $ifNull: ['$formerClubs', []] } } }, { $unset: 'club' }]
            );
            // players without a club (should not exist) only lose the old field
            await players.updateMany({ club: { $exists: true } }, [
                { $set: { clubs: { $ifNull: ['$clubs', []] }, formerClubs: { $ifNull: ['$formerClubs', []] } } },
                { $unset: 'club' },
            ]);
            logger.info(`Moved ${modifiedCount} players to the list of clubs`);
            return true;
        },
    },
    {
        id: '2026-10-badges',
        description: 'Award the badges players have already earned in their past games and trainings',
        run: async () => {
            const { syncPlayerBadges } = await import('./badge.service.js');
            const players = await db.player.find({ guest: { $ne: true }, 'clubs.0': { $exists: true } });
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
            const players = await db.player.find({ guest: { $ne: true }, 'clubs.0': { $exists: true } });
            for (const player of players) await syncPlayerBadges(player);
            return true;
        },
    },
    {
        id: '2026-10-atc-player-reference',
        description: 'Training entries keep the player id and nickname instead of a copy of the whole player',
        run: async () => {
            // straight on the collection, so each entry keeps its own timestamps
            const { modifiedCount } = await db.atc.collection.updateMany(
                { 'player.id': { $exists: true } },
                [{ $set: { player: { id: '$player.id', nickname: '$player.nickname' } } }]
            );
            logger.info(`Trimmed the player of ${modifiedCount} training entries`);
            return true;
        },
    },
    {
        id: '2026-10-history-follows-moved-players',
        description: 'Move games among players who all left a club for the same other club, and the trainings of players who left for one club, to where the players are now',
        run: async () => {
            const { relocateHistory } = await import('./history.relocation.js');
            const players = await db.player.find({ 'formerClubs.0': { $exists: true } }, '_id').lean();
            const moved = await relocateHistory(players.map(player => player._id));
            logger.info(`Checked the history of ${players.length} moved players: ${moved.games} games and ${moved.trainings} trainings moved`);
            return true;
        },
    },
    {
        id: '2026-10-new-badges-hall-of-shame',
        description: 'Award the 16 new badge series from past games and trainings, and fill every player\'s Hall of Shame, so the club holders are right from the start',
        run: async () => {
            const { syncPlayerBadges } = await import('./badge.service.js');
            const players = await db.player.find({ guest: { $ne: true }, 'clubs.0': { $exists: true } });
            let awarded = 0;
            for (const player of players) awarded += (await syncPlayerBadges(player)).newBadges.length;
            logger.info(`Checked the badges and the Hall of Shame of ${players.length} players: ${awarded} new badges`);
            return true;
        },
    },
    {
        id: '2026-10-players-follow-their-account',
        description: 'Give every player with a login the name of its account, and the players of one account one picture',
        run: async () => {
            const players = await db.player.find({ user: { $ne: null } }, 'user firstname lastname profileImg').lean();
            const users = await db.user.find({ _id: { $in: [...new Set(players.map(player => String(player.user)))] } }, 'firstname lastname').lean();
            const userById = new Map(users.map(user => [String(user._id), user]));
            let renamed = 0;
            let pictured = 0;
            const pictureOf = new Map();
            for (const player of players) {
                const user = userById.get(String(player.user));
                if (!user) continue;
                const changes = {};
                if (player.firstname !== user.firstname || player.lastname !== user.lastname) {
                    Object.assign(changes, { firstname: user.firstname, lastname: user.lastname });
                    renamed += 1;
                }
                // the first picture found is the account's; later players take it over
                const key = String(player.user);
                if (!pictureOf.has(key) && player.profileImg) pictureOf.set(key, player.profileImg);
                if (Object.keys(changes).length) await db.player.collection.updateOne({ _id: player._id }, { $set: changes });
            }
            for (const [userId, profileImg] of pictureOf) {
                const result = await db.player.collection.updateMany({ user: new db.mongoose.Types.ObjectId(userId), profileImg: { $ne: profileImg } }, { $set: { profileImg } });
                pictured += result.modifiedCount;
            }
            logger.info(`Players with a login: ${renamed} took their account's name, ${pictured} the account's picture`);
            return true;
        },
    },
    {
        id: '2026-10-dashboard-you-widget',
        description: 'Put the new "You" widget on top of the dashboards that clubs arranged themselves (the default dashboard has it already)',
        run: async () => {
            const result = await db.club.updateMany(
                { 'dashboardWidgets.0': { $exists: true }, dashboardWidgets: { $ne: 'me' } },
                { $push: { dashboardWidgets: { $each: ['me'], $position: 0 } } }
            );
            logger.info(`The "You" widget was added to ${result.modifiedCount} arranged dashboards`);
            return true;
        },
    },
    {
        id: '2026-10-dashboard-layout',
        description: 'Give the dashboards clubs arranged a width per widget, the width each had before',
        run: async () => {
            const clubs = await db.club.find({ 'dashboardWidgets.0': { $exists: true } }, 'dashboardWidgets dashboardLayout').lean();
            let converted = 0;
            for (const club of clubs) {
                if (club.dashboardLayout?.length) continue;
                await db.club.collection.updateOne({ _id: club._id }, { $set: { dashboardLayout: layoutFromWidgets(club.dashboardWidgets) }, $unset: { dashboardWidgets: '' } });
                converted += 1;
            }
            logger.info(`${converted} arranged dashboards got a width per widget`);
            return true;
        },
    },
    {
        id: '2026-10-flying-darts-off',
        description: 'Switch the dart animation off for every player: it is off by default now, and nobody had to switch it on',
        run: async () => {
            const { modifiedCount } = await db.player.updateMany({ 'preferences.flyingDarts': { $ne: false } }, { $set: { 'preferences.flyingDarts': false } });
            logger.info(`The dart animation switched off for ${modifiedCount} players`);
            return true;
        },
    },
    {
        id: '2026-10-visits',
        description: 'Keep X01, Cricket, Elimination and Around the Clock (and the quick games) as their visits, played on the rules engine; a copy of every game stays in "<collection>_before_visits"',
        run: async () => {
            const { migrateToVisits } = await import('./visits.migration.js');
            const { moved, changed } = await migrateToVisits();
            logger.info(`Moved ${moved} games to visits`);
            // old games whose stored result the darts do not give (an earlier version of the app got it wrong)
            for (const { type, id } of changed) logger.warn(`The visits of ${type} ${id} give another result than was stored; the copy before is kept`);
            // the badges and statistics follow the games as they are now
            const { syncPlayerBadges } = await import('./badge.service.js');
            const players = await db.player.find({ guest: { $ne: true }, 'clubs.0': { $exists: true } });
            for (const player of players) await syncPlayerBadges(player);
            return true;
        },
    },
    {
        id: '2026-10-badges-newer-games',
        description: 'Award the badges of Shanghai, Killer, Halve-It, Golf, Tactics and the newer trainings from past games and trainings, and add their Hall of Shame badges, so the club holders are right from the start',
        run: async () => {
            const { syncPlayerBadges } = await import('./badge.service.js');
            const players = await db.player.find({ guest: { $ne: true }, 'clubs.0': { $exists: true } });
            let awarded = 0;
            for (const player of players) awarded += (await syncPlayerBadges(player)).newBadges.length;
            logger.info(`Checked the badges and the Hall of Shame of ${players.length} players: ${awarded} new badges`);
            return true;
        },
    },
    {
        id: '2026-10-club-badges',
        description: 'Work out what every finished game added to its club, and the badges each club earned together so far (without telling the members about the old ones)',
        run: async () => {
            const { buildClubTallies, syncClubBadges } = await import('./club.badge.service.js');
            const clubs = await db.club.find({});
            let games = 0;
            let badges = 0;
            for (const club of clubs) {
                games += await buildClubTallies(club._id);
                badges += (await syncClubBadges(club, { notify: false })).fresh.length;
            }
            logger.info(`Club badges: ${games} games counted in ${clubs.length} clubs, ${badges} badges earned`);
            return true;
        },
    },
    {
        id: '2026-10-club-tallies-winners',
        description: 'Add who won and whether it was friendly to what every finished game added to its club, for the club\'s rating in the player comparison',
        run: async () => {
            const { buildClubTallies } = await import('./club.badge.service.js');
            const clubs = await db.club.find({}, '_id');
            let games = 0;
            // only the tallies of an older version are worked out again
            for (const club of clubs) games += await buildClubTallies(club._id);
            logger.info(`Club tallies checked for ${games} games in ${clubs.length} clubs`);
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
