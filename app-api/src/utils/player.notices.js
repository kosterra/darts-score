import { getBadge, getShameBadge } from './badges.js';
import { deliverQuietly, deliverToContacts } from './notify.js';

/**
 * The notifications about a player's own progress: badges, the Hall of
 * Shame, levels, records and the club rating. A player with a login gets them
 * as they chose; one without, at the address their club keeps, if the club's
 * admins chose these mails.
 */

// to the account of the player, or to the address their club keeps
export const tellPlayer = async (player, notices) => {
    if (!notices.length) return;
    if (player.user) {
        // eslint-disable-next-line no-unused-vars
        await deliverQuietly(notices.map(({ contactTitle, ...notice }) => ({ ...notice, user: player.user })));
    } else if (!player.guest) {
        await deliverToContacts(notices.map(({ contactTitle, ...notice }) => ({ ...notice, title: contactTitle ?? notice.title, player: player._id })))
            .catch(() => {});
    }
};

const key = (entry) => `${entry.badge}|${entry.sourceId ?? ''}`;

/**
 * What a badge sync changed for a player, as notifications: the badges just
 * earned, the Hall of Shame badges they got and washed off, and a new level.
 * before / after: { shame, washes } of the player.
 */
export const progressNotices = (player, { fresh = [], shameBefore = [], shameAfter = [], washesBefore = [], washesAfter = [], level = null }) => {
    const nickname = player.nickname;
    const notices = [];
    const club = player.clubs?.[0] ?? null;
    for (const entry of fresh) {
        const badge = getBadge(entry.badge);
        if (!badge) continue;
        notices.push({
            kind: 'badgeEarned',
            title: `You earned the badge ${badge.title}`,
            contactTitle: `${nickname} earned the badge ${badge.title}`,
            body: badge.description,
            link: `/badges/${player._id}`,
            club,
        });
    }
    const had = new Set(shameBefore.map(key));
    for (const entry of shameAfter.filter(item => !had.has(key(item)))) {
        const badge = getShameBadge(entry.badge);
        if (!badge) continue;
        notices.push({
            kind: 'shameGot',
            title: `You landed in the Hall of Shame: ${badge.title}`,
            body: badge.description,
            link: `/badges/${player._id}`,
            club,
        });
    }
    const washed = new Set(washesBefore.map(key));
    for (const entry of washesAfter.filter(item => !washed.has(key(item)))) {
        const badge = getShameBadge(entry.badge);
        if (!badge) continue;
        notices.push({
            kind: 'shameWashed',
            title: `You washed off ${badge.title}`,
            body: badge.wash ?? badge.description,
            link: `/badges/${player._id}`,
            club,
        });
    }
    if (level) {
        notices.push({
            kind: 'levelUp',
            title: `You are now a ${level.name}`,
            contactTitle: `${nickname} is now a ${level.name}`,
            body: 'Your level grew with your games, wins, badges and skill.',
            link: '/me',
            club,
        });
    }
    return notices;
};

/**
 * After a training: a new personal best (told when someone else entered it,
 * e.g. the scorer of the club night) and a club record taken from someone
 * else (told to them). better(a, b): whether score a beats b; format: the
 * score as shown, e.g. "41.2 s"; previousBest / clubBest: the trainings that
 * held them, or null.
 */
export const noteTrainingRecords = async ({ req, player, title, score, better, format = String, previousBest, clubBest, link }) => {
    const db = (await import('../models/db.model.js')).default;
    const club = req.club._id;
    if (previousBest && better(score, previousBest.score) && String(player.user ?? '') !== String(req.user?._id ?? '')) {
        await tellPlayer(player, [{
            kind: 'personalBest',
            title: `New personal best in ${title}: ${format(score)}`,
            contactTitle: `${player.nickname} set a new personal best in ${title}: ${format(score)}`,
            body: `Your best before: ${format(previousBest.score)}.`,
            link,
            club,
        }]);
    }
    // a record from trainings the others do not see stays quiet
    const holderId = clubBest?.player?.id;
    if (!clubBest || !holderId || holderId === String(player._id) || player.privateTrainings || !better(score, clubBest.score)) return;
    const holder = await db.player.findById(holderId);
    if (!holder) return;
    await tellPlayer(holder, [{
        kind: 'recordBeaten',
        title: `${player.nickname} beat your club record in ${title}`,
        contactTitle: `${player.nickname} beat the club record of ${holder.nickname} in ${title}`,
        body: `${format(score)} against your ${format(clubBest.score)}.`,
        link,
        club,
    }]);
};

/**
 * Who moved up past whom in the club rating with a game: [{ id, place,
 * passed: [ids] }] for the players of the game who climbed, and per player
 * passed the ones who passed them. Places are only taken from
 * RATING_MIN_GAMES games on, when a rating is no longer provisional.
 * tallies: the club's game tallies; sourceId: the game.
 */
export const ratingMoves = (tallies, sourceId, { clubRatings, minGames }) => {
    const game = tallies.find(tally => tally.sourceId === sourceId);
    if (!game || game.friendly || (game.winners ?? []).length !== 1) return { climbed: [], passedBy: new Map(), after: [] };
    const placesOf = (ratings) => [...ratings]
        .filter(([, entry]) => entry.games >= minGames)
        .sort((a, b) => b[1].rating - a[1].rating)
        .map(([id]) => id);
    const before = placesOf(clubRatings(tallies.filter(tally => tally.sourceId !== sourceId)));
    const after = placesOf(clubRatings(tallies));
    const passedBy = new Map();
    const climbed = [];
    for (const id of new Set((game.players ?? []).map(String))) {
        const from = before.indexOf(id);
        const to = after.indexOf(id);
        // ranked before and after, and higher now
        if (from < 0 || to < 0 || to >= from) continue;
        // ahead before, behind now
        const passed = before.slice(0, from).filter(other => after.indexOf(other) > to);
        if (!passed.length) continue;
        climbed.push({ id, place: to + 1, passed });
        for (const other of passed) passedBy.set(other, [...(passedBy.get(other) ?? []), id]);
    }
    return { climbed, passedBy, after };
};

/**
 * After a game that counts for the club rating: the players of the game who
 * climbed hear whom they passed, and those they passed hear it too.
 */
export const noteRatingChanges = async (clubId, sourceId) => {
    const db = (await import('../models/db.model.js')).default;
    const { clubRatings, RATING_MIN_GAMES } = await import('./compare.js');
    const tallies = await db.clubTally.find({ club: clubId }, 'at players winners friendly sourceId').lean();
    const { climbed, passedBy, after } = ratingMoves(tallies, sourceId, { clubRatings, minGames: RATING_MIN_GAMES });
    if (!climbed.length) return;
    const ids = [...new Set([...climbed.map(entry => entry.id), ...passedBy.keys()])];
    const players = new Map((await db.player.find({ _id: { $in: ids } })).map(player => [String(player._id), player]));
    const name = (id) => players.get(id)?.nickname ?? '?';
    for (const { id, place, passed } of climbed) {
        const player = players.get(id);
        if (!player) continue;
        await tellPlayer(player, [{
            kind: 'ratingPassed',
            title: `You moved up to place ${place} in the club rating`,
            body: `You passed ${passed.map(name).join(', ')}.`,
            link: '/me',
            club: clubId,
        }]);
    }
    for (const [id, by] of passedBy) {
        const player = players.get(id);
        if (!player) continue;
        await tellPlayer(player, [{
            kind: 'ratingPassedBy',
            title: `${by.map(name).join(', ')} passed you in the club rating`,
            body: `You are now place ${after.indexOf(id) + 1}.`,
            link: '/me',
            club: clubId,
        }]);
    }
};
