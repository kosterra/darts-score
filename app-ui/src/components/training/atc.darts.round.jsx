import { useEffect, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';

import { DARTS_PER_VISIT, TARGETS, targetLabel } from '../../utils/atc.darts';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

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
 * round: from useAtcRound
 */
const ATCDartsRound = ({ players, mode, round, onDart, onUndo, canUndo, onCancel }) => {
    const [confirmCancel, setConfirmCancel] = useState(false);
    const playerOf = (id) => players.find(player => player.id === id) ?? { nickname: 'Unknown player' };
    const currentId = round.order[round.current];
    const current = round.players[currentId];
    const solo = round.order.length === 1;

    useEffect(() => {
        const onKey = (event) => {
            if (event.target.closest?.('input, textarea, [contenteditable="true"]') || event.metaKey || event.ctrlKey || event.altKey) return;
            const key = event.key.toLowerCase();
            if (key === 'h') onDart(true);
            else if (key === 'm') onDart(false);
            else if (key === 'backspace' && canUndo) { event.preventDefault(); onUndo(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onDart, onUndo, canUndo]);

    return (
        <div className="atc-round">
            {!solo &&
                <ol className="atc-round-players" aria-label="Players">
                    {round.order.map((id, index) => {
                        const state = round.players[id];
                        return (
                            <li key={id} className={`atc-round-player ${index === round.current ? 'is-current' : ''} ${state.finished ? 'is-finished' : ''}`}>
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
                <div className="atc-round-target" key={`${currentId}-${current.target}`}>{targetLabel(current.target, mode)}</div>
                <div className="atc-round-progress" aria-label={`${current.target} of ${TARGETS} targets hit`}>
                    {Array.from({ length: TARGETS }, (_, index) => (
                        <span key={index} className={index < current.target ? 'is-hit' : index === current.target ? 'is-current' : ''} />
                    ))}
                </div>
                <div className="d-flex align-items-center gap-3 text-faint fs-8">
                    <span className="atc-round-visit" aria-label={`Dart ${round.visit.length + 1} of ${DARTS_PER_VISIT}`}>
                        {Array.from({ length: DARTS_PER_VISIT }, (_, index) => (
                            <span key={index} className={index < round.visit.length ? (round.visit[index] ? 'is-hit' : 'is-miss') : ''} />
                        ))}
                    </span>
                    <span>{current.darts} {current.darts === 1 ? 'dart' : 'darts'}</span>
                </div>
            </div>

            <div className="atc-round-buttons">
                <Button type="button" label="Miss" icon="pi pi-times" severity="secondary" className="atc-round-button" onClick={() => onDart(false)} />
                <Button type="button" label="Hit" icon="pi pi-check" severity="success" className="atc-round-button" onClick={() => onDart(true)} />
            </div>

            <div className="d-flex flex-wrap justify-content-center align-items-center gap-2 mt-2">
                <Button type="button" label="Undo" icon="pi pi-undo" size="small" text disabled={!canUndo} onClick={onUndo} />
                {confirmCancel
                    ? <>
                        <span className="text-faint fs-8">Cancel this round? Nothing is saved.</span>
                        <Button type="button" label="Yes, cancel" size="small" text severity="danger" onClick={onCancel} />
                        <Button type="button" label="No" size="small" text onClick={() => setConfirmCancel(false)} />
                    </>
                    : <Button type="button" label="Cancel round" icon="pi pi-times" size="small" text severity="danger" onClick={() => setConfirmCancel(true)} />
                }
            </div>
        </div>
    );
};

export default ATCDartsRound;
