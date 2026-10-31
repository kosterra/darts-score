import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { isRulesGame } from './rules.kinds.js';
import { viewOf } from './game.view.js';
import { checkLater, noteClubBadges } from './spam.guard.js';
import { noteRatingChanges } from './player.notices.js';
import { CLUB_BADGES, GOAL_METRICS, TALLY_VERSION, getClubBadge, goalProgress, publicClubBadge, replayClubBadges, tallyOf } from './club.badges.js';
import { deliver } from './notify.js';

const GAME_COLLECTIONS = {
    x01: () => db.x01,
    cricket: () => db.cricket,
    elimination: () => db.elimination,
    clock: () => db.clock,
    rules: () => db.rulesGame,
};

/**
 * Keeps what a finished game added to its club (see club.tally.model.js),
 * worked out again only when the game changed since. type: x01, cricket, …
 * or the kind of a newer game.
 */
export const saveTally = async (clubId, type, game, { onlyPlayers = null } = {}) => {
    if (!clubId || !game?.hasWinner) return false;
    const sourceId = String(game._id ?? game.id);
    const at = game.updatedAt ?? new Date();
    // the tally is kept per club and game: a shared tournament game has one per club
    const known = await db.clubTally.findOne({ club: clubId, sourceId }, 'at version').lean();
    if (known && known.version === TALLY_VERSION && new Date(known.at).getTime() === new Date(at).getTime()) return false;
    const data = viewOf(isRulesGame(type) ? 'rules' : type, game);
    const tally = tallyOf(type, data, { onlyPlayers });
    await db.clubTally.updateOne(
        { club: clubId, sourceId },
        { $set: { club: clubId, sourceType: type, sourceId, at, ...tally } },
        { upsert: true }
    );
    // true for a game finished just now
    return !known;
};

// what a club played: its game tallies and its trainings, as events for the replay
const loadClubEvents = async (clubId) => {
    const [tallies, atc, rules] = await Promise.all([
        db.clubTally.find({ club: clubId }, 'sourceType sourceId at players darts num180s tonPlus highFinishes firsts').lean(),
        db.atc.find({ club: clubId }, 'createdAt player').lean(),
        db.rulesTraining.find({ club: clubId }, 'kind createdAt player').lean(),
    ]);
    const trainings = [
        ...atc.map(entry => ({ kind: 'training', type: 'atc', trainingKind: 'atc', id: String(entry._id), at: entry.createdAt, player: entry.player?.id ? String(entry.player.id) : null })),
        ...rules.map(entry => ({ kind: 'training', type: 'rulesTraining', trainingKind: entry.kind, id: String(entry._id), at: entry.createdAt, player: entry.player?.id ? String(entry.player.id) : null })),
    ];
    const games = tallies.map(tally => ({ kind: 'game', type: tally.sourceType, id: tally.sourceId, ...tally }));
    return { games, trainings, tallies };
};

const memberCount = (clubId) => db.player.countDocuments({ clubs: clubId, guest: { $ne: true } });

// the accounts of the club: its admins and the members who log in
const clubAccounts = async (club) => {
    const users = await db.player.distinct('user', { clubs: club._id, user: { $ne: null } });
    return [...new Set([...users, ...(club.admins ?? [])].map(String))];
};

const notifyClub = async (club, fresh) => {
    try {
        const users = await clubAccounts(club);
        const notes = fresh.flatMap(entry => {
            const badge = getClubBadge(entry.badge);
            return users.map(user => ({
                user,
                kind: 'clubBadge',
                title: `${club.name} earned a club badge: ${badge.title}`,
                body: entry.nickname ? `${badge.description}. ${entry.nickname} made it happen.` : `${badge.description}.`,
                link: '/badges#club',
                club: club._id,
            }));
        });
        if (notes.length) await deliver(notes);
    } catch (err) {
        logger.error(err, 'Failed to tell the club about its new badges');
    }
};

const notifyGoals = async (club, goals) => {
    try {
        const users = await clubAccounts(club);
        const notes = goals.flatMap(goal => users.map(user => ({
            user,
            kind: 'clubGoal',
            title: `${club.name} reached its goal: ${GOAL_METRICS[goal.metric]?.describe(goal.target) ?? goal.target}`,
            body: 'Everyone who played added to it. Well done!',
            link: '/club',
            club: club._id,
        })));
        if (notes.length) await deliver(notes);
    } catch (err) {
        logger.error(err, 'Failed to tell the club about its goal');
    }
};

// a club, or the club of an id (an ObjectId has an _id too, which is itself: a club is told apart by the badges every club has)
export const clubOf = async (clubOrId) => (Array.isArray(clubOrId?.badges) ? clubOrId : db.club.findById(clubOrId));

/**
 * Brings a club's badges and goals up to date with what it played. Badges are
 * only ever added. With "notify" the members hear about new ones (not when
 * badges are worked out the first time, so a club is not flooded).
 * Resolves to { fresh: [club badge entries], metrics, progress: { [goalId]: value } }.
 */
export const syncClubBadges = async (clubOrId, { notify = true } = {}) => {
    const club = await clubOf(clubOrId);
    if (!club) return { fresh: [], metrics: {}, progress: {} };
    const [{ games, trainings, tallies }, members] = await Promise.all([loadClubEvents(club._id), memberCount(club._id)]);
    const { earned, metrics } = replayClubBadges([...games, ...trainings], { members, createdAt: club.createdAt });

    const known = new Set((club.badges ?? []).map(entry => entry.badge));
    const fresh = earned.filter(entry => !known.has(entry.badge));
    if (fresh.length) {
        const ids = fresh.map(entry => entry.player).filter(id => id && db.mongoose.isValidObjectId(id));
        const players = await db.player.find({ _id: { $in: ids } }, 'nickname').lean();
        const nicknames = new Map(players.map(player => [String(player._id), player.nickname]));
        for (const entry of fresh) entry.nickname = entry.player ? nicknames.get(String(entry.player)) ?? null : null;
    }

    // the goals: how far each is, and when one was reached
    const progress = {};
    const reached = [];
    const trainingTimes = trainings.map(entry => ({ at: entry.at }));
    for (const goal of club.goals ?? []) {
        progress[goal.id] = goalProgress(goal, tallies, trainingTimes);
        if (!goal.reachedAt && progress[goal.id] >= goal.target) {
            goal.reachedAt = new Date();
            reached.push(goal);
        }
    }

    if (fresh.length) club.badges.push(...fresh);
    if (fresh.length || reached.length) {
        await db.club.updateOne({ _id: club._id }, { $set: { badges: club.badges, goals: club.goals } });
        if (fresh.length) logger.info(`${club.name} earned ${fresh.map(entry => entry.badge).join(', ')}`);
    }
    if (notify && fresh.length) {
        await notifyClub(club, fresh);
        checkLater(() => noteClubBadges(club, fresh));
    }
    if (notify && reached.length) await notifyGoals(club, reached);
    return { fresh, metrics, progress };
};

/**
 * After a finished game: its tally, then the club's badges. Failures are
 * logged, never thrown: a badge must not get in the way of saving a game.
 */
export const syncClubAfterGame = async (clubId, type, game, { onlyPlayers = null } = {}) => {
    try {
        const fresh = await saveTally(clubId, type, game, { onlyPlayers });
        if (fresh) checkLater(() => noteRatingChanges(clubId, String(game._id ?? game.id)));
        return (await syncClubBadges(clubId)).fresh;
    } catch (err) {
        logger.error(err, 'Failed to update the club badges after a game');
        return [];
    }
};

// after a training: the club's badges (every kind of training) and goals
export const syncClubAfterTraining = async (clubId) => {
    try {
        return (await syncClubBadges(clubId)).fresh;
    } catch (err) {
        logger.error(err, 'Failed to update the club badges after a training');
        return [];
    }
};

/**
 * Works out the tallies of every finished game of a club (for the clubs that
 * played before club badges existed); resolves to how many were added.
 */
export const buildClubTallies = async (clubId) => {
    let count = 0;
    for (const [type, model] of Object.entries(GAME_COLLECTIONS)) {
        for await (const game of model().find({ club: clubId, hasWinner: true }).lean().cursor()) {
            await saveTally(clubId, type === 'rules' ? game.kind : type, game);
            count += 1;
        }
    }
    return count;
};

// a club badge as the app shows it, with when and by whom it was earned
export const clubBadgeView = (entry) => {
    const badge = getClubBadge(entry.badge);
    return badge ? { ...publicClubBadge(badge), earnedAt: entry.earnedAt, sourceType: entry.sourceType ?? null, sourceId: entry.sourceId ?? null, nickname: entry.nickname ?? null } : null;
};

/**
 * The club's badges for its page: every badge, earned or with the progress
 * towards it, and its goals with how far they are.
 */
export const clubBadgesOverview = async (club) => {
    const { metrics, progress } = await syncClubBadges(club);
    const stored = await db.club.findById(club._id, 'badges goals').lean();
    const earnedById = new Map((stored?.badges ?? []).map(entry => [entry.badge, entry]));
    return {
        earnedCount: CLUB_BADGES.filter(badge => earnedById.has(badge.id)).length,
        total: CLUB_BADGES.length,
        badges: CLUB_BADGES.map(badge => {
            const earned = earnedById.get(badge.id);
            return {
                ...publicClubBadge(badge),
                earned: earned ? { earnedAt: earned.earnedAt, sourceType: earned.sourceType ?? null, sourceId: earned.sourceId ?? null, nickname: earned.nickname ?? null } : null,
                progress: Math.min(Math.floor(metrics[badge.metric] ?? 0), badge.target),
            };
        }),
        goals: (stored?.goals ?? []).map(goal => ({
            ...goal,
            title: GOAL_METRICS[goal.metric]?.title ?? goal.metric,
            description: GOAL_METRICS[goal.metric]?.describe(goal.target) ?? '',
            progress: Math.min(progress[goal.id] ?? 0, goal.target),
        })),
    };
};
