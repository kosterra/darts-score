/**
 * Joining a club on one's own. A club decides how: 'open' (anyone with an
 * account joins at once), 'approval' (they ask, a club admin accepts or
 * declines) or 'closed' (only the admins add players).
 */

export const JOIN_POLICIES = ['open', 'approval', 'closed'];

// after a declined request, asking the same club again waits this long
export const ASK_AGAIN_AFTER_DAYS = 7;
// open requests one account may have at a time
export const MAX_OPEN_REQUESTS = 5;

const DAY = 24 * 60 * 60 * 1000;

/**
 * Why the user cannot join or ask, as { status, message }, or null when they can.
 * state: { policy, isMember, isGlobalAdmin, hasOpenRequest, declinedAt, openRequests, now }
 */
export const joinBlock = ({ policy = 'closed', isMember = false, isGlobalAdmin = false, hasOpenRequest = false, declinedAt = null, openRequests = 0, now = new Date() }) => {
    if (isGlobalAdmin) return { status: 403, message: 'Global admins look after the app and do not join clubs.' };
    if (isMember) return { status: 409, message: 'You are a member of this club already.' };
    if (!JOIN_POLICIES.includes(policy) || policy === 'closed') return { status: 403, message: 'This club does not take new members on their own. Ask one of its admins to add you.' };
    if (hasOpenRequest) return { status: 409, message: 'You asked to join this club already. The admins have not decided yet.' };
    if (policy === 'approval') {
        if (declinedAt && now.getTime() - new Date(declinedAt).getTime() < ASK_AGAIN_AFTER_DAYS * DAY) {
            return { status: 409, message: `The admins declined your last request. You can ask again ${ASK_AGAIN_AFTER_DAYS} days after it.` };
        }
        if (openRequests >= MAX_OPEN_REQUESTS) return { status: 429, message: `You have ${MAX_OPEN_REQUESTS} open requests. Wait for an answer, or take one back, before asking another club.` };
    }
    return null;
};

/**
 * The notifications about joining a club, never for the one who acted.
 * event: 'requested' (to the admins), 'joined' (an open club: to the admins),
 * 'accepted' or 'declined' (to the one who asked).
 * options: { request: { _id, club, user, name, nickname, message }, clubName, admins: [userId], actor: { id, name } }
 * → [{ user, kind, title, body, link, club, by, byName }]
 */
export const joinNotices = (event, { request, clubName = '', admins = [], actor }) => {
    const club = String(request.club);
    const notice = (user, kind, title, body, link) => ({ user, kind, title, body, link, club, by: actor.id, byName: actor.name });
    const toAdmins = (kind, title, body, link) => [...new Set(admins.map(String))]
        .filter(user => user !== String(actor.id))
        .map(user => notice(user, kind, title, body, link));
    const message = request.message ? ` "${request.message}"` : '';
    const where = clubName || 'your club';

    if (event === 'requested') {
        return toAdmins('joinRequested', `${request.name} asks to join ${where}`,
            `As ${request.nickname}.${message} Accept or decline on the players page.`, '/players?requests=1');
    }
    if (event === 'joined') {
        return toAdmins('clubJoined', `${request.name} joined ${where}`,
            `${request.name} plays as ${request.nickname}. Anyone with an account can join the club; change that in its settings under My clubs.`, '/players');
    }
    if (String(request.user) === String(actor.id)) return [];
    if (event === 'accepted') {
        return [notice(String(request.user), 'joinAccepted', `Welcome to ${clubName || 'the club'}`,
            `${actor.name} accepted your request. You play as ${request.nickname}.`, '/')];
    }
    if (event === 'declined') {
        return [notice(String(request.user), 'joinDeclined', `Your request to join ${clubName || 'the club'} was declined`,
            `${actor.name} declined it. You can ask again in ${ASK_AGAIN_AFTER_DAYS} days, or look for another club under My clubs.`, '/my-clubs')];
    }
    return [];
};
