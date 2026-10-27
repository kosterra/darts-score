import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Checkbox } from 'primereact/checkbox';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import StatTile from '../stats/players/stat.tile';
import { AdminToolbar } from './admin.common';
import { t, tn } from '../../utils/i18n';
import FilterPills from '../elements/filter.pills';
import { TableLoading } from '../elements/skeletons';
import { formatDate } from '../../utils/dates';
import { groupEntries } from './error.log.utils';

dayjs.extend(relativeTime);

const LEVEL_OPTIONS = [
    { label: t('All'), value: 'all' },
    { label: t('Errors'), value: 'error', icon: 'pi pi-times-circle' },
    { label: t('Warnings'), value: 'warn', icon: 'pi pi-exclamation-triangle' },
];

const LEVEL_TAGS = {
    fatal: { value: 'Crash', severity: 'danger' },
    error: { value: 'Error', severity: 'danger' },
    warn: { value: 'Warning', severity: 'warning' },
};

/**
 * For global admins: the warnings and errors the API logged, newest first,
 * with the request that failed and the error's stack. The same one logged
 * again and again is one row with how often (unless shown one by one).
 */
const ErrorLog = () => {
    const toast = useRef(null);
    const [log, setLog] = useState(null);
    const [level, setLevel] = useState('all');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(null);
    const [grouped, setGrouped] = useState(true);
    const rows = grouped ? groupEntries(log?.entries) : (log?.entries ?? []);

    const loadLog = async () => {
        setLog(current => current && { ...current, loading: true });
        try {
            setLog(await AdminService.loadLogs({ level, search }));
        } catch (error) {
            setLog({ entries: [] });
            toast.current?.show({ severity: 'error', summary: t('Load error log'), detail: error.message, life: 4000 });
        }
    };

    // the search waits for a short pause in typing
    useEffect(() => {
        const timer = setTimeout(loadLog, search ? 300 : 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, search]);

    const confirmClear = () => confirmDialog({
        header: t('Clear error log'),
        message: t('Remove all entries from the error log?'),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: t('Clear'),
        rejectLabel: t('Cancel'),
        acceptClassName: 'p-button-danger p-button-sm',
        rejectClassName: 'p-button-secondary p-button-sm',
        accept: async () => {
            try {
                const { deleted } = await AdminService.clearLogs();
                toast.current.show({ severity: 'success', summary: t('Error log cleared'), detail: t('{{deleted}} entries removed', { deleted: deleted }), life: 3000 });
                await loadLog();
            } catch (error) {
                toast.current.show({ severity: 'error', summary: t('Clear error log'), detail: error.message, life: 4000 });
            }
        },
    });

    const timeBody = (entry) => (
        <div className="d-flex flex-column">
            <span className="text-default fs-7 text-nowrap">{formatDate(entry.time, { time: true, seconds: true })}</span>
            <span className="text-faint fs-8 text-nowrap">{dayjs(entry.time).fromNow()}</span>
            {entry.count > 1 && <span className="text-faint fs-8 text-nowrap">{t('first {{time}}', { time: dayjs(entry.firstTime).fromNow() })}</span>}
        </div>
    );

    const messageBody = (entry) => {
        const request = entry.context?.request;
        return (
            <div className="d-flex flex-column gap-1 min-w-0">
                <span className="text-default fs-7 text-break">
                    {entry.count > 1 && <Tag value={t('{{count}} times', { count: entry.count })} severity="secondary" className="me-2 error-log-count" />}
                    {entry.message || entry.error?.message}
                </span>
                {entry.error && entry.error.message !== entry.message &&
                    <span className="text-subtle fs-8 text-break">{entry.error.type}: {entry.error.message}</span>}
                {request &&
                    <span className="text-faint fs-8 text-break">
                        {request.method} {request.url}{request.user ? ` · ${request.user}` : ''}{request.ip ? ` · ${request.ip}` : ''}
                    </span>}
            </div>
        );
    };

    const hasDetails = (entry) => Boolean(entry.error?.stack || entry.context || entry.count > 1);

    const detailsTemplate = (entry) => (
        <div className="d-flex flex-column gap-3 p-2">
            {entry.count > 1 &&
                <span className="text-subtle fs-8">
                    {t('Logged at:')}{' '}{entry.times.map(time => formatDate(time, { time: true, seconds: true })).join(' · ')}
                </span>}
            {entry.error?.stack && <pre className="error-log-stack m-0">{entry.error.stack}</pre>}
            {entry.context && <pre className="error-log-stack m-0">{JSON.stringify(entry.context, null, 2)}</pre>}
        </div>
    );

    return (
        <div className="d-flex flex-column gap-4">
            <div className="row g-3">
                <div className="col-6 col-lg-3"><StatTile label={t('Errors in 24 hours')} value={log?.errorsToday ?? '–'} /></div>
                <div className="col-6 col-lg-3"><StatTile label={t('Warnings in 24 hours')} value={log?.warningsToday ?? '–'} /></div>
            </div>

            <Panel header={t('Error log')}>
                <AdminToolbar actions={<>
                        {log?.entries && <span className="text-faint fs-7">{tn(log.entries.length, '{{count}} entry', '{{count}} entries')}</span>}
                        <Button icon="pi pi-refresh" label={t('Refresh')} size="small" severity="secondary" onClick={loadLog} />
                        <Button icon="pi pi-trash" label={t('Clear')} size="small" severity="danger" disabled={!log?.entries?.length} onClick={confirmClear} />
                    </>} changed={[search, level !== 'all', !grouped].filter(Boolean).length}>
                    <span className="p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search messages')} aria-label={t('Search messages')} />
                    </span>
                    <FilterPills value={level} options={LEVEL_OPTIONS} onChange={setLevel} ariaLabel={t('Level')} />
                    <label className="d-flex align-items-center gap-2 fs-7 text-subtle" htmlFor="error-log-grouped">
                        <Checkbox inputId="error-log-grouped" checked={grouped} onChange={(e) => { setGrouped(e.checked); setExpanded(null); }} />
                        {t('The same ones together')}
                    </label>
                </AdminToolbar>

                <DataTable
                    value={rows}
                    dataKey="id"
                    className="admin-table"
                    expandedRows={expanded}
                    onRowToggle={(e) => setExpanded(e.data)}
                    rowExpansionTemplate={detailsTemplate}
                    paginator
                    rows={25}
                    rowsPerPageOptions={[25, 50, 100]}
                    // a new search keeps the rows under a spinner; the first load shows the shape of the rows
                    loading={Boolean(log?.loading)}
                    emptyMessage={!log || log.loading ? <TableLoading /> : t('No warnings or errors. All good.')}
                    responsiveLayout="stack" breakpoint="640px"
                >
                    <Column expander={hasDetails} style={{ width: '3rem' }} />
                    <Column bodyClassName="no-label" header={t('Time')} body={timeBody} />
                    <Column header={t('Level')} body={(entry) => <Tag {...LEVEL_TAGS[entry.level]} />} />
                    <Column bodyClassName="no-label" header={t('Message')} body={messageBody} style={{ minWidth: '20rem' }} />
                </DataTable>
                <span className="d-block text-faint fs-8 mt-2">
                    {t('Entries are kept for')}{' '}{log?.retentionDays ?? 30}{' '}{t('days; the newest')}{' '}{log?.limit ?? 500}{' '}{t('are shown.')}
                </span>
            </Panel>

            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ErrorLog;
