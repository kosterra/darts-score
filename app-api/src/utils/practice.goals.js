import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { RULES_TRAININGS, TRAINING_KINDS } from './rules.kinds.js';
import { viewOf } from './game.view.js';
import { deliverQuietly } from './notify.js';
import { addDays } from '../rules/calendar.js';
import { dayKeyIn, weekRangeIn } from '../rules/zones.js';

/**
 * The weekly practice goals of a user: up to three of their own, e.g. three
 * trainings or an X01 average of 50 in a game, for every week from Monday to
 * Sunday (the server's time, as the weekly mails). They count what the user's
 * players did in all their clubs, start again each Monday and stay until the
 * user removes them. Only the user sees them, not the club admins.
 *
 * The current week is worked out when asked; a week's record (practiceGoalWeek)
 * notes when each goal was reached, so it is told once, and is closed the
 * Monday after with its final figures (the past weeks, the weeks in a row).
 */

export const MAX_GOALS = 3;
// how many past weeks the history shows at most
export const HISTORY_WEEKS = 26;
// the weeks the dashboard shows as dots, the current one included
export const RECENT_WEEKS = 8;

// the trainings a goal can be about: Around the Clock, the bot and those of the rules engine
export const GOAL_TRAININGS = ['atc', 'bot', ...TRAINING_KINDS];
const TRAINING_TITLES = { atc: 'Around the Clock', bot: 'X01 against the bot' };
export const trainingTitle = (training) => TRAINING_TITLES[training] ?? RULES_TRAININGS[training]?.title ?? training;

/**
 * What a goal can count. Each kind with its largest target, the training it
 * needs (or may have), and how it reads (English; the app translates it).
 */
export const GOAL_KINDS = {
    trainings: {
        max: 50,
        training: 'optional',
        describe: ({ target, training }) => {
            if (training) return target === 1 ? `${trainingTitle(training)}: once` : `${trainingTitle(training)}: ${target} times`;
            return target === 1 ? 'One training' : `${target} trainings`;
        },
    },
    trainingScore: {
        max: 10000,
        training: 'required',
        trainings: TRAINING_KINDS,
        describe: ({ target, training }) => `${target} or better in ${trainingTitle(training)}`,
    },
    x01Average: {
        max: 180,
        describe: ({ target, withBot }) => (withBot ? `An X01 average of ${target} in a game or against the bot` : `An X01 average of ${target} in a game`),
    },
    games: {
        max: 100,
        describe: ({ target }) => (target === 1 ? 'One game' : `${target} games`),
    },
    num180s: {
        max: 100,
        describe: ({ target }) => `${target} × 180`,
    },
    playDays: {
        max: 7,
        describe: ({ target }) => (target === 1 ? 'Play on one day' : `Play on ${target} days`),
    },
};

export const describeGoal = (goal) => GOAL_KINDS[goal.kind]?.describe(goal) ?? String(goal.target);

/**
 * Why a goal cannot be kept like this, or null: a known kind, a whole number
 * from 1 to the kind's largest, the training it needs (one it knows).
 */
export const goalError = (goal) => {
    const kind = GOAL_KINDS[goal?.kind];
    if (!kind) return `There is no goal on ${goal?.kind}.`;
    const target = Number(goal.target);
    if (!Number.isInteger(target) || target < 1 || target > kind.max) return `A goal of this kind needs a number from 1 to ${kind.max}.`;
    if (kind.training === 'required' && !(kind.trainings ?? GOAL_TRAININGS).includes(goal.training)) return 'Choose the training of the goal.';
    if (kind.training === 'optional' && goal.training && !GOAL_TRAININGS.includes(goal.training)) return 'Choose the training of the goal.';
    return null;
};

/**
 * The goals as they are kept: only what each kind uses. A goal sent back
 * with its id and the same settings keeps its id (so a week knows it was
 * reached); a new or changed one gets a new id.
 */
export const normalizeGoals = (goals, before = [], newId = () => new db.mongoose.Types.ObjectId().toString()) => {
    const kept = new Map(before.map(goal => [goal.id, goal]));
    return goals.slice(0, MAX_GOALS).map(goal => {
        const kind = GOAL_KINDS[goal.kind];
        const clean = {
            kind: goal.kind,
            target: Number(goal.target),
            training: kind.training ? goal.training || null : null,
            withBot: goal.kind === 'x01Average' ? Boolean(goal.withBot) : false,
        };
        const old = goal.id ? kept.get(goal.id) : null;
        const same = old && old.kind === clean.kind && old.target === clean.target && (old.training ?? null) === clean.training && Boolean(old.withBot) === clean.withBot;
        return { id: same ? old.id : newId(), ...clean };
    });
};

// ---------------------------------------------------------------------------
// What a week holds, and how far each goal is
// ---------------------------------------------------------------------------

const GAME_MODELS = [
    ['x01', () => db.x01],
    ['cricket', () => db.cricket],
    ['elimination', () => db.elimination],
    ['clock', () => db.clock],
    ['rules', () => db.rulesGame],
];

/**
 * Everything the players finished in the week (range { from, until }), for
 * measuring: { games: [{ type, at, view }], atc, rules, bot: [{ at, view }] }.
 * The X01 games and the trainings against the bot with their visits worked out.
 */
export const loadWeek = async (playerIds, { from, until }) => {
    const ids = playerIds.map(String);
    if (!ids.length) return { games: [], atc: [], rules: [], bot: [] };
    const finishedIn = { $gte: from, $lt: until };
    const [games, atc, rules, bot] = await Promise.all([
        Promise.all(GAME_MODELS.map(async ([type, model]) => (await model().find({ players: { $in: ids }, hasWinner: true, updatedAt: finishedIn }).lean())
            .map(game => ({ type: type === 'rules' ? game.kind : type, at: game.updatedAt, view: type === 'x01' ? viewOf('x01', game) : game })))),
        db.atc.find({ 'player.id': { $in: ids }, createdAt: finishedIn }, 'player createdAt').lean(),
        db.rulesTraining.find({ 'player.id': { $in: ids }, createdAt: finishedIn }, 'player kind score createdAt').lean(),
        db.x01Training.find({ players: { $in: ids }, hasWinner: true, updatedAt: finishedIn }).lean(),
    ]);
    return {
        games: games.flat(),
        atc: atc.map(entry => ({ at: entry.createdAt, player: entry.player?.id })),
        rules: rules.map(entry => ({ at: entry.createdAt, player: entry.player?.id, kind: entry.kind, score: entry.score })),
        bot: bot.map(training => ({ at: training.updatedAt, view: viewOf('x01training', training) })),
    };
};

// the figures of the players in a game or a training against the bot
const modelsOf = (view, ids) => ids.map(id => view?.playerModels?.[id]).filter(Boolean);
const averageOf = (model) => Number(model?.averages?.game?.overall ?? 0);
const count180s = (view, ids) => modelsOf(view, ids).reduce((sum, model) => sum + (model.scoreRanges?.game?.['180'] ?? 0), 0);
const higherIsBetter = (training) => RULES_TRAININGS[training]?.higherIsBetter !== false;

/**
 * How far a goal is in a week (see loadWeek), as a number: a count, the best
 * score of the training (null without one) or the best X01 average.
 */
export const measure = (goal, week, playerIds) => {
    const ids = playerIds.map(String);
    switch (goal.kind) {
        case 'trainings': {
            if (goal.training === 'atc') return week.atc.length;
            if (goal.training === 'bot') return week.bot.length;
            if (goal.training) return week.rules.filter(entry => entry.kind === goal.training).length;
            return week.atc.length + week.rules.length + week.bot.length;
        }
        case 'trainingScore': {
            const scores = week.rules.filter(entry => entry.kind === goal.training).map(entry => Number(entry.score)).filter(Number.isFinite);
            if (!scores.length) return null;
            return higherIsBetter(goal.training) ? Math.max(...scores) : Math.min(...scores);
        }
        case 'x01Average': {
            const views = [...week.games.filter(game => game.type === 'x01').map(game => game.view), ...(goal.withBot ? week.bot.map(entry => entry.view) : [])];
            const best = Math.max(0, ...views.flatMap(view => modelsOf(view, ids).map(averageOf)));
            return Math.round(best * 10) / 10;
        }
        case 'games': return week.games.length;
        case 'num180s': return [...week.games.map(game => game.view), ...week.bot.map(entry => entry.view)].reduce((sum, view) => sum + count180s(view, ids), 0);
        case 'playDays': return new Set([...week.games, ...week.atc, ...week.rules, ...week.bot].map(entry => dayKeyIn(entry.at))).size;
        default: return 0;
    }
};

// whether a goal is reached with this progress (a score lower is better in some trainings)
export const isReached = (goal, progress) => {
    if (progress == null) return false;
    if (goal.kind === 'trainingScore' && !higherIsBetter(goal.training)) return progress <= goal.target;
    return progress >= goal.target;
};

// how far towards the goal, from 0 to 1, for the bars
export const shareOf = (goal, progress) => {
    if (progress == null) return 0;
    if (goal.kind === 'trainingScore' && !higherIsBetter(goal.training)) return progress > 0 ? Math.min(1, goal.target / progress) : 1;
    return Math.max(0, Math.min(1, progress / goal.target));
};

// a goal with how far it is, as the app shows it
export const goalView = (goal, progress, reachedAt = null) => ({
    id: goal.id,
    kind: goal.kind,
    target: goal.target,
    training: goal.training ?? null,
    withBot: Boolean(goal.withBot),
    description: describeGoal(goal),
    progress,
    share: shareOf(goal, progress),
    reached: isReached(goal, progress),
    reachedAt: reachedAt ?? null,
});

// the players of a user, in all their clubs
const playerIdsOf = async (userId) => (await db.player.find({ user: userId, guest: { $ne: true } }, '_id').lean()).map(player => String(player._id));

/**
 * How far each goal of the user is in the week of `now`:
 * { week: { from, until, key }, goals: [goalView], playerIds }.
 */
export const weekProgress = async (user, now = new Date(), { goals = user.practiceGoals ?? [] } = {}) => {
    const week = weekRangeIn(now);
    const playerIds = await playerIdsOf(user._id);
    const held = goals.length ? await loadWeek(playerIds, week) : null;
    const record = goals.length ? await db.practiceGoalWeek.findOne({ user: user._id, week: week.key }, 'goals').lean() : null;
    const reachedAt = new Map((record?.goals ?? []).filter(goal => goal.reachedAt).map(goal => [goal.id, goal.reachedAt]));
    return {
        week,
        playerIds,
        goals: goals.map(goal => {
            const view = goalView(goal, measure(goal, held, playerIds), reachedAt.get(goal.id));
            // reached once is reached for the week, also when a game is deleted later
            return reachedAt.has(goal.id) ? { ...view, reached: true } : view;
        }),
    };
};

// a closed week as the app shows it
const weekView = (record) => {
    const goals = (record.goals ?? []).map(goal => ({ ...goalView(goal, goal.progress ?? null, goal.reachedAt), reached: Boolean(goal.reachedAt) || isReached(goal, goal.progress ?? null) }));
    return { week: record.week, goals, allReached: goals.length > 0 && goals.every(goal => goal.reached) };
};

/**
 * The past weeks of the user, newest first: [{ week, goals, allReached }].
 */
export const pastWeeks = async (userId, weeks = 12, now = new Date()) => {
    const current = weekRangeIn(now).key;
    const records = await db.practiceGoalWeek.find({ user: userId, week: { $lt: current }, closedAt: { $ne: null } }).sort({ week: -1 }).limit(weeks).lean();
    return records.map(weekView);
};

/**
 * The weeks in a row with all goals reached, up to the current one (which
 * counts once all are reached), and the last RECENT_WEEKS weeks as dots:
 * [{ week, state: 'reached' | 'missed' | 'none' | 'running' }], oldest first.
 */
export const streakOf = (past, current) => {
    const byWeek = new Map(past.map(entry => [entry.week, entry]));
    const currentDone = current.goals.length > 0 && current.goals.every(goal => goal.reached);
    let streak = currentDone ? 1 : 0;
    for (let week = addDays(current.week.key, -7); byWeek.get(week)?.allReached; week = addDays(week, -7)) streak += 1;
    const recent = [];
    for (let back = RECENT_WEEKS - 1; back >= 1; back -= 1) {
        const week = addDays(current.week.key, -7 * back);
        const entry = byWeek.get(week);
        recent.push({ week, state: !entry || !entry.goals.length ? 'none' : entry.allReached ? 'reached' : 'missed' });
    }
    recent.push({ week: current.week.key, state: currentDone ? 'reached' : 'running' });
    return { streak, recent };
};

/**
 * Everything the app shows of the user's goals: the goals with how far each
 * is this week, the week, the weeks in a row and the recent weeks.
 */
export const goalsOverview = async (user, now = new Date()) => {
    const current = await weekProgress(user, now);
    const past = await pastWeeks(user._id, RECENT_WEEKS + HISTORY_WEEKS, now);
    const { streak, recent } = streakOf(past, current);
    return {
        goals: current.goals,
        week: { from: current.week.from, until: current.week.until, key: current.week.key },
        streak,
        recent,
        maxGoals: MAX_GOALS,
    };
};

// ---------------------------------------------------------------------------
// Reached: told once
// ---------------------------------------------------------------------------

// a goal as a week keeps it
const recordOf = (goal) => ({ id: goal.id, kind: goal.kind, target: goal.target, training: goal.training ?? null, withBot: Boolean(goal.withBot), progress: goal.progress ?? null, reachedAt: null });

/**
 * Notes a goal as reached in its week; true only for the first time (the
 * week's record is changed only when the goal was not reached yet there, so
 * two saves at once tell it once).
 */
const noteReached = async (userId, weekKey, goal, now) => {
    await db.practiceGoalWeek.updateOne({ user: userId, week: weekKey }, { $setOnInsert: { goals: [] } }, { upsert: true });
    await db.practiceGoalWeek.updateOne({ user: userId, week: weekKey, 'goals.id': { $ne: goal.id } }, { $push: { goals: recordOf(goal) } });
    const result = await db.practiceGoalWeek.updateOne(
        { user: userId, week: weekKey, goals: { $elemMatch: { id: goal.id, reachedAt: null } } },
        { $set: { 'goals.$.reachedAt': now, 'goals.$.progress': goal.progress } },
    );
    return result.modifiedCount === 1;
};

/**
 * After a game or a training: the goals of the user that are reached this
 * week for the first time are noted and told ("Goal reached: 3 trainings").
 * training: what was just saved ('atc', 'bot', a kind of the rules engine),
 * for the goals it counts for. Resolves to { goals, reached }: the goals the
 * training counts for with how far they are, and those just reached. Never
 * throws: a goal must not get in the way of saving.
 */
export const checkPracticeGoals = async (userId, { training = null, now = new Date() } = {}) => {
    try {
        const user = userId ? await db.user.findById(userId, 'practiceGoals role').lean() : null;
        if (!user?.practiceGoals?.length) return { goals: [], reached: [] };
        const { week, goals } = await weekProgress(user, now);
        const reached = [];
        for (const goal of goals.filter(entry => entry.reached && !entry.reachedAt)) {
            if (await noteReached(user._id, week.key, goal, now)) reached.push(goal);
        }
        if (reached.length) {
            await deliverQuietly(reached.map(goal => ({
                user: user._id,
                kind: 'practiceGoalReached',
                title: `Goal reached: ${goal.description}`,
                body: 'Well done, that one is done for this week.',
                link: '/profile#playing',
            })));
        }
        const counts = (goal) => goal.kind === 'playDays'
            || (goal.kind === 'trainings' && (!goal.training || goal.training === training))
            || (goal.kind === 'trainingScore' && goal.training === training);
        return { goals: training ? goals.filter(counts) : [], reached: reached.map(({ id, description }) => ({ id, description })) };
    } catch (err) {
        logger.error(err, 'Failed to check the practice goals');
        return { goals: [], reached: [] };
    }
};

/**
 * After a training was saved: the goals of the player's user are checked;
 * when that user saved it themselves, the answer says how far their goals
 * are ({ practiceGoals, goalsReached }), else nothing (the goals are theirs).
 */
export const practiceGoalsAfterTraining = async (req, player, training) => {
    if (!player?.user || player.guest) return {};
    const { goals, reached } = await checkPracticeGoals(player.user, { training });
    if (String(player.user) !== String(req.user?._id)) return {};
    return { practiceGoals: goals, goalsReached: reached };
};

// after a finished game: the goals of each of its players with a login
export const checkGoalsAfterGame = async (game) => {
    const ids = (game.players ?? []).filter(id => db.mongoose.isValidObjectId(id));
    const players = await db.player.find({ _id: { $in: ids }, user: { $ne: null }, guest: { $ne: true } }, 'user').lean().catch(() => []);
    for (const user of new Set(players.map(player => String(player.user)))) await checkPracticeGoals(user);
};

// ---------------------------------------------------------------------------
// The week that ended, the nudge on Sunday, the lines of the weekly mail
// ---------------------------------------------------------------------------

// the week before the one of `now`
const weekBefore = (now) => {
    const { from } = weekRangeIn(now);
    // half a week before its Monday: in the week before, whatever the clocks did
    return weekRangeIn(new Date(from.getTime() - 3.5 * 24 * 60 * 60 * 1000));
};

/**
 * Closes the week that ended for every user with goals: its final figures,
 * with when each goal was reached. A week closed once stays as it is.
 * Resolves to the number of weeks closed.
 */
export const closePracticeWeeks = async (now = new Date()) => {
    const last = weekBefore(now);
    const users = await db.user.find({ 'practiceGoals.0': { $exists: true }, blockedAt: null }, 'practiceGoals').lean();
    let closed = 0;
    for (const user of users) {
        if (await db.practiceGoalWeek.exists({ user: user._id, week: last.key, closedAt: { $ne: null } })) continue;
        // when a goal was reached comes from the week's record; one reached without being noted counts at the end
        const { goals } = await weekProgress(user, last.from);
        await db.practiceGoalWeek.updateOne(
            { user: user._id, week: last.key },
            { $set: { goals: goals.map(goal => ({ ...recordOf(goal), reachedAt: goal.reachedAt ?? (goal.reached ? last.until : null) })), closedAt: now } },
            { upsert: true },
        );
        closed += 1;
    }
    return closed;
};

// a figure of a goal for a line: a score or average as it is, nothing yet as a dash
const figureOf = (progress) => (progress == null ? '–' : String(progress));

/**
 * The goals of the week that ended, for the weekly mail: [{ goal, progress,
 * target }] in English (the mail translates them), [] without goals.
 */
export const lastWeekGoals = async (user, now = new Date()) => {
    const last = weekBefore(now);
    const record = await db.practiceGoalWeek.findOne({ user: user._id, week: last.key }).lean();
    const goals = record?.closedAt ? weekView(record).goals : (user.practiceGoals?.length ? (await weekProgress(user, last.from)).goals : []);
    return goals.map(goal => ({ goal: goal.description, progress: figureOf(goal.progress), target: goal.target }));
};

/**
 * The nudge of the week's last day: the goal not reached yet that is
 * closest, with how far it is, or null when all are reached.
 */
export const nudgeOf = (goals) => {
    const open = goals.filter(goal => !goal.reached);
    if (!open.length) return null;
    const goal = open.reduce((best, entry) => (entry.share > best.share ? entry : best), open[0]);
    return {
        title: `Your week ends today: ${goal.description} stands at ${figureOf(goal.progress)} of ${goal.target}`,
        body: 'There is still time for a training.',
    };
};
