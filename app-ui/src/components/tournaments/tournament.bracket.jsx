import { useEffect, useMemo, useState } from 'react';
import { SelectButton } from 'primereact/selectbutton';

import { currentRound, roundSizes } from '../../rules/tournaments';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { nameOf, roundName } from './tournament.words';

// what a match says next to its players
const stateOf = (match) => ({
    running: { label: t('Live'), className: 'is-live' },
    walkover: { label: t('Walkover'), className: 'is-quiet' },
    bye: { label: t('Bye'), className: 'is-quiet' },
    ready: { label: t('Ready'), className: 'is-ready' },
})[match.status] ?? null;

const PlayerRow = ({ tournament, match, side }) => {
    const id = match.players[side];
    const seed = id ? tournament.entries?.find(entry => entry.player === id)?.seed : null;
    const won = match.winner && match.winner === id;
    const lost = match.winner && id && match.winner !== id;
    const score = match.score?.sets?.[side] ?? match.score?.legs?.[side];
    const mine = id && id === tournament.myPlayer;
    return (
        <span className={`bracket-player ${won ? 'is-winner' : ''} ${lost ? 'is-loser' : ''} ${mine ? 'is-mine' : ''}`}>
            <span className="bracket-name text-truncate">
                {id ? nameOf(tournament, id) : <span className="text-faint">{match.bye ? '–' : t('to come')}</span>}
                {seed && <span className="bracket-seed" title={t('Seed {{seed}}', { seed })}>{seed}</span>}
            </span>
            {score !== undefined && <span className="bracket-score">{score}</span>}
        </span>
    );
};

const MatchCard = ({ tournament, match, onSelect }) => {
    const state = stateOf(match);
    const clickable = onSelect && !match.bye && (match.players[0] || match.players[1]);
    const Tag = clickable ? 'button' : 'div';
    return (
        <Tag type={clickable ? 'button' : undefined} className={`bracket-match ${match.bye ? 'is-bye' : ''} ${clickable ? 'is-clickable' : ''}`} onClick={clickable ? () => onSelect(match) : undefined}>
            <PlayerRow tournament={tournament} match={match} side={0} />
            <PlayerRow tournament={tournament} match={match} side={1} />
            {state && <span className={`bracket-state ${state.className}`}>{state.label}</span>}
        </Tag>
    );
};

/**
 * The bracket of a drawn tournament: every round as a column, the first on
 * the left (on a phone one round at a time, the current one first). A match
 * shows its players with their seeds, the score of a decided one, and
 * whether it is live, a bye or a walkover. onSelect(match): a tap on a match.
 */
const TournamentBracket = ({ tournament, onSelect }) => {
    const sizes = useMemo(() => roundSizes(tournament.draw?.size ?? 2), [tournament.draw?.size]);
    const current = currentRound(tournament.matches ?? []) ?? 2;
    const [shown, setShown] = useState(current);
    useEffect(() => setShown(current), [current]);
    const dayOf = (size) => tournament.rounds?.find(round => round.size === size)?.date;

    const column = (size) => (
        <div key={size} className="bracket-round">
            <div className="bracket-round-head">
                <span className="text-default fw-semibold fs-7">{roundName(size)}</span>
                {dayOf(size) && <span className="text-faint fs-8">{formatDate(dayOf(size))}</span>}
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
