import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SelectButton } from 'primereact/selectbutton';
import { Avatar } from 'primereact/avatar';

import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import PlayLevelTag from '../elements/play.level.tag';
import GamePlayers from '../dashboard/widgets/game.players';

import { currentRound, roundSizes } from '../../rules/tournaments';
import { matchLevel, matchScore } from './match.actions';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { nameOf, roundName } from './tournament.words';

// what a match says next to its players; one called to a board says which
const stateOf = (match) => (match.status === 'ready' && match.board ? { label: t('Board {{number}}', { number: match.board }), className: 'is-ready' } : null) ?? ({
    running: { label: t('Live'), className: 'is-live' },
    walkover: { label: t('Walkover'), className: 'is-quiet' },
    bye: { label: t('Bye'), className: 'is-quiet' },
    ready: { label: t('Ready'), className: 'is-ready' },
})[match.status] ?? null;

/**
 * The players of a played (or running) match as the games list shows a game:
 * the names, the sets (over several sets) or legs won, the level each played
 * at; for the match dialog, where the tile has no room for the levels.
 */
export const MatchResult = ({ tournament, match }) => {
    const score = matchScore(match);
    if (!score || !match.players[0] || !match.players[1]) return null;
    const game = {
        type: 'x01',
        inSets: Boolean(score.sets),
        players: match.players.map((id, side) => ({ player: id, isWinner: match.winner === id, legs: score.legs?.[side] ?? 0, sets: score.sets?.[side] ?? 0, level: matchLevel(match, id) })),
    };
    const players = new Map(match.players.map(id => [id, { nickname: nameOf(tournament, id) }]));
    return <div className="match-result"><GamePlayers game={game} players={players} /></div>;
};

const PlayerRow = ({ tournament, match, side }) => {
    const id = match.players[side];
    const seed = id ? tournament.entries?.find(entry => entry.player === id)?.seed : null;
    const won = match.winner && match.winner === id;
    const lost = match.winner && id && match.winner !== id;
    // the sets won over several sets, else the legs
    const result = matchScore(match);
    const score = result?.sets?.[side] ?? result?.legs?.[side];
    const level = matchLevel(match, id);
    const mine = id && id === tournament.myPlayer;
    const player = id ? tournament.players?.[id] : null;
    // a match still to be played: the favourite's chance to win, from the club rating
    const chance = match.status === 'ready' && id ? match.chances?.[id] : undefined;
    const favourite = chance > 50;
    return (
        <span className={`bracket-player ${won ? 'is-winner' : ''} ${lost ? 'is-loser' : ''} ${mine ? 'is-mine' : ''}`}>
            <span className="bracket-name d-flex align-items-center gap-2 min-w-0">
                {/* the player's picture, small; a place still to be filled has none */}
                {player && <Avatar label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname, player.lastname)} image={resolvePlayerImg(player.profileImg)} shape="circle" className="avatar-xs bg-surface-high flex-shrink-0 bracket-avatar" />}
                <span className="text-truncate">{id ? nameOf(tournament, id) : <span className="text-faint">{match.bye ? '–' : t('to come')}</span>}</span>
                {seed && <span className="bracket-seed" title={t('Seed {{seed}}', { seed })}>{seed}</span>}
            </span>
            {/* the level played at, in a column of its own; left out where the tile is too narrow (the dialog has it) */}
            <span className="bracket-level">{level && <PlayLevelTag estimate={{ level }} compact />}</span>
            {score !== undefined && <span className="bracket-score">{score}</span>}
            {score === undefined && favourite && <span className="bracket-chance" title={t('Chance to win')}>{chance} %</span>}
            {score === undefined && !favourite && <span className="bracket-score" aria-hidden="true" />}
        </span>
    );
};

export const MatchCard = ({ tournament, match, onSelect }) => {
    const state = stateOf(match);
    // once it is all over a played match opens its statistics, a walkover nothing (no dialog to only read)
    const over = ['finished', 'cancelled'].includes(tournament.status);
    const stats = over && match.game ? `/stats/games/x01/${match.game}` : null;
    const clickable = !over && onSelect && !match.bye && (match.players[0] || match.players[1]);
    const Tag = stats ? Link : clickable ? 'button' : 'div';
    const action = stats ? { to: stats, 'aria-label': t('Statistics of the match') } : clickable ? { type: 'button', onClick: () => onSelect(match) } : {};
    return (
        <Tag {...action} className={`bracket-match ${match.bye ? 'is-bye' : ''} ${clickable || stats ? 'is-clickable' : ''} ${stats ? 'text-decoration-none' : ''}`}>
            <PlayerRow tournament={tournament} match={match} side={0} />
            <PlayerRow tournament={tournament} match={match} side={1} />
            {state && <span className={`bracket-state ${state.className}`}>{state.label}</span>}
        </Tag>
    );
};

/**
 * The bracket of a drawn tournament: every round as a column, the first on
 * the left (on a phone one round at a time, the current one first). A match
 * shows its players with their seeds, the sets or legs won (so far, while it
 * goes on), the level each played at where there is room, and whether it is
 * live, a bye or a walkover. onSelect(match): a tap on a match.
 */
const TournamentBracket = ({ tournament, onSelect }) => {
    const sizes = useMemo(() => roundSizes(tournament.draw?.size ?? 2), [tournament.draw?.size]);
    // during the groups the first round of the bracket is shown
    const round = currentRound(tournament.matches ?? []);
    const current = round === 0 ? sizes[0] : round ?? 2;
    const [shown, setShown] = useState(current);
    useEffect(() => setShown(current), [current]);
    const dayOf = (size) => tournament.rounds?.find(round => round.size === size)?.date;

    const column = (size) => (
        <div key={size} className="bracket-round">
            <div className="bracket-round-head">
                {/* as the facts of a header: the round as the small label, its day as the value */}
                <span className="text-faint fs-8">{roundName(size)}</span>
                <span className="text-default fw-semibold">{dayOf(size) ? formatDate(dayOf(size)) : t('Day open')}</span>
            </div>
            <div className="bracket-round-matches">
                {tournament.matches.filter(match => match.size === size).sort((a, b) => a.index - b.index).map(match => (
                    <div key={match.id} className="bracket-slot">
                        <MatchCard tournament={tournament} match={match} onSelect={onSelect} />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <>
            {/* a phone: one round at a time */}
            <div className="d-md-none d-flex flex-column gap-3">
                <SelectButton
                    value={shown}
                    options={sizes.map(size => ({ label: roundName(size), value: size }))}
                    onChange={(event) => event.value && setShown(event.value)}
                    className="p-selectbutton-pills flex-wrap"
                    aria-label={t('Round')}
                />
                <div className="bracket is-single">{column(shown)}</div>
            </div>
            <div className="d-none d-md-block bracket-scroll">
                <div className="bracket">{sizes.map(column)}</div>
            </div>
        </>
    );
};

export default TournamentBracket;
