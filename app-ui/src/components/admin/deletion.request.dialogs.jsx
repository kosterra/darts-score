import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';

import DeletionRequestService from '../../services/deletion.request.service';
import { formatDateTime } from './admin.format';

const DIALOG_STYLE = { width: 'min(34rem, 95vw)' };

// how a player answered, as a label
const AnswerTag = ({ player }) => {
    if (!player.hasLogin) return <Tag value="No login" />;
    if (player.answer === 'agreed') return <Tag severity="success" value="Agreed" />;
    if (player.answer === 'declined') return <Tag severity="danger" value="Declined" />;
    return <Tag value="Not answered" />;
};

const CLOSED = {
    deleted: (request) => request.decidedByName ? `${request.decidedByName} deleted the game.` : 'Every player agreed, so the game was deleted.',
    kept: (request) => `${request.decidedByName} kept the game${request.note ? `: ${request.note}` : '.'}`,
    withdrawn: () => 'The request was taken back.',
};

/**
 * Asking to delete a game one played, with an optional reason. game: the
 * game of the games list ({ type, id }), title: what it was.
 */
export const AskDeletionDialog = ({ game, title, onHide, onAsked, onError }) => {
    const [reason, setReason] = useState('');
    const [sending, setSending] = useState(false);

    const send = async () => {
        setSending(true);
        try {
            const request = await DeletionRequestService.ask(game.type, game.id, reason.trim());
            setReason('');
            onAsked(request);
        } catch (error) {
            onError(error.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog header="Ask to delete this game" visible={Boolean(game)} onHide={onHide} style={DIALOG_STYLE} blockScroll draggable={false}>
            <div className="d-flex flex-column gap-4">
                <div className="d-flex flex-column gap-1">
                    <span className="text-default fw-semibold">{title}</span>
                    {game && <span className="text-faint fs-8">Played on {formatDateTime(game.updatedAt ?? game.createdAt)}</span>}
                </div>
                <p className="text-subtle fs-7 m-0">The other players of the game are asked to agree. When every player has a login and agrees, the game is deleted with the badges earned in it; otherwise a club admin decides.</p>
                <div className="d-flex flex-column gap-2">
                    <label htmlFor="deletion-reason" className="text-subtle fs-7">Why (optional)</label>
                    <InputTextarea id="deletion-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} autoResize placeholder="e.g. entered by mistake, a test game" className="w-100" />
                </div>
                <div className="d-flex justify-content-end gap-3">
                    <Button type="button" label="Cancel" severity="secondary" size="small" onClick={onHide} />
                    <Button type="button" label="Ask to delete" icon="pi pi-flag" severity="danger" size="small" loading={sending} onClick={send} />
                </div>
            </div>
        </Dialog>
    );
};

/**
 * A request to delete a game: who asked and why, how the players answered,
 * and what the user can do: answer for their players, take their request
 * back, or as a club admin delete the game or keep it.
 */
export const DeletionRequestDialog = ({ request, canDecide, onHide, onChanged, onError }) => {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(null);

    if (!request) return null;
    const open = request.status === 'open';
    const mine = request.players.filter(player => player.mine);
    const myAnswer = mine[0]?.answer ?? null;

    const run = async (what, call) => {
        setBusy(what);
        try {
            const changed = await call();
            setNote('');
            onChanged(changed, what);
        } catch (error) {
            onError(error.message);
        } finally {
            setBusy(null);
        }
    };

    return (
        <Dialog header="Request to delete a game" visible onHide={onHide} style={DIALOG_STYLE} blockScroll draggable={false}>
            <div className="d-flex flex-column gap-4">
                <div className="d-flex flex-column gap-1">
                    <span className="text-default fw-semibold">{request.summary}</span>
                    {request.playedAt && <span className="text-faint fs-8">Played on {formatDateTime(request.playedAt)}</span>}
                </div>
                <div className="d-flex flex-column gap-1">
                    <span className="text-subtle fs-7">{request.mine ? 'You asked' : `${request.byName} asked`} on {formatDateTime(request.at)}</span>
                    {request.reason
                        ? <span className="text-default fs-7">{request.reason}</span>
                        : <span className="text-faint fs-7">No reason given.</span>}
                </div>
                <div className="d-flex flex-column gap-2">
                    <span className="text-subtle fs-7">The players · {request.agreed} of {request.total} agreed</span>
                    {request.players.map(player => (
                        <div key={player.player} className="d-flex align-items-center justify-content-between gap-3 bg-surface-raised rounded-2 px-3 py-2">
                            <span className="text-default fw-semibold">{player.nickname || 'Unknown'}{player.mine && <span className="text-faint fw-normal fs-8"> · you</span>}</span>
                            <AnswerTag player={player} />
                        </div>
                    ))}
                    {open && request.withoutLogin > 0 && <span className="text-faint fs-8">A player without a login cannot answer, so a club admin decides.</span>}
                </div>

                {!open && <p className="text-default fs-7 m-0">{CLOSED[request.status]?.(request)}</p>}

                {open && mine.length > 0 && !request.mine && (
                    <div className="d-flex flex-wrap align-items-center justify-content-end gap-3">
                        <span className="text-subtle fs-7 me-auto">{myAnswer ? 'You can change your answer.' : 'Do you agree to delete it?'}</span>
                        <Button type="button" label="Decline" severity="secondary" size="small" disabled={myAnswer === 'declined'} loading={busy === 'declined'} onClick={() => run('declined', () => DeletionRequestService.answer(request.id, false))} />
                        <Button type="button" label="Agree" icon="pi pi-check" size="small" disabled={myAnswer === 'agreed'} loading={busy === 'agreed'} onClick={() => run('agreed', () => DeletionRequestService.answer(request.id, true))} />
                    </div>
                )}

                {open && request.mine && !canDecide && (
                    <div className="d-flex justify-content-end">
                        <Button type="button" label="Take back" icon="pi pi-undo" severity="secondary" size="small" loading={busy === 'withdrawn'} onClick={() => run('withdrawn', () => DeletionRequestService.withdraw(request.id))} />
                    </div>
                )}

                {open && canDecide && (
                    <div className="d-flex flex-column gap-3">
                        <div className="d-flex flex-column gap-2">
                            <label htmlFor="deletion-note" className="text-subtle fs-7">Note for the players (optional)</label>
                            <InputTextarea id="deletion-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} autoResize className="w-100" />
                        </div>
                        <div className="d-flex flex-wrap justify-content-end gap-3">
                            <Button type="button" label="Keep the game" severity="secondary" size="small" loading={busy === 'kept'} onClick={() => run('kept', () => DeletionRequestService.decide(request.id, false, note.trim()))} />
                            <Button type="button" label="Delete the game" icon="pi pi-trash" severity="danger" size="small" loading={busy === 'deleted'} onClick={() => run('deleted', () => DeletionRequestService.decide(request.id, true, note.trim()))} />
                        </div>
                    </div>
                )}
            </div>
        </Dialog>
    );
};
