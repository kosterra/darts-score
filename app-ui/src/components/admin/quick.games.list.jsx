import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';
import { FaTrophy } from 'react-icons/fa6';
import dayjs from 'dayjs';

import AdminService from '../../services/admin.service';
import DeletePopup from '../elements/delete.popup';
import GameTypeTag from '../elements/game.type.tag';
import GameStatusTag from '../elements/game.status.tag';
import { AdminToolbar } from './admin.common';
import { TABLE_DEFAULTS, tableState, useUrlState } from '../../utils/use.url.state';
import { formatDateTime } from './admin.format';

const TYPE_OPTIONS = [{ label: 'All', value: 'all' }, { label: 'X01', value: 'x01' }, { label: 'Cricket', value: 'cricket' }];
const STATUS_OPTIONS = [{ label: 'All', value: 'all' }, { label: 'Running', value: 'running' }, { label: 'Finished', value: 'finished' }];

const plural = (count, word) => `${count} ${count === 1 ? word : `${word}s`}`;
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');

/**
 * The quick games of the public start page, for global admins: played
 * without an account, the players only names, kept 30 days. How many were
 * started per day, and every game, to delete one or many.
 */
const QuickGamesList = () => {
    const toast = useRef(null);
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    // the filters, page and order live in the address
    const [view, setView] = useUrlState({ type: 'all', status: 'all', ...TABLE_DEFAULTS });
    const { type, status } = view;
    const setType = (value) => setView({ type: value, page: 1 });
    const setStatus = (value) => setView({ status: value, page: 1 });
    const [selection, setSelection] = useState([]);

    const load = useCallback(async () => {
        try {
            setData(await AdminService.loadQuickGames());
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const games = useMemo(() => (data?.games ?? [])
        .filter(game => type === 'all' || game.kind === type)
        .filter(game => status === 'all' || (status === 'finished') === game.finished), [data, type, status]);
    // the last 30 days, the days without a game too
    const days = useMemo(() => {
        const byDay = new Map((data?.perDay ?? []).map(day => [day.day, day]));
        return Array.from({ length: 30 }, (_, index) => {
            const day = dayjs().subtract(29 - index, 'day').format('YYYY-MM-DD');
            return { day, games: byDay.get(day)?.games ?? 0, finished: byDay.get(day)?.finished ?? 0 };
        });
    }, [data]);
    const most = Math.max(1, ...days.map(day => day.games));

    const deleteGames = async (ids) => {
        try {
            const { deleted } = await AdminService.deleteQuickGames(ids);
            toast.current?.show({ severity: 'success', summary: deleted === 1 ? 'Quick game deleted' : 'Quick games deleted', detail: plural(deleted, 'game'), life: 3000 });
            setSelection([]);
            await load();
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: 'Delete quick games', detail: error.message, life: 4000 });
        }
    };
    const confirmDeleteSelection = () => confirmDialog({
        header: 'Delete quick games',
        message: `Are you sure you want to delete ${plural(selection.length, 'quick game')}?`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Delete',
        rejectLabel: 'Cancel',
        acceptClassName: 'p-button-danger',
        accept: () => deleteGames(selection.map(game => game.id)),
    });

    const gameBody = (game) => (
        <div className="d-flex flex-column align-items-start gap-1">
            <div className="d-flex align-items-center gap-2 flex-wrap">
                <GameTypeTag type={game.kind} />
                <span className="text-default fs-7 fw-semibold">{game.format}</span>
            </div>
            <span className="text-faint fs-8">Quick game · no account</span>
        </div>
    );

    // the players are only names: their initials instead of a picture
    const playersBody = (game) => (
        <div className="d-flex flex-column gap-2">
            {game.names.map(name => (
                <div key={name} className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                    <Avatar label={initials(name)} shape="circle" className="avatar-sm bg-surface-high flex-shrink-0" />
                    <span className="text-default fw-semibold text-truncate">
                        {name}
                        {game.winner === name && <FaTrophy className="ms-2 text-gold" aria-label="Winner" />}
                    </span>
                </div>
            ))}
        </div>
    );

    const actionsBody = (game) => (
        <div className="row-actions">
            <DeletePopup data={game} header="Delete Quick Game" message={`the quick game of ${game.names.join(', ')}`} handleDelete={(row) => deleteGames([row.id])} />
        </div>
    );

    return (
        <Panel header="Quick games">
            <p className="text-subtle fs-7 mt-0 mb-3">
                Games of the public start page, played without an account: the players are only names. They never count for a club or a player, and are deleted 30 days after they were started.
            </p>

            <div className="quick-games-days" aria-label="Quick games started per day, the last 30 days">
                {days.map(day => (
                    <span key={day.day} className="quick-games-day" title={`${dayjs(day.day).format('DD.MM.YYYY')}: ${day.games} started, ${day.finished} finished`}>
                        <span className="is-started" style={{ height: `${(day.games / most) * 100}%` }} />
                        <span className="is-finished" style={{ height: `${(day.finished / most) * 100}%` }} />
                    </span>
                ))}
            </div>
            <p className="text-faint fs-8 mt-1 mb-3">
                The last 30 days: started <span className="quick-games-key is-started" /> and finished <span className="quick-games-key is-finished" />. {plural(data?.total ?? 0, 'quick game')} kept now.
            </p>

            <AdminToolbar>
                <SelectButton value={type} options={TYPE_OPTIONS} onChange={(e) => e.value && setType(e.value)} aria-label="Game type" />
                <SelectButton value={status} options={STATUS_OPTIONS} onChange={(e) => e.value && setStatus(e.value)} aria-label="Status" />
                <div className="ms-auto d-flex align-items-center gap-3">
                    <span className="text-faint fs-7">{plural(games.length, 'game')}</span>
                    <Button
                        label={selection.length ? `Delete ${selection.length}` : 'Delete'}
                        icon="pi pi-trash"
                        severity="danger"
                        size="small"
                        disabled={!selection.length}
                        onClick={confirmDeleteSelection}
                    />
                </div>
            </AdminToolbar>

            {failed
                ? <p className="text-subtle fs-7 m-0">The quick games could not be loaded.</p>
                : (
                    <DataTable
                        value={games}
                        dataKey="id"
                        className="admin-table"
                        loading={data === null}
                        selectionMode="checkbox"
                        selection={selection}
                        onSelectionChange={(e) => setSelection(e.value)}
                        {...tableState(view, setView, { sortField: 'createdAt' })}
                        emptyMessage={data?.games?.length ? 'No quick games match these filters.' : 'No quick games yet.'}
                        responsiveLayout="scroll"
                    >
                        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                        <Column field="createdAt" header="Date" sortable body={(game) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(game.createdAt)}</span>} />
                        <Column header="Game" body={gameBody} />
                        <Column header="Players" body={playersBody} style={{ minWidth: '14rem' }} />
                        <Column header="Status" body={(game) => <GameStatusTag running={!game.finished} />} />
                        <Column field="updatedAt" header="Last visit" sortable body={(game) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(game.updatedAt)}</span>} />
                        <Column body={actionsBody} />
                    </DataTable>
                )
            }

            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </Panel>
    );
};

export default QuickGamesList;
