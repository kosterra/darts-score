import { isDecided, nextOf } from '../../rules/tournaments';

// the result of a match: the score of its game once played, or so far while it goes on (a walkover has none)
export const matchScore = (match) => match.score ?? (match.status === 'running' ? match.live : null) ?? null;

// the level a player played the match's game at ('beginner' … 'elite'), when it was judged
export const matchLevel = (match, playerId) => (playerId ? match.playLevels?.find(entry => entry.player === playerId)?.level ?? null : null);

/**
 * What the dialog of a match offers, as the server allows it: a tournament or
 * league that is over (finished or cancelled) is read-only, so nothing is
 * started, decided, moved or walked on any more; only the result shows.
 */

// a tournament's match. isAdmin: an admin of the club asking; canManage: of the host club
export const tournamentMatchActions = ({ tournament, match, isAdmin = false, canManage = false }) => {
    const over = ['finished', 'cancelled'].includes(tournament.status);
    const both = Boolean(match.players[0] && match.players[1] && !match.bye);
    const mine = match.players.includes(tournament.myPlayer);
    const canStart = !over && (isAdmin || mine) && match.status === 'ready';
    const next = nextOf(match);
    const nextStarted = next && ['running', 'done', 'walkover'].includes(tournament.matches.find(entry => entry.id === next.id)?.status);
    // a group result can change until the bracket is filled from the groups
    const changeable = match.group != null ? !tournament.draw?.knockoutAt : !isDecided(match) || !nextStarted;
    return {
        over,
        walkOn: !over && both && ['ready', 'running'].includes(match.status),
        canStart,
        // who may start it, for those who may not
        startHint: !over && !canStart && match.status === 'ready',
        // only the host club's admins decide a match without a game
        canDecide: !over && canManage && both && changeable,
    };
};

// a league's match: only while the season runs
export const leagueMatchActions = ({ league, match, isAdmin = false }) => {
    const running = league.status === 'running';
    const canStart = running && (isAdmin || match.players.includes(league.myPlayer)) && match.status === 'ready';
    return {
        over: ['finished', 'cancelled'].includes(league.status),
        walkOn: running && ['ready', 'running'].includes(match.status),
        canStart,
        startHint: running && !canStart && match.status === 'ready',
        canMove: isAdmin && running && !isDecided(match),
        canDecide: isAdmin && running && match.status !== 'done',
    };
};
