/**
 * Requests to delete a game: a player asks, the other players of the game
 * agree or decline, the club admins decide. When every player of the game
 * has a login and all of them agreed, the game goes without an admin.
 */

const day = (at) => {
    const date = new Date(at);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
};

/**
 * How the players answered: { agreed, declined, total, withoutLogin, everyoneAgreed }.
 */
export const tally = (request) => {
    const players = request.players ?? [];
    return {
        agreed: players.filter(player => player.answer === 'agreed').length,
        declined: players.filter(player => player.answer === 'declined').length,
        total: players.length,
        withoutLogin: players.filter(player => !player.user).length,
        everyoneAgreed: players.length > 0 && players.every(player => player.user && player.answer === 'agreed'),
    };
};

// the game in one line: "X01 · 501, played on 12.10.2026"
const played = (request) => [request.summary, request.playedAt && `played on ${day(request.playedAt)}`].filter(Boolean).join(', ');

const KINDS = { requested: 'deletionRequested', deleted: 'deletionDone', kept: 'deletionKept' };

/**
 * The notifications about a request, for the players of the game with a
 * login, the one who asked and the club admins, never for the one who acted.
 * event: 'requested' | 'deleted' | 'kept'. options: { actor: { id, name },
 * clubName, admins: [userId], auto: deleted because everyone agreed }.
 * → [{ user, kind, title, body, link, club, by, byName }]
 */
export const deletionNotices = (event, request, { actor, clubName = '', admins = [], auto = false }) => {
    const id = String(request._id ?? request.id);
    const by = String(request.by);
    const players = (request.players ?? []).filter(player => player.user).map(player => String(player.user));
    const recipients = new Map();
    const add = (user, role) => {
        if (!user || user === String(actor.id) || recipients.has(user)) return;
        recipients.set(user, role);
    };
    add(by, 'asker');
    players.forEach(user => add(user, 'player'));
    admins.map(String).forEach(user => add(user, 'admin'));

    const what = played(request);
    const reason = request.reason ? ` Reason: ${request.reason}.` : '';
    const count = tally(request);
    const link = `/games?deletion=${id}`;

    const text = (role) => {
        if (event === 'requested') {
            if (role === 'admin') {
                const without = count.withoutLogin ? ` ${count.withoutLogin === 1 ? 'One player has' : `${count.withoutLogin} players have`} no login, so an admin decides.` : '';
                return {
                    title: `${request.byName} asks to delete a game in ${clubName || 'your club'}`,
                    body: `${what}.${reason}${without} Delete the game or keep it.`,
                    link,
                };
            }
            return {
                title: `${request.byName} asks to delete a game you played`,
                body: `${what}.${reason} Agree or decline; when every player agrees, the game is deleted, otherwise a club admin decides.`,
                link,
            };
        }
        const subject = role === 'asker' ? 'The game you asked to delete' : role === 'player' ? 'A game you played' : `A game in ${clubName || 'your club'}`;
        if (event === 'deleted') {
            return {
                title: `${subject} was deleted`,
                body: `${what}. ${auto ? 'Every player agreed.' : `Deleted by ${actor.name}.`} The badges earned in it were taken back.`,
                link: null,
            };
        }
        return {
            title: `${subject} stays`,
            body: `${what}. ${actor.name} kept it${request.note ? `: ${request.note}` : ''}.`,
            link: `/stats/games/${request.type}/${request.game}`,
        };
    };

    return [...recipients].map(([user, role]) => ({
        user, kind: KINDS[event], ...text(role), club: String(request.club), by: actor.id, byName: actor.name,
    }));
};
