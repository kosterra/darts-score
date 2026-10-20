/**
 * The notifications about what fair play did to games and trainings, for the
 * players in them who have an account and the admins of their club, never
 * for the one who did it. items: [{ type, id, club: { id, name }, summary, at,
 * players: [{ nickname, user }], admins: [userId], reasons: [title] }],
 * action: 'deleted' | 'repaired', actor: { id, name }.
 * Each recipient gets one notification per club: about the one game, or how
 * many went at once. → [{ user, kind, title, body, link, club, by, byName }]
 */

const KINDS = { deleted: 'fairPlayDeleted', repaired: 'fairPlayRepaired' };

const day = (at) => {
    const date = new Date(at);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
};

const what = (item) => item.type === 'training' ? 'training' : 'game';
const names = (players) => players.map(player => player.nickname).filter(Boolean).join(', ');

const single = (item, action, own) => {
    const subject = own ? `Your ${what(item)}` : `A ${what(item)} in ${item.club.name || 'your club'}`;
    const played = [item.summary, day(item.at) && `played on ${day(item.at)}`, names(item.players) && `by ${names(item.players)}`].filter(Boolean).join(', ');
    const why = item.reasons?.length ? ` Why: ${item.reasons.join('; ')}.` : '';
    if (action === 'repaired') {
        return {
            title: `${subject} was repaired`,
            body: `${played}.${why} The scores left were worked out again from the darts; the darts, the winner and the statistics stay as they were.`,
            link: item.type === 'training' ? null : `/stats/games/${item.type}/${item.id}`,
        };
    }
    return {
        title: `${subject} was deleted for fair play`,
        body: `${played}.${why} The badges earned in it were taken back; badges earned again elsewhere stay.`,
        link: null,
    };
};

const several = (items, action, club) => {
    const games = items.filter(item => item.type !== 'training').length;
    const trainings = items.length - games;
    const counted = [games && `${games} ${games === 1 ? 'game' : 'games'}`, trainings && `${trainings} ${trainings === 1 ? 'training' : 'trainings'}`].filter(Boolean).join(' and ');
    const list = items.slice(0, 5).map(item => `${item.summary} (${day(item.at)})`).join('; ');
    const more = items.length > 5 ? ` and ${items.length - 5} more` : '';
    return {
        title: `${counted} in ${club.name || 'your club'} ${action === 'repaired' ? 'repaired' : 'deleted for fair play'}`,
        body: `${list}${more}.${action === 'deleted' ? ' The badges earned in them were taken back.' : ''}`,
        link: null,
    };
};

export const fairPlayNotices = (items, action, actor) => {
    // recipient → club → { items, own }
    const byRecipient = new Map();
    const add = (userId, item, own) => {
        if (!userId || String(userId) === String(actor.id)) return;
        const key = String(userId);
        if (!byRecipient.has(key)) byRecipient.set(key, new Map());
        const clubs = byRecipient.get(key);
        if (!clubs.has(item.club.id)) clubs.set(item.club.id, { club: item.club, items: [], own: new Set() });
        const group = clubs.get(item.club.id);
        if (!group.items.includes(item)) group.items.push(item);
        if (own) group.own.add(item);
    };
    for (const item of items) {
        item.players.forEach(player => add(player.user, item, true));
        (item.admins ?? []).forEach(admin => add(admin, item, false));
    }

    const notices = [];
    for (const [user, clubs] of byRecipient) {
        for (const { club, items: clubItems, own } of clubs.values()) {
            const text = clubItems.length === 1 ? single(clubItems[0], action, own.has(clubItems[0])) : several(clubItems, action, club);
            notices.push({ user, kind: KINDS[action], ...text, club: club.id, by: actor.id, byName: actor.name });
        }
    }
    return notices;
};
