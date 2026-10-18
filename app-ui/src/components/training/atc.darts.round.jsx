import { useEffect, useRef, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';

import { DARTS_PER_VISIT, TARGETS, targetLabel } from '../../utils/atc.darts';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import ATCTargetBoard from './atc.target.board';

const PlayerAvatar = ({ player, className = 'avatar-sm' }) => (
    <Avatar
        image={resolvePlayerImg(player.profileImg)}
        label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname ?? player.nickname ?? '?', player.lastname ?? '')}
        shape="circle"
        className={`${className} flex-shrink-0`}
    />
);

/**
 * A round with the fewest darts: whose turn it is, their target, and a Hit
 * and a Miss button for every dart. On a keyboard H and M work as well, and
 * Backspace takes the last dart back.
 *
 * players: in throwing order
 * round: { order, current, visit, players: { [id]: { target, darts, finished } } }
 * onDart(value): 0 a miss, 1 a hit; with rings 1 a single, 2 a double, 3 a treble
 * rings: Single, Double and Treble instead of Hit (S, D and T on a keyboard)
 * notice: a line above the buttons, e.g. that this is the last round
 * onCancel: without it the round cannot be cancelled here
 * bests: { [playerId]: fewest darts so far in this mode }, to show whether the
 * record is still in reach
 */
const ATCDartsRound = ({ players, mode, round, onDart, onUndo, canUndo, onCancel, rings = false, notice, bests = {} }) => {
    const [confirmCancel, setConfirmCancel] = useState(false);
    const playerOf = (id) => players.find(player => player.id === id) ?? { nickname: 'Unknown player' };
    const currentId = round.order[round.current];
    const current = round.players[currentId];
    const solo = round.order.length === 1;
    const onTheBull = !current.finished && current.target === TARGETS - 1;

    // who is furthest on, alone; a player who takes the lead flashes gold
    const progressOf = (id) => round.players[id].finished ? TARGETS + 1 : round.players[id].target;
    const top = Math.max(...round.order.map(progressOf));
    const leaders = round.order.filter(id => progressOf(id) === top);
    const leader = !solo && top > 0 && leaders.length === 1 ? leaders[0] : null;
    const previousLeader = useRef(undefined);
    const [flash, setFlash] = useState(null);
    useEffect(() => {
        if (previousLeader.current !== undefined && leader && leader !== previousLeader.current) setFlash({ id: leader, key: Date.now() });
        previousLeader.current = leader;
    }, [leader]);

    // the record with the fewest darts: still in reach while the darts so far and
    // one per target left do not go past it
    const best = bests[currentId];
    const recordInReach = best ? current.darts + (TARGETS - current.target) <= best : null;

    useEffect(() => {
        const onKey = (event) => {
            if (event.target.closest?.('input, textarea, [contenteditable="true"]') || event.metaKey || event.ctrlKey || event.altKey) return;
            const key = event.key.toLowerCase();
            const value = rings ? { m: 0, s: 1, h: 1, d: 2, t: 3 }[key] : { m: 0, h: 1 }[key];
            if (value !== undefined) onDart(value);
            else if (key === 'backspace' && canUndo) { event.preventDefault(); onUndo(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onDart, onUndo, canUndo, rings]);

    return (
        <div className="atc-round">
            {!solo &&
                <ol className="atc-round-players" aria-label="Players">
                    {round.order.map((id, index) => {
                        const state = round.players[id];
                        return (
                            <li
                                key={flash?.id === id ? `${id}-${flash.key}` : id}
                                className={`atc-round-player ${index === round.current ? 'is-current' : ''} ${state.finished ? 'is-finished' : ''} ${flash?.id === id ? 'is-taking-lead' : ''}`}
                            >
                                <PlayerAvatar player={playerOf(id)} />
                                <span className="atc-round-player-name">{playerOf(id).nickname}</span>
                                <span className="atc-round-player-state">
                                    {state.finished
                                        ? <><i className="pi pi-check me-1" aria-hidden="true" />{state.darts} darts</>
                                        : `${targetLabel(state.target, mode)} · ${state.darts} darts`}
                                </span>
                                <span className="atc-round-player-bar" aria-hidden="true"><span style={{ width: `${state.target / TARGETS * 100}%` }} /></span>
                            </li>
                        );
                    })}
                </ol>
            }

            <div className="atc-round-current" aria-live="polite">
                <div className="d-flex align-items-center gap-2">
                    <PlayerAvatar player={playerOf(currentId)} />
                    <span className="text-default fw-semibold">{solo ? playerOf(currentId).nickname : `${playerOf(currentId).nickname}'s turn`}</span>
                </div>
                <div className="atc-round-aim">
                    <div className="d-flex flex-column align-items-center">
                        {/* the next target ticks in like the hand of a clock */}
                        <div className={`atc-round-target ${onTheBull ? 'is-bull' : ''}`} key={`${currentId}-${current.target}`}>{targetLabel(current.target, mode)}</div>
                        {onTheBull && <span className="atc-bull-to-win">{solo ? 'Bull to finish' : 'Bull to win'}</span>}
                    </div>
                    <ATCTargetBoard target={current.target} mode={mode} />
                </div>
                <div className="atc-round-progress" aria-label={`${current.target} of ${TARGETS} targets hit`}>
                    {Array.from({ length: TARGETS }, (_, index) => (
                        <span key={index} className={index < current.target ? 'is-hit' : index === current.target ? 'is-current' : ''} />
                    ))}
                </div>
                <div className="d-flex align-items-center gap-3 text-faint fs-8">
                    <span className="atc-round-visit" aria-label={`Dart ${round.visit.length + 1} of ${DARTS_PER_VISIT}`}>
                        {Array.from({ length: DARTS_PER_VISIT }, (_, index) => (
                            <span key={index} className={index < round.visit.length ? (round.visit[index] ? 'is-hit' : 'is-miss') : ''}>
                                {rings && round.visit[index] > 1 ? ['', '', 'D', 'T'][round.visit[index]] : ''}
                            </span>
                        ))}
                    </span>
                    <span>{current.darts} {current.darts === 1 ? 'dart' : 'darts'}</span>
                    {best && <span className={`atc-record-pace ${recordInReach ? 'is-ahead' : 'is-behind'}`}>Best {best} · {recordInReach ? 'record in reach' : 'record out of reach'}</span>}
                </div>
            </div>

            {notice && <div className="atc-round-notice" role="status">{notice}</div>}

            {rings
                ? <div className="atc-round-buttons is-rings">
                    <Button type="button" label="Miss" icon="pi pi-times" severity="secondary" className="atc-round-button" onClick={() => onDart(0)} />
                    <Button type="button" label="Single" className="atc-round-button" onClick={() => onDart(1)} />
                    <Button type="button" label="Double" className="atc-round-button" onClick={() => onDart(2)} />
                    <Button type="button" label="Treble" className="atc-round-button" onClick={() => onDart(3)} />
                </div>
                : <div className="atc-round-buttons">
                    <Button type="button" label="Miss" icon="pi pi-times" severity="secondary" className="atc-round-button" onClick={() => onDart(0)} />
                    <Button type="button" label="Hit" icon="pi pi-check" className="atc-round-button" onClick={() => onDart(1)} />
                </div>
            }

            <div className="d-flex flex-wrap justify-content-center align-items-center gap-2 mt-2">
                <Button type="button" label="Undo" icon="pi pi-undo" size="small" text disabled={!canUndo} onClick={onUndo} />
                {onCancel && (confirmCancel
                    ? <>
                        <span className="text-faint fs-8">Cancel this round? Nothing is saved.</span>
                        <Button type="button" label="Yes, cancel" size="small" text severity="danger" onClick={onCancel} />
                        <Button type="button" label="No" size="small" text onClick={() => setConfirmCancel(false)} />
                    </>
                    : <Button type="button" label="Cancel round" icon="pi pi-times" size="small" text severity="danger" onClick={() => setConfirmCancel(true)} />
                )}
            </div>
        </div>
    );
};

export default ATCDartsRound;
