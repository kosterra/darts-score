import { SHAME_BADGES } from './badges.js';

const time = (date) => new Date(date).getTime();

// clubs may leave children out of the Hall of Shame: everyone under this age,
// unless the club sets another one
export const SHAME_MIN_AGE = 16;

/**
 * The age from which players count for a club's Hall of Shame, or null when
 * the club leaves nobody out.
 */
export const shameMinAgeOf = (club) => club?.shameWithoutChildren === true ? (club.shameMinAge ?? SHAME_MIN_AGE) : null;

/**
 * From when a player counts for the Hall of Shame of a club that leaves
 * children out: their birthday at "minAge"; null means always.
 */
export const shameCountsFrom = (player, minAge) => {
    if (!minAge || !player.dateOfBirth) return null;
    const birthday = new Date(player.dateOfBirth);
    birthday.setFullYear(birthday.getFullYear() + minAge);
    return birthday;
};

/**
 * Whether a player is left out of the Hall of Shame: without a date of birth
 * (their age is unknown, so they might be a child), or still a child in a
 * club that leaves children out.
 */
export const isShameChild = (player, minAge, now = new Date()) => {
    if (!player.dateOfBirth) return true;
    const from = shameCountsFrom(player, minAge);
    return Boolean(from) && time(from) > time(now);
};

// what happened since the player counts (from their 16th birthday, if so)
const countedShame = (player, from) => (player.shame ?? []).filter(entry => !from || time(entry.at) >= time(from));
const latest = (entries) => entries.reduce((last, entry) => (!last || time(entry.at) > time(last.at) ? entry : last), null);

/**
 * Whether the shame in "entry" was washed off afterwards by the player.
 */
const washedAfter = (washes, badge, entry) => washes.some(wash => wash.badge === badge && time(wash.at) >= time(entry.at) && wash.sourceId !== entry.sourceId);

/**
 * One player's Hall of Shame: per badge how often it happened, the last time,
 * and whether it is still on them (not washed off since).
 */
export const personalShame = (player, { from = null } = {}) => {
    const shame = countedShame(player, from);
    const washes = player.shameWashes ?? [];
    return SHAME_BADGES.map(badge => {
        const mine = shame.filter(entry => entry.badge === badge.id);
        const last = latest(mine);
        const lastWash = latest(washes.filter(wash => wash.badge === badge.id));
        return {
            id: badge.id,
            count: mine.reduce((sum, entry) => sum + (entry.count ?? 1), 0),
            lastAt: last?.at ?? null,
            active: Boolean(last) && !washedAfter(washes, badge.id, last),
            washedAt: last && lastWash && time(lastWash.at) >= time(last.at) ? lastWash.at : null,
        };
    });
};

/**
 * Who holds each shame badge in a club: the player who did it last in the
 * club's games, unless they washed it off since; then nobody holds it until
 * the next one. "minAge" leaves out what players did before that age.
 */
export const clubShameHolders = (players, clubId, { minAge = null } = {}) => {
    const club = String(clubId);
    return SHAME_BADGES.map(badge => {
        let holder = null;
        for (const player of players) {
            // a child or a player of unknown age never holds one, and what they did as a child never counts
            if (!player.dateOfBirth) continue;
            const from = shameCountsFrom(player, minAge);
            const last = latest(countedShame(player, from).filter(entry => entry.badge === badge.id && entry.club === club));
            if (last && (!holder || time(last.at) > time(holder.entry.at))) holder = { player, entry: last };
        }
        if (!holder || washedAfter(holder.player.shameWashes ?? [], badge.id, holder.entry)) return { id: badge.id, holder: null };
        return {
            id: badge.id,
            holder: String(holder.player._id),
            since: holder.entry.at,
            sourceType: holder.entry.sourceType,
            sourceId: holder.entry.sourceId,
        };
    });
};
