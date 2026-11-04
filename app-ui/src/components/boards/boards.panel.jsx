import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { confirmDialog } from 'primereact/confirmdialog';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';

import BigScreenButton from '../screen/big.screen.button';
import SaveStatus from '../elements/save.status';
import { BOARD_STATUS } from './board.words';
import { MAX_BOARDS, activeBoards } from '../../rules/boards';
import { playPath } from '../../utils/game.paths';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { t } from '../../utils/i18n';

const PlayerAvatar = ({ player }) => (
    <Avatar label={player?.profileImg ? undefined : resolvePlayerInitials(player?.firstname ?? player?.nickname, player?.lastname)} image={resolvePlayerImg(player?.profileImg)} shape="circle" className="avatar-sm bg-surface-high flex-shrink-0" />
);

// moving on a phone: the boards to choose from in a dialog
const MoveDialog = ({ move, options, onMove, onHide }) => (
    <Dialog header={t('Move to board')} visible={Boolean(move)} onHide={onHide} className="tournament-dialog" dismissableMask>
        {move &&
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">{move.names}</span>
                <SelectButton value={null} options={options(move.item)} onChange={(event) => { if (event.value) { onMove(move.item.key, event.value); onHide(); } }} optionDisabled="disabled" className="p-selectbutton-pills flex-wrap" aria-label={t('Move to board')} />
            </div>}
    </Dialog>
);

/**
 * The boards of a tournament or a club night: a card per board with the
 * match on it (called or live) and Start or Watch, the queue under them in
 * the order they are called, and those held back. The admins (canRun) set
 * how many boards are played on, take a board out (behind a confirm), move a
 * match to another board and hold one back; on a phone one column, the
 * player's own board first, moving through a dialog.
 *
 * view: the boardView of the API; itemOf(key) → { key, players: [ids],
 * status, detail, game: { kind, id } | null }; playerOf(id) → the player;
 * canStart(item); onStart(item); onCount(count) (optional: the count set
 * here, with + and −), onOut(number, out),
 * onMove(key, board), onHold(key, held), onCancel(key) (optional, a pairing
 * of a club night taken out); countSave: the save of the count (SaveStatus);
 * screen: { create, send } for the big screen.
 */
const BoardsPanel = ({ view, itemOf, playerOf, myPlayer, canRun, canStart, onStart, onCount, onOut, onMove, onHold, onCancel, countSave, screen, busy = '', hint }) => {
    const [move, setMove] = useState(null);
    const nameOf = (id) => playerOf(id)?.nickname ?? '?';
    const namesOf = (item) => item.players.map(nameOf).join(' – ');
    const mine = (item) => Boolean(myPlayer) && item?.players.includes(myPlayer);
    const active = activeBoards(view);
    // where a match can go: a board played on that is not its own and has no game going on
    const moveOptions = (item) => active.filter(number => number !== item.board).map(number => ({
        label: t('Board {{number}}', { number }), value: number,
        disabled: view.boards.find(board => board.number === number)?.status === 'playing',
    }));

    const confirmOut = (number) => confirmDialog({
        header: t('Take the board out'),
        message: t('Take board {{number}} out? Its match goes back to the queue.', { number }),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: t('Take the board out'), rejectLabel: t('Cancel'),
        acceptClassName: 'p-button-danger p-button-sm', rejectClassName: 'p-button-secondary p-button-sm',
        accept: () => onOut(number, true),
    });
    const confirmCancel = (item) => confirmDialog({
        header: t('Take out'),
        message: t('Take {{names}} out of the queue?', { names: namesOf(item) }),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: t('Take out'), rejectLabel: t('Cancel'),
        acceptClassName: 'p-button-danger p-button-sm', rejectClassName: 'p-button-secondary p-button-sm',
        accept: () => onCancel(item.key),
    });

    // the admin's way to move a match: a dropdown, on a phone a button to the dialog
    const moveTool = (item) => {
        const options = moveOptions(item);
        if (!options.length) return null;
        return (
            <>
                <Dropdown value={null} options={options} optionDisabled="disabled" onChange={(event) => onMove(item.key, event.value)} placeholder={t('Move to board')} aria-label={t('Move to board')} className="p-inputtext-sm d-none d-md-inline-flex board-move" disabled={busy === item.key} />
                <Button label={t('Move to board')} icon="pi pi-arrow-right" size="small" severity="secondary" text className="d-md-none" onClick={() => setMove({ item, names: namesOf(item) })} />
            </>
        );
    };

    const players = (item) => (
        <div className="board-card-players">
            {item.players.map(id => (
                <span key={id} className={`board-player ${id === myPlayer ? 'is-mine' : ''}`}>
                    <PlayerAvatar player={playerOf(id)} />
                    <span className="board-player-name text-truncate">{nameOf(id)}</span>
                </span>
            ))}
        </div>
    );

    const card = (board) => {
        const item = board.key ? itemOf(board.key) : null;
        const status = BOARD_STATUS[board.out && board.status !== 'playing' ? 'out' : board.status] ?? BOARD_STATUS.free;
        return (
            <div key={board.number} className={`board-card ${board.out ? 'is-out' : ''} ${mine(item) ? 'is-mine' : ''}`} data-board={board.number}>
                <div className="board-card-head">
                    <span className="d-flex flex-column min-w-0">
                        <span className="text-default fs-5 fw-semibold">{t('Board {{number}}', { number: board.number })}</span>
                        {item?.detail && <span className="text-faint fs-8">{item.detail}</span>}
                    </span>
                    <span className="d-flex align-items-center gap-1">
                        <Tag value={status.label} severity={status.severity} />
                        {canRun && !board.out &&
                            <Button icon="pi pi-ban" size="small" severity="danger" text rounded className="board-card-out" aria-label={t('Take the board out')} title={t('Take the board out')} onClick={() => confirmOut(board.number)} />}
                    </span>
                </div>
                {item ? players(item) : <span className="board-card-players board-card-free">{board.out ? t('Not played on for now.') : t('Waiting for the next match.')}</span>}
                <div className="board-card-actions">
                    {item && board.status === 'called' && canStart(item) &&
                        <Button label={t('Start the match')} icon="pi pi-play" size="small" loading={busy === `start-${item.key}`} onClick={() => onStart(item)} />}
                    {item && board.status === 'playing' && item.game &&
                        <Link to={playPath(item.game.kind, item.game.id)} className={`p-button p-button-sm text-decoration-none ${mine(item) || canRun ? '' : 'p-button-outlined'}`}>
                            <i className="pi pi-play me-2" aria-hidden="true" />{mine(item) || canRun ? t('Go on with the match') : t('Watch the match')}
                        </Link>}
                    {canRun && item && board.status === 'called' &&
                        <>
                            {moveTool(item)}
                            <Button label={t('Hold back')} icon="pi pi-pause" size="small" severity="secondary" text loading={busy === item.key} onClick={() => onHold(item.key, true)} />
                        </>}
                    {canRun && board.out &&
                        <Button label={t('Put the board back')} icon="pi pi-replay" size="small" severity="secondary" className="ms-auto" onClick={() => onOut(board.number, false)} />}
                </div>
            </div>
        );
    };

    const queueRow = (key, index, held = false) => {
        const item = itemOf(key);
        if (!item) return null;
        return (
            <li key={key} className={`board-queue-row ${held ? 'is-held' : ''} ${mine(item) ? 'is-mine' : ''}`}>
                <span className="board-queue-place">{held ? <i className="pi pi-pause" aria-hidden="true" /> : index + 1}</span>
                <span className="d-none d-sm-flex align-items-center gap-1 flex-shrink-0" aria-hidden="true">
                    {item.players.map(id => <PlayerAvatar key={id} player={playerOf(id)} />)}
                </span>
                <span className="board-queue-pair">
                    <span className="text-default fs-7 fw-semibold text-truncate">{namesOf(item)}</span>
                    <span className="text-faint fs-8">{[item.detail, held ? t('Held back') : null].filter(Boolean).join(' · ')}</span>
                </span>
                {canRun &&
                    <span className="board-queue-actions">
                        {held
                            ? <Button label={t('Back in the queue')} icon="pi pi-replay" size="small" severity="secondary" text loading={busy === key} onClick={() => onHold(key, false)} />
                            : <>
                                {moveTool(item)}
                                <Button label={t('Hold back')} icon="pi pi-pause" size="small" severity="secondary" text loading={busy === key} onClick={() => onHold(key, true)} />
                            </>}
                        {onCancel && <Button icon="pi pi-times" size="small" severity="secondary" text aria-label={t('Take out')} title={t('Take out')} onClick={() => confirmCancel(item)} />}
                    </span>}
            </li>
        );
    };

    return (
        <Panel header={t('Boards')} icons={
            <span className="d-flex align-items-center gap-2">
                {countSave && <SaveStatus {...countSave} />}
                {screen && <BigScreenButton create={screen.create} send={screen.send} />}
            </span>
        }>
            <div className="d-flex flex-column gap-3">
                {canRun && onCount &&
                    <div className="boards-tools">
                        <span className="boards-count">
                            <span className="text-subtle fs-7 me-1">{t('Boards')}</span>
                            <Button icon="pi pi-minus" size="small" severity="secondary" rounded text aria-label={t('Fewer boards')} title={t('Fewer boards')} disabled={view.count <= 1} onClick={() => onCount(view.count - 1)} />
                            <span className="boards-count-value text-default" aria-live="polite">{view.count}</span>
                            <Button icon="pi pi-plus" size="small" severity="secondary" rounded text aria-label={t('More boards')} title={t('More boards')} disabled={view.count >= MAX_BOARDS} onClick={() => onCount(view.count + 1)} />
                        </span>
                    </div>}
                <div className="boards-grid">{view.boards.map(card)}</div>

                <section className="d-flex flex-column gap-2" aria-label={t('Next up')}>
                    <span className="game-setup-section-title">{t('Next up')}</span>
                    {view.queue.length === 0 && view.held.length === 0 && <span className="text-faint fs-7">{t('Nobody is waiting.')}</span>}
                    <ol className="board-queue list-unstyled m-0">
                        {view.queue.map((key, index) => queueRow(key, index))}
                        {view.held.map((key, index) => queueRow(key, index, true))}
                    </ol>
                </section>
                {hint && <span className="text-faint fs-8">{hint}</span>}
            </div>
            <MoveDialog move={move} options={moveOptions} onMove={onMove} onHide={() => setMove(null)} />
        </Panel>
    );
};

export default BoardsPanel;
