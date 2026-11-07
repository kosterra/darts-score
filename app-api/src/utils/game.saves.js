/**
 * Which saves of a running game the server takes. Every save sends the whole
 * game, so a save from a tab left open or a device that was offline may carry
 * an older state than the one stored: it must not undo what was played since,
 * nor open a game again that was decided (its tournament, league or board has
 * counted it already).
 */

export const STALE_SAVE = 'This game was changed on another device meanwhile. Its newest state is shown again.';
export const FINISHED_SAVE = 'This game is finished already and can no longer be changed.';

// the darts of a visit as stored: no empty ones
const dartsOf = (visit) => (visit?.darts ?? []).filter(dart => dart !== '' && dart != null).map(String);

const sameVisit = (a, b) => String(a?.player) === String(b?.player)
    && dartsOf(a).length === dartsOf(b).length
    && dartsOf(a).every((dart, index) => dart === dartsOf(b)[index]);

// "after" has every visit of "before", in order, and maybe more
export const extendsVisits = (before = [], after = []) => after.length >= before.length && before.every((visit, index) => sameVisit(visit, after[index]));

export const sameVisits = (a = [], b = []) => a.length === b.length && extendsVisits(a, b);

const timeOf = (value) => (value ? new Date(value).getTime() : NaN);

/**
 * Why a save of a game is refused, or null when it is taken. stored: the game
 * as stored; next: what would be stored (its visits and results worked out);
 * basedOn: the "updatedAt" of the stored state the app built on, when it says.
 *
 * A finished game takes only itself again (a save retried). A running game
 * takes more visits; fewer or other ones (an undo) only from the device that
 * has its newest state. An app that does not say what it built on (an older
 * version still open during an update) keeps being taken as before.
 */
export const saveConflict = (stored, next, basedOn) => {
    const before = Array.isArray(stored?.visits) ? stored.visits : null;
    const after = next?.visits ?? [];
    if (stored?.hasWinner) {
        // a game stored before visits: it stays decided
        if (!before) return next?.hasWinner ? null : FINISHED_SAVE;
        return sameVisits(before, after) ? null : FINISHED_SAVE;
    }
    if (!before || extendsVisits(before, after)) return null;
    if (basedOn == null) return null;
    return timeOf(basedOn) === timeOf(stored.updatedAt) ? null : STALE_SAVE;
};

/**
 * A finished game sent again as it is (a save retried, another device): its
 * timestamps stay, so its badges, goals and club tally do not see it as played
 * again. Changed in any way, "last updated" moves and its club tally is worked
 * out again (keeping the time it was first finished). A game stored before
 * visits is the same game moved to visits.
 */
export const unchangedFinish = (stored, next) => Boolean(stored?.hasWinner) && Boolean(next?.hasWinner)
    && (!Array.isArray(stored.visits) || sameVisits(stored.visits, next.visits ?? []))
    && JSON.stringify((stored.players ?? []).map(String)) === JSON.stringify((next.players ?? []).map(String));
