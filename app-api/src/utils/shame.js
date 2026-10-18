import { SHAME_BADGES } from './badges.js';

const time = (date) => new Date(date).getTime();
const latest = (entries) => entries.reduce((last, entry) => (!last || time(entry.at) > time(last.at) ? entry : last), null);

/**
 * Whether the shame in "entry" was washed off afterwards by the player.
 */
const washedAfter = (washes, badge, entry) => washes.some(wash => wash.badge === badge && time(wash.at) >= time(entry.at) && wash.sourceId !== entry.sourceId);

/**
 * One player's Hall of Shame: per badge how often it happened, the last time,
 * and whether it is still on them (not washed off since).
 */
export const personalShame = (player) => {
    const shame = player.shame ?? [];
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
 * the next one.
 */
export const clubShameHolders = (players, clubId) => {
    const club = String(clubId);
    return SHAME_BADGES.map(badge => {
        let holder = null;
        for (const player of players) {
            const last = latest((player.shame ?? []).filter(entry => entry.badge === badge.id && entry.club === club));
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
