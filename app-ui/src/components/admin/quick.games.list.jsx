import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import dayjs from 'dayjs';

import AdminService from '../../services/admin.service';
import { AdminToolbar } from './admin.common';

const STATUSES = [{ label: 'All', value: 'all' }, { label: 'Finished', value: 'finished' }, { label: 'Not finished', value: 'running' }];

/**
 * The quick games of the public start page, for global admins: played
 * without an account, kept 30 days. How many were started per day, and
 * every game with its players, to delete one or many.
 */
const QuickGamesList = () => {
    const toast = useRef(null);
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [status, setStatus] = useState('all');
    const [selected, setSelected] = useState([]);

    const load = useCallback(async () => {
        try {
            setData(await AdminService.loadQuickGames());
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const games = useMemo(() => (data?.games ?? []).filter(game => status === 'all' || (status === 'finished') === game.finished), [data, status]);
    // the last 30 days, the days without a game too
    const days = useMemo(() => {
        const byDay = new Map((data?.perDay ?? []).map(day => [day.day, day]));
        return Array.from({ length: 30 }, (_, index) => {
            const day = dayjs().subtract(29 - index, 'day').format('YYYY-MM-DD');
            return { day, games: byDay.get(day)?.games ?? 0, finished: byDay.get(day)?.finished ?? 0 };
        });
    }, [data]);
    const most = Math.max(1, ...days.map(day => day.games));

    const remove = (ids) => confirmDialog({
        header: ids.length === 1 ? 'Delete the quick game' : `Delete ${ids.length} quick games`,
        message: 'They are gone for good, also for the ones who played them.',
        icon: 'pi pi-trash',
        acceptClassName: 'p-button-danger',
        acceptLabel: 'Delete',
        rejectLabel: 'Cancel',
        accept: async () => {
            try {
                const { deleted } = await AdminService.deleteQuickGames(ids);
                toast.current?.show({ severity: 'success', summary: 'Quick games deleted', detail: `${deleted} deleted`, life: 3000 });
                setSelected([]);
                await load();
            } catch (error) {
                toast.current?.show({ severity: 'error', summary: 'Delete', detail: error.message, life: 4000 });
            }
        },
    });

    if (failed) return <Panel header="Quick games"><p className="text-subtle m-0">The quick games could not be loaded.</p></Panel>;

    return (
        <Panel header="Quick games">
            <Toast ref={toast} position="bottom-right" />
            <ConfirmDialog />
            <p className="text-subtle fs-7 mt-0">
                Games of the public start page, played without an account: the players are only names. They never count for a club or a player, and are deleted 30 days after they were started.
            </p>

            <div className="quick-games-days" aria-label="Quick games started per day, the last 30 days">
                {days.map(day => (
                    <span
                        key={day.day}
                        className="quick-games-day"
                        title={`${dayjs(day.day).format('DD.MM.YYYY')}: ${day.games} started, ${day.finished} finished`}
                    >
                        <span className="is-started" style={{ height: `${(day.games / most) * 100}%` }} />
                        <span className="is-finished" style={{ height: `${(day.finished / most) * 100}%` }} />
                    </span>
                ))}
            </div>
            <p className="text-faint fs-8 mt-1 mb-3">
                The last 30 days: started <span className="quick-games-key is-started" /> and finished <span className="quick-games-key is-finished" />. {data?.total ?? 0} quick games are kept now.
            </p>

            <AdminToolbar>
                <SelectButton value={status} options={STATUSES} onChange={(event) => event.value && setStatus(event.value)} className="p-selectbutton-pills pills-inline" aria-label="Which games" />
                <span className="ms-auto text-faint fs-7">{games.length} {games.length === 1 ? 'game' : 'games'}</span>
                <Button label={selected.length ? `Delete ${selected.length}` : 'Delete'} icon="pi pi-trash" size="small" severity="danger" outlined disabled={!selected.length} onClick={() => remove(selected.map(game => game.id))} />
            </AdminToolbar>

            <DataTable
                value={games}
                dataKey="id"
                loading={!data}
                selectionMode="checkbox"
                selection={selected}
                onSelectionChange={(event) => setSelected(event.value)}
                paginator
                rows={25}
                emptyMessage="No quick games yet."
                size="small"
                responsiveLayout="stack"
                breakpoint="768px"
            >
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                <Column header="Started" field="createdAt" sortable body={(game) => dayjs(game.createdAt).format('DD.MM.YYYY HH:mm')} />
                <Column header="Game" field="format" body={(game) => <span className="d-inline-flex align-items-center gap-2"><Tag value={game.kind === 'x01' ? 'X01' : 'Cricket'} severity="secondary" />{game.format}</span>} />
                <Column header="Players" body={(game) => game.names.join(', ')} />
                <Column header="Result" body={(game) => game.finished ? <span><i className="pi pi-trophy me-1 text-gold" aria-hidden="true" />{game.winner}</span> : <Tag value="Not finished" severity="info" />} />
                <Column header="Last visit" field="updatedAt" sortable body={(game) => dayjs(game.updatedAt).format('DD.MM.YYYY HH:mm')} />
                <Column body={(game) => <Button icon="pi pi-trash" text rounded severity="danger" size="small" aria-label={`Delete the game of ${game.names.join(', ')}`} onClick={() => remove([game.id])} />} headerStyle={{ width: '3.5rem' }} />
            </DataTable>
        </Panel>
    );
};

export default QuickGamesList;
