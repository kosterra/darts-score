import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { FaTrophy, FaUserGroup } from 'react-icons/fa6';
import dayjs from 'dayjs';

import AdminService from '../../services/admin.service';
import DeletePopup from '../elements/delete.popup';
import { AdminToolbar } from './admin.common';
import { formatNumber } from './installation.utils';
import { KpiHero } from '../stats/players/kpi';
import { TABLE_DEFAULTS, tableState, useUrlState } from '../../utils/use.url.state';
import { formatDateTime } from './admin.format';
import { formatDate } from '../../utils/dates';
import { t, tn } from '../../utils/i18n';
import { OverviewSkeleton, TableLoading } from '../elements/skeletons';
import FilterPills from '../elements/filter.pills';
import { ACCENT } from '../../utils/palette';

const GREEN = ACCENT.green;
const DAY = 24 * 60 * 60 * 1000;
const STATUS_OPTIONS = [
    { label: t('All'), value: 'all' },
    { label: t('Going on'), value: 'running', icon: 'pi pi-play' },
    { label: t('Played'), value: 'played', icon: 'pi pi-check-circle' },
    { label: t('Became a club'), value: 'club', icon: 'pi pi-sitemap' },
];
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
// an evening without a name is named by its day
const nameOf = (evening) => evening.name || t('Darts evening of {{date}}', { date: formatDate(evening.createdAt) });

/**
 * The darts evenings at a glance, above their list: how many are kept, how
 * many lately, played since counting began, made a club; and the evenings
 * started per day over the last 30 days.
 */
const EveningsOverview = ({ data, days }) => {
    if (!data) return <OverviewSkeleton title={t('Darts evenings at a glance')} />;
    const evenings = data.evenings ?? [];
    const most = Math.max(1, ...days.map(day => day.evenings));
    return (
        <Panel header={t('Darts evenings at a glance')} className="mb-4">
            <div className="kpi-headline">
                <KpiHero label={t('Kept now')} value={formatNumber(data.total ?? evenings.length)} detail={t('the last 30 days')} color={GREEN} />
                <KpiHero label={t('In the last 7 days')} value={formatNumber(evenings.filter(evening => Date.now() - new Date(evening.createdAt).getTime() < 7 * DAY).length)} color={GREEN} />
                <KpiHero label={t('Going on now')} value={formatNumber(evenings.filter(evening => evening.running).length)} color={GREEN} />
                <KpiHero label={t('Played, all time')} value={formatNumber(data.allTime?.played ?? 0)} detail={data.allTime ? t('since {{date}}', { date: formatDate(data.allTime.since) }) : null} color={GREEN} />
                <KpiHero label={t('Became a club')} value={formatNumber(evenings.filter(evening => evening.club).length)} color={GREEN} />
            </div>
            <div className="quick-games-days mt-4" aria-label={t('Darts evenings started per day, the last 30 days')}>
                {days.map(day => (
                    <span key={day.day} className="quick-games-day" title={t('{{date}}: {{count}} started', { date: formatDate(day.day), count: day.evenings })}>
                        <span className="is-started" style={{ height: `${(day.evenings / most) * 100}%` }} />
                    </span>
                ))}
            </div>
            <p className="text-faint fs-8 mt-1 mb-0">{t('Darts evenings started per day, the last 30 days. An evening counts as played when it ends with at least one finished game: ended by hand, or by itself 12 hours after its last game.')}</p>
        </Panel>
    );
};

/**
 * The darts evenings without an account, for global admins: played with
 * the players' names as quick games, kept 30 days (unless made a club).
 * Each opens as its shared page; one or many can be deleted with their games.
 */
const EveningsList = () => {
    const toast = useRef(null);
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [view, setView] = useUrlState({ status: 'all', ...TABLE_DEFAULTS });
    const { status } = view;
    const [selection, setSelection] = useState([]);

    const load = useCallback(async () => {
        try {
            setData(await AdminService.loadEvenings());
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const evenings = useMemo(() => (data?.evenings ?? []).filter(evening => ({
        all: true,
        running: evening.running,
        played: !evening.running && evening.finished > 0,
        club: Boolean(evening.club),
    })[status]), [data, status]);
    // the last 30 days, the days without an evening too
    const days = useMemo(() => {
        const byDay = new Map((data?.perDay ?? []).map(day => [day.day, day.evenings]));
        return Array.from({ length: 30 }, (_, index) => {
            const day = dayjs().subtract(29 - index, 'day').format('YYYY-MM-DD');
            return { day, evenings: byDay.get(day) ?? 0 };
        });
    }, [data]);

    const deleteEvenings = async (ids) => {
        try {
            const { deleted } = await AdminService.deleteEvenings(ids);
            toast.current?.show({ severity: 'success', summary: t('Darts evenings deleted'), detail: tn(deleted, '{{count}} evening', '{{count}} evenings'), life: 3000 });
            setSelection([]);
            await load();
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: t('Delete darts evenings'), detail: error.message, life: 4000 });
        }
    };
    const confirmDeleteSelection = () => confirmDialog({
        header: t('Delete darts evenings'),
        message: tn(selection.length, 'Are you sure you want to delete this evening with its games?', 'Are you sure you want to delete these {{count}} evenings with their games?'),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: t('Delete'),
        rejectLabel: t('Cancel'),
        acceptClassName: 'p-button-danger',
        accept: () => deleteEvenings(selection.map(evening => evening.id)),
    });

    const eveningBody = (evening) => (
        <div className="d-flex align-items-center gap-3">
            <span className="game-type-icon" aria-hidden="true"><FaUserGroup /></span>
            <div className="d-flex flex-column align-items-start gap-1 min-w-0">
                <span className="text-default fs-7 fw-semibold text-truncate">{nameOf(evening)}</span>
                <span className="text-faint fs-8">{tn(evening.games, '{{count}} game', '{{count}} games')}{evening.games !== evening.finished ? ` · ${t('{{count}} finished', { count: evening.finished })}` : ''}</span>
            </div>
        </div>
    );

    const playersBody = (evening) => (
        <div className="d-flex flex-column gap-2">
            {evening.players.map(name => (
                <div key={name} className="d-flex align-items-center gap-2 min-w-0">
                    <Avatar label={initials(name)} shape="circle" className="avatar-sm bg-surface-high flex-shrink-0" />
                    <span className="text-default fw-semibold text-truncate">
                        {name}
                        {evening.leader?.name === name && <FaTrophy className="ms-2 text-gold" aria-label={t('Leading')} />}
                    </span>
                </div>
            ))}
        </div>
    );

    const leaderBody = (evening) => (evening.leader
        ? <span className="text-default fs-7 fw-semibold text-nowrap"><FaTrophy className="me-2 text-gold" aria-hidden="true" />{evening.leader.name} <span className="text-faint fw-normal">· {tn(evening.leader.wins, '{{count}} win', '{{count}} wins')}</span></span>
        : <span className="text-faint fs-8">{t('No game finished')}</span>);

    const statusBody = (evening) => (
        <div className="d-flex flex-column align-items-start gap-1">
            {evening.running && <Tag value={t('Going on')} severity="info" />}
            {!evening.running && evening.finished > 0 && <Tag value={t('Played')} severity="success" />}
            {!evening.running && evening.finished === 0 && <Tag value={t('Not played')} severity="secondary" />}
            {evening.club && <Tag value={t('Club: {{name}}', { name: evening.club.name ?? '?' })} severity="warning" />}
        </div>
    );

    const actionsBody = (evening) => (
        <div className="row-actions">
            <Link to={`/evening/shared/${evening.shareToken}`} className="row-action-link" title={t('Open the evening')} aria-label={t('Open the evening')}><i className="pi pi-eye" aria-hidden="true" /></Link>
            <DeletePopup data={evening} header={t('Delete the darts evening')} message={t('the darts evening {{name}} with its games', { name: nameOf(evening) })} handleDelete={(row) => deleteEvenings([row.id])} />
        </div>
    );

    return (
        <>
            <EveningsOverview data={data} days={days} />
            <Panel header={t('Darts evenings')}>
                <p className="text-subtle fs-7 mt-0 mb-3">
                    {t('Darts evenings of the public start page, played without an account: the players are only names, the games quick games. They are deleted 30 days after they were started, unless someone made the evening a club.')}
                </p>

                <AdminToolbar actions={<>
                    <span className="text-faint fs-7">{tn(evenings.length, '{{count}} evening', '{{count}} evenings')}</span>
                    <Button
                        label={selection.length ? t('Delete {{length}}', { length: selection.length }) : t('Delete')}
                        icon="pi pi-trash"
                        severity="danger"
                        size="small"
                        disabled={!selection.length}
                        onClick={confirmDeleteSelection}
                    />
                </>} changed={status !== 'all' ? 1 : 0}>
                    <FilterPills label={t('Status')} value={status} options={STATUS_OPTIONS} onChange={(value) => setView({ status: value, page: 1 })} ariaLabel={t('Status')} dropdownOnPhone />
                </AdminToolbar>

                {failed
                    ? <p className="text-subtle fs-7 m-0">{t('The darts evenings could not be loaded.')}</p>
                    : (
                        <DataTable
                            value={evenings}
                            dataKey="id"
                            className="admin-table games-table"
                            selectionMode="checkbox"
                            selection={selection}
                            onSelectionChange={(e) => setSelection(e.value)}
                            {...tableState(view, setView, { sortField: 'createdAt' })}
                            emptyMessage={data === null ? <TableLoading /> : data?.evenings?.length ? t('No darts evenings match these filters.') : t('No darts evenings yet.')}
                            responsiveLayout="stack" breakpoint="640px"
                        >
                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                            <Column bodyClassName="no-label date-cell" field="createdAt" header={t('Date')} sortable body={(evening) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(evening.createdAt)}</span>} />
                            <Column header={t('Evening')} bodyClassName="stack-block no-label divider-after" body={eveningBody} />
                            <Column header={t('Players')} bodyClassName="stack-block no-label" body={playersBody} style={{ minWidth: '14rem' }} />
                            <Column header={t('Leading')} body={leaderBody} />
                            <Column bodyClassName="no-label status-cell" header={t('Status')} body={statusBody} />
                            <Column field="lastGameAt" header={t('Last game')} sortable body={(evening) => <span className="text-subtle fs-7 text-nowrap">{evening.lastGameAt ? formatDateTime(evening.lastGameAt) : '–'}</span>} />
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

export default EveningsList;
