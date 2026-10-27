import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { FaTrophy } from 'react-icons/fa6';
import dayjs from 'dayjs';

import AdminService from '../../services/admin.service';
import DeletePopup from '../elements/delete.popup';
import GameTypeTag from '../elements/game.type.tag';
import GameTypeIcon from '../elements/game.type.icon';
import GameStatusTag from '../elements/game.status.tag';
import { AdminToolbar } from './admin.common';
import QuickGamesOverview from './quick.games.overview';
import { TABLE_DEFAULTS, tableState, useUrlState } from '../../utils/use.url.state';
import { formatDateTime } from './admin.format';
import { t } from '../../utils/i18n';
import { TableLoading } from '../elements/skeletons';
import FilterPills from '../elements/filter.pills';

const TYPE_OPTIONS = [{ label: t('All'), value: 'all' }, { label: t('X01'), value: 'x01' }, { label: t('Cricket'), value: 'cricket' }, { label: t('Elimination'), value: 'elimination' }];
const STATUS_OPTIONS = [{ label: t('All'), value: 'all' }, { label: t('Running'), value: 'running', icon: 'pi pi-play' }, { label: t('Finished'), value: 'finished', icon: 'pi pi-check-circle' }];

// "3 games" in the language of the app (the word in English, as the key of its texts)
const plural = (count, word) => t(count === 1 ? `{{count}} ${word}` : `{{count}} ${word}s`, { count });
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

    const deleteGames = async (ids) => {
        try {
            const { deleted } = await AdminService.deleteQuickGames(ids);
            toast.current?.show({ severity: 'success', summary: deleted === 1 ? t('Quick game deleted') : t('Quick games deleted'), detail: plural(deleted, 'game'), life: 3000 });
            setSelection([]);
            await load();
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: t('Delete quick games'), detail: error.message, life: 4000 });
        }
    };
    const confirmDeleteSelection = () => confirmDialog({
        header: t('Delete quick games'),
        message: t('Are you sure you want to delete {{plural}}?', { plural: plural(selection.length, 'quick game') }),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: t('Delete'),
        rejectLabel: t('Cancel'),
        acceptClassName: 'p-button-danger',
        accept: () => deleteGames(selection.map(game => game.id)),
    });

    // as in the games of the clubs: the round badge, the game on its own line, how it was played, the details
    const gameBody = (game) => (
        <div className="d-flex align-items-center gap-3">
            <GameTypeIcon type={game.kind} />
            <div className="d-flex flex-column align-items-start gap-1">
                <GameTypeTag type={game.kind} />
                <span className="text-default fs-7 fw-semibold">{game.format}</span>
                <span className="text-faint fs-8">{t('Quick game · no account')}</span>
            </div>
        </div>
    );

    // the players are only names: their initials instead of a picture
    const playersBody = (game) => (
        <div className="d-flex flex-column gap-2">
            {game.names.map(name => (
                <div key={name} className="d-flex align-items-center gap-2 min-w-0">
                    <Avatar label={initials(name)} shape="circle" className="avatar-sm bg-surface-high flex-shrink-0" />
                    <span className="text-default fw-semibold text-truncate">
                        {name}
                        {game.winner === name && <FaTrophy className="ms-2 text-gold" aria-label={t('Winner')} />}
                    </span>
                </div>
            ))}
        </div>
    );

    const actionsBody = (game) => (
        <div className="row-actions">
            <DeletePopup data={game} header={t('Delete Quick Game')} message={t('the quick game of {{join}}', { join: game.names.join(', ') })} handleDelete={(row) => deleteGames([row.id])} />
        </div>
    );

    return (
        <>
        {/* the quick games at a glance, with the last 30 days */}
        <QuickGamesOverview data={data} days={days} />
        <Panel header={t('Quick games')}>
            <p className="text-subtle fs-7 mt-0 mb-3">
                {t('Games of the public start page, played without an account: the players are only names. They never count for a club or a player, and are deleted 30 days after they were started, a game never finished 3 days after its last visit.')}
            </p>

            <AdminToolbar actions={<>
                    <span className="text-faint fs-7">{plural(games.length, 'game')}</span>
                    <Button
                        label={selection.length ? t('Delete {{length}}', { length: selection.length }) : t('Delete')}
                        icon="pi pi-trash"
                        severity="danger"
                        size="small"
                        disabled={!selection.length}
                        onClick={confirmDeleteSelection}
                    />
                </>} changed={[type !== 'all', status !== 'all'].filter(Boolean).length}>
                <FilterPills value={type} options={TYPE_OPTIONS} onChange={setType} ariaLabel={t('Game type')} dropdownOnPhone />
                <FilterPills value={status} options={STATUS_OPTIONS} onChange={setStatus} ariaLabel={t('Status')} dropdownOnPhone />
            </AdminToolbar>

            {failed
                ? <p className="text-subtle fs-7 m-0">{t('The quick games could not be loaded.')}</p>
                : (
                    <DataTable
                        value={games}
                        dataKey="id"
                        className="admin-table games-table"
                        selectionMode="checkbox"
                        selection={selection}
                        onSelectionChange={(e) => setSelection(e.value)}
                        {...tableState(view, setView, { sortField: 'createdAt' })}
                        emptyMessage={data === null ? <TableLoading /> : data?.games?.length ? t('No quick games match these filters.') : t('No quick games yet.')}
                        responsiveLayout="stack" breakpoint="640px"
                    >
                        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                        <Column bodyClassName="no-label date-cell" field="createdAt" header={t('Date')} sortable body={(game) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(game.createdAt)}</span>} />
                        <Column header={t('Game')} bodyClassName="stack-block no-label divider-after" body={gameBody} />
                        <Column header={t('Players')} bodyClassName="stack-block no-label" body={playersBody} style={{ minWidth: '14rem' }} />
                        <Column bodyClassName="no-label status-cell" header={t('Status')} body={(game) => <GameStatusTag running={!game.finished} />} />
                        <Column field="updatedAt" header={t('Last visit')} sortable body={(game) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(game.updatedAt)}</span>} />
                        <Column body={actionsBody} />
                    </DataTable>
                )
            }

            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </Panel>
        </>
    );
};

export default QuickGamesList;
