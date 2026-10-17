import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import StatTile from '../stats/players/stat.tile';
import { AdminToolbar } from './admin.common';

dayjs.extend(relativeTime);

const LEVEL_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'Errors', value: 'error' },
    { label: 'Warnings', value: 'warn' },
];

const LEVEL_TAGS = {
    fatal: { value: 'Crash', severity: 'danger' },
    error: { value: 'Error', severity: 'danger' },
    warn: { value: 'Warning', severity: 'warning' },
};

/**
 * For global admins: the warnings and errors the API logged, newest first,
 * with the request that failed and the error's stack.
 */
const ErrorLog = () => {
    const toast = useRef(null);
    const [log, setLog] = useState(null);
    const [level, setLevel] = useState('all');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(null);

    const loadLog = async () => {
        setLog(current => current && { ...current, loading: true });
        try {
            setLog(await AdminService.loadLogs({ level, search }));
        } catch (error) {
            setLog({ entries: [] });
            toast.current?.show({ severity: 'error', summary: 'Load error log', detail: error.message, life: 4000 });
        }
    };

    // the search waits for a short pause in typing
    useEffect(() => {
        const timer = setTimeout(loadLog, search ? 300 : 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, search]);

    const confirmClear = () => confirmDialog({
        header: 'Clear error log',
        message: 'Remove all entries from the error log?',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Clear',
        rejectLabel: 'Cancel',
        acceptClassName: 'p-button-danger p-button-sm',
        rejectClassName: 'p-button-secondary p-button-sm',
        accept: async () => {
            try {
                const { deleted } = await AdminService.clearLogs();
                toast.current.show({ severity: 'success', summary: 'Error log cleared', detail: `${deleted} entries removed`, life: 3000 });
                await loadLog();
            } catch (error) {
                toast.current.show({ severity: 'error', summary: 'Clear error log', detail: error.message, life: 4000 });
            }
        },
    });

    const timeBody = (entry) => (
        <div className="d-flex flex-column">
            <span className="text-default fs-7 text-nowrap">{dayjs(entry.time).format('DD.MM.YYYY HH:mm:ss')}</span>
            <span className="text-faint fs-8 text-nowrap">{dayjs(entry.time).fromNow()}</span>
        </div>
    );

    const messageBody = (entry) => {
        const request = entry.context?.request;
        return (
            <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
                <span className="text-default fs-7 text-break">{entry.message || entry.error?.message}</span>
                {entry.error && entry.error.message !== entry.message &&
                    <span className="text-subtle fs-8 text-break">{entry.error.type}: {entry.error.message}</span>}
                {request &&
                    <span className="text-faint fs-8 text-break">
                        {request.method} {request.url}{request.user ? ` · ${request.user}` : ''}{request.ip ? ` · ${request.ip}` : ''}
                    </span>}
            </div>
        );
    };

    const hasDetails = (entry) => Boolean(entry.error?.stack || entry.context);

    const detailsTemplate = (entry) => (
        <div className="d-flex flex-column gap-3 p-2">
            {entry.error?.stack && <pre className="error-log-stack m-0">{entry.error.stack}</pre>}
            {entry.context && <pre className="error-log-stack m-0">{JSON.stringify(entry.context, null, 2)}</pre>}
        </div>
    );

    return (
        <div className="d-flex flex-column gap-4">
            <div className="row g-3">
                <div className="col-6 col-lg-3"><StatTile label="Errors in 24 hours" value={log?.errorsToday ?? '–'} /></div>
                <div className="col-6 col-lg-3"><StatTile label="Warnings in 24 hours" value={log?.warningsToday ?? '–'} /></div>
            </div>

            <Panel header="Error log">
                <AdminToolbar>
                    <span className="p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages" aria-label="Search messages" />
                    </span>
                    <SelectButton value={level} options={LEVEL_OPTIONS} onChange={(e) => e.value && setLevel(e.value)} aria-label="Level" />
                    <div className="ms-auto d-flex align-items-center gap-3">
                        {log?.entries && <span className="text-faint fs-7">{log.entries.length} {log.entries.length === 1 ? 'entry' : 'entries'}</span>}
                        <Button icon="pi pi-refresh" label="Refresh" size="small" severity="secondary" onClick={loadLog} />
                        <Button icon="pi pi-trash" label="Clear" size="small" severity="danger" disabled={!log?.entries?.length} onClick={confirmClear} />
                    </div>
                </AdminToolbar>

                <DataTable
                    value={log?.entries ?? []}
                    dataKey="id"
                    className="admin-table"
                    loading={!log || log.loading}
                    expandedRows={expanded}
                    onRowToggle={(e) => setExpanded(e.data)}
                    rowExpansionTemplate={detailsTemplate}
                    paginator
                    rows={25}
                    rowsPerPageOptions={[25, 50, 100]}
                    emptyMessage="No warnings or errors. All good."
                    responsiveLayout="scroll"
                >
                    <Column expander={hasDetails} style={{ width: '3rem' }} />
                    <Column header="Time" body={timeBody} />
                    <Column header="Level" body={(entry) => <Tag {...LEVEL_TAGS[entry.level]} />} />
                    <Column header="Message" body={messageBody} style={{ minWidth: '20rem' }} />
                </DataTable>
                <span className="d-block text-faint fs-8 mt-2">
                    Entries are kept for {log?.retentionDays ?? 30} days; the newest {log?.limit ?? 500} are shown.
                </span>
            </Panel>

            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ErrorLog;
