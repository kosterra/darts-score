import { gameFeats } from './badges.js';
import { isRulesGame } from './rules.kinds.js';

/**
 * Badges a club earns together: every game and training of its members adds
 * to them. Like the players' badges, each group counts one thing (a "metric")
 * and has tiers; they are worked out by replaying what the club played, in
 * order, so each badge knows the game (and the player) that tipped it. They
 * add no XP: they belong to the club.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
// weeks start on a Monday, as for the players' weekly streaks
const FIRST_MONDAY_MS = Date.UTC(1970, 0, 5);
const YEAR_MS = 365.25 * DAY_MS;
// the game types and the kinds of training a club can play
export const CLUB_GAME_TYPES = ['x01', 'cricket', 'elimination', 'clock', 'shanghai', 'killer', 'halveit', 'golf', 'tactics'];
export const CLUB_TRAINING_KINDS = ['atc', 'bobs27', 'checkout121', 'randomcheckouts', 'scoring', 'doublesaround', 'catch40'];
const formatCount = (n) => new Intl.NumberFormat('en').format(n);

// how the club's medals are shown, in this order
export const CLUB_BADGE_CATEGORIES = [
    { category: 'together', title: 'Together' },
    { category: 'clubLife', title: 'Club life' },
    { category: 'firsts', title: 'Club firsts' },
];

export const CLUB_BADGE_GROUPS = [
    {
        group: 'clubGames', category: 'together', title: 'Club games', metric: 'games',
        describe: (n) => `${formatCount(n)} games played in the club`,
        tiers: [[100, 'Busy Oche'], [1000, 'Thousand Games'], [10000, 'Ten Thousand Games']],
    },
    {
        group: 'clubDarts', category: 'together', title: 'Darts thrown', metric: 'darts',
        describe: (n) => `${formatCount(n)} darts thrown in the club's games`,
        tiers: [[100000, 'Hundred Thousand Darts'], [1000000, 'A Million Darts']],
    },
    {
        group: 'club180s', category: 'together', title: '180s together', metric: 'num180s',
        describe: (n) => `${formatCount(n)} × 180 thrown in the club`,
        tiers: [[10, 'Ten Maximums'], [100, 'Hundred Maximums'], [1000, 'Thousand Maximums']],
    },
    {
        group: 'clubNight', category: 'clubLife', title: 'Club night', metric: 'bestNight',
        describe: (n) => `${n} different players play on one day`,
        tiers: [[8, 'Club Night'], [16, 'Packed House']],
    },
    {
        group: 'clubWeeks', category: 'clubLife', title: 'Every week', metric: 'bestWeekStreak',
        describe: (n) => `A game in the club every week for ${n} weeks in a row`,
        tiers: [[4, 'Weekly Fixture'], [12, 'Season Regulars'], [52, 'Year-Round Club']],
    },
    {
        group: 'clubMembers', category: 'clubLife', title: 'Members', metric: 'members',
        describe: (n) => `${n} members`,
        tiers: [[10, 'Growing Club'], [25, 'Proper Club'], [50, 'Big Club']],
    },
    {
        group: 'clubAnniversary', category: 'clubLife', title: 'Anniversary', metric: 'years',
        describe: (n) => n === 1 ? 'One year of the club on Oche' : `${n} years of the club on Oche`,
        tiers: [[1, 'One Year on the Oche'], [2, 'Two Years on the Oche'], [5, 'Five Years on the Oche']],
    },
    {
        group: 'clubEveryGame', category: 'together', title: 'Every game', metric: 'gameTypes',
        describe: (n) => `All ${n} games played in the club`,
        tiers: [[CLUB_GAME_TYPES.length, 'Every Game in the Book']],
    },
    {
        group: 'clubEveryTraining', category: 'together', title: 'Every training', metric: 'trainingKinds',
        describe: (n) => `All ${n} kinds of training done in the club`,
        tiers: [[CLUB_TRAINING_KINDS.length, 'Training Ground']],
    },
    {
        group: 'clubFirst180', category: 'firsts', title: 'First 180', metric: 'max180Firsts',
        describe: () => 'The first 180 thrown in the club',
        tiers: [[1, 'First Maximum']],
    },
    {
        group: 'clubFirstBigFish', category: 'firsts', title: 'First big fish', metric: 'bigFishFirsts',
        describe: () => 'The first 170 checkout in the club',
        tiers: [[1, 'The Big Fish Landed']],
    },
    {
        group: 'clubFirstNineDarter', category: 'firsts', title: 'First nine-darter', metric: 'nineDarterFirsts',
        describe: () => 'The first nine-darter in the club',
        tiers: [[1, 'Perfect Leg']],
    },
    {
        group: 'clubFirstShanghai', category: 'firsts', title: 'First Shanghai finish', metric: 'shanghaiFinishFirsts',
        describe: () => 'The first Shanghai finish in the club (single, treble and double 20)',
        tiers: [[1, 'Shanghai Night']],
    },
];

export const CLUB_BADGES = CLUB_BADGE_GROUPS.flatMap(({ group, category, title, metric, describe, tiers }) =>
    tiers.map(([target, name], index) => ({
        id: `${group}-${target}`,
        group,
        groupTitle: title,
        category,
        metric,
        title: name,
        description: describe(target),
        targetLabel: formatCount(target),
        target,
        tier: index + 1,
        tiers: tiers.length,
    })));

export const getClubBadge = (id) => CLUB_BADGES.find(badge => badge.id === id);

// what a club can set a goal on, with how a finished game or training adds to it
export const GOAL_METRICS = {
    games: { title: 'Games', describe: (n) => `${formatCount(n)} games` },
    num180s: { title: '180s', describe: (n) => `${formatCount(n)} × 180` },
    darts: { title: 'Darts thrown', describe: (n) => `${formatCount(n)} darts` },
    tonPlus: { title: 'Ton-plus visits', describe: (n) => `${formatCount(n)} visits of 100 or more` },
    highFinishes: { title: 'High finishes', describe: (n) => `${formatCount(n)} checkouts of 100 or more` },
    trainings: { title: 'Trainings', describe: (n) => `${formatCount(n)} trainings` },
};

const FIRSTS = { max180: 'max180Firsts', bigFish: 'bigFishFirsts', nineDarter: 'nineDarterFirsts', shanghaiFinish: 'shanghaiFinishFirsts' };

/**
 * What a finished game adds to its club, from what it shows for each of its
 * players: the darts, the 180s, the ton-plus visits and high finishes, and who
 * threw a 180, a big fish, a nine-darter or a Shanghai finish in it.
 */
export const tallyOf = (type, game) => {
    const tally = { players: (game.players ?? []).map(String), darts: 0, num180s: 0, tonPlus: 0, highFinishes: 0, firsts: {} };
    const add = (key, playerId) => { (tally.firsts[key] ??= []).push(playerId); };
    for (const playerId of tally.players) {
        const feats = gameFeats(type, game, playerId);
        tally.darts += feats.darts;
        tally.num180s += feats.num180s;
        tally.tonPlus += feats.tonPlusVisits;
        tally.highFinishes += feats.highFinishes;
        if (feats.num180s > 0) add('max180', playerId);
        if (feats.bigFishes > 0) add('bigFish', playerId);
        if (feats.nineDarters > 0) add('nineDarter', playerId);
        if (feats.shanghaiFinishes > 0) add('shanghaiFinish', playerId);
    }
    return tally;
};

const weekOf = (time) => Math.floor((time - FIRST_MONDAY_MS) / WEEK_MS);
const dayOf = (time) => Math.floor(time / DAY_MS);

/**
 * Replays what a club played and returns its badges, each with the game or
 * training that tipped it and the player who played it (for the firsts the one
 * who threw it), and the metrics for the progress to the next tiers.
 * events: [{ kind: 'game', type, id, at, players, darts, num180s, firsts } |
 *          { kind: 'training', type: 'atc' | 'rulesTraining', trainingKind, id, at, player }]
 * members: the number of members now; createdAt: when the club began; now
 */
export const replayClubBadges = (events, { members = 0, createdAt = null, now = new Date() } = {}) => {
    const metrics = {
        games: 0, darts: 0, num180s: 0, bestNight: 0, weekStreak: 0, bestWeekStreak: 0, members, years: 0,
        gameTypes: 0, trainingKinds: 0, max180Firsts: 0, bigFishFirsts: 0, nineDarterFirsts: 0, shanghaiFinishFirsts: 0,
    };
    const types = new Set();
    const kinds = new Set();
    let day = null;
    let dayPlayers = new Set();
    let lastWeek = null;
    const earned = [];
    const earnedIds = new Set();

    const award = (source) => {
        for (const badge of CLUB_BADGES) {
            if (earnedIds.has(badge.id) || metrics[badge.metric] < badge.target) continue;
            earnedIds.add(badge.id);
            earned.push({ badge: badge.id, ...source(badge) });
        }
    };

    for (const event of [...events].sort((a, b) => new Date(a.at) - new Date(b.at))) {
        const time = new Date(event.at).getTime();
        const players = event.kind === 'game' ? event.players ?? [] : [event.player].filter(Boolean);
        // the players of the day, and the weeks with a game or training in a row
        if (dayOf(time) !== day) {
            day = dayOf(time);
            dayPlayers = new Set();
        }
        players.forEach(id => dayPlayers.add(String(id)));
        metrics.bestNight = Math.max(metrics.bestNight, dayPlayers.size);
        const week = weekOf(time);
        if (week !== lastWeek) {
            metrics.weekStreak = lastWeek === week - 1 ? metrics.weekStreak + 1 : 1;
            metrics.bestWeekStreak = Math.max(metrics.bestWeekStreak, metrics.weekStreak);
            lastWeek = week;
        }

        // who tipped it: for a first the one who threw it, otherwise the first player of the game
        let firstBy = {};
        if (event.kind === 'game') {
            metrics.games += 1;
            metrics.darts += event.darts ?? 0;
            metrics.num180s += event.num180s ?? 0;
            types.add(isRulesGame(event.type) || CLUB_GAME_TYPES.includes(event.type) ? event.type : null);
            types.delete(null);
            metrics.gameTypes = types.size;
            for (const [key, metric] of Object.entries(FIRSTS)) {
                const by = event.firsts?.[key];
                if (by?.length && metrics[metric] === 0) {
                    metrics[metric] = 1;
                    firstBy[metric] = by[0];
                }
            }
        } else {
            kinds.add(event.trainingKind);
            metrics.trainingKinds = kinds.size;
        }
        award((badge) => ({
            earnedAt: event.at,
            sourceType: event.type,
            sourceId: event.id,
            player: firstBy[badge.metric] ?? (badge.metric === 'members' ? null : players[0] ?? null),
        }));
        firstBy = {};
    }

    // the members and the years count as of now: nobody tipped them
    metrics.members = members;
    metrics.years = createdAt ? Math.floor((now.getTime() - new Date(createdAt).getTime()) / YEAR_MS) : 0;
    award((badge) => ({
        earnedAt: badge.metric === 'years' ? new Date(new Date(createdAt).getTime() + badge.target * YEAR_MS) : now,
        sourceType: null,
        sourceId: null,
        player: null,
    }));
    return { earned, metrics };
};

/**
 * How far a goal is: what the club's games and trainings between its start and
 * end added to its metric. tallies: the club's game tallies; trainings: [{ at }]
 */
export const goalProgress = (goal, tallies, trainings) => {
    const from = new Date(goal.from).getTime();
    const until = goal.until ? new Date(goal.until).getTime() : Infinity;
    const within = (at) => { const time = new Date(at).getTime(); return time >= from && time <= until; };
    if (goal.metric === 'trainings') return trainings.filter(entry => within(entry.at)).length;
    return tallies.filter(tally => within(tally.at)).reduce((sum, tally) => sum + (goal.metric === 'games' ? 1 : tally[goal.metric] ?? 0), 0);
};

/**
 * The medals a club shows next to its name: the highest tiers first, then the newest.
 */
export const topClubBadges = (entries = [], count = 3) => entries
    .map(entry => ({ entry, badge: getClubBadge(entry.badge) }))
    .filter(({ badge }) => badge)
    .sort((a, b) => b.badge.tier - a.badge.tier || new Date(b.entry.earnedAt) - new Date(a.entry.earnedAt))
    .slice(0, count)
    .map(({ entry, badge }) => ({ ...publicClubBadge(badge), earnedAt: entry.earnedAt, nickname: entry.nickname ?? null }));

// eslint-disable-next-line no-unused-vars
export const publicClubBadge = ({ metric, ...badge }) => badge;
