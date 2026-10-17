import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import StatTile from '../stats/players/stat.tile';
import { AdminToolbar } from './admin.common';
import { formatDateTime } from './admin.format';
import { announceAlertsChange } from './alert.events';

dayjs.extend(relativeTime);

const STATUS_OPTIONS = [
    { label: 'Open', value: 'open' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'All', value: 'all' },
];

const SEVERITY_TAGS = {
    critical: { value: 'Critical', severity: 'danger' },
    warning: { value: 'Warning', severity: 'warning' },
};

const ACTION_LABELS = {
    'rejected': 'Registration refused',
    'user-blocked': 'Account blocked',
    'ip-blocked': 'Address blocked',
};

const DURATION_OPTIONS = [
    { label: 'for 24 hours', value: 24 },
    { label: 'for 7 days', value: 24 * 7 },
    { label: 'for 30 days', value: 24 * 30 },
    { label: 'until unblocked', value: null },
];

/**
 * For global admins: what the spam rules noticed, what they blocked, and
 * blocking or unblocking accounts and addresses by hand.
 */
const AlertsPage = () => {
    const toast = useRef(null);
    const [status, setStatus] = useState('open');
    const [alerts, setAlerts] = useState(null);
    const [blocks, setBlocks] = useState({ users: [], ips: [] });
    const [rules, setRules] = useState([]);
    const [newIp, setNewIp] = useState('');
    const [newIpHours, setNewIpHours] = useState(24);

    const show = (severity, summary, detail) => toast.current?.show({ severity, summary, detail, life: severity === 'error' ? 4000 : 3000 });

    const loadAlerts = async () => {
        try {
            setAlerts(await AdminService.loadAlerts(status));
        } catch (error) {
            setAlerts([]);
            show('error', 'Load alerts', error.message);
        }
    };

    const loadBlocks = async () => {
        try {
            setBlocks(await AdminService.loadBlocks());
        } catch (error) {
            show('error', 'Load blocks', error.message);
        }
    };

    useEffect(() => {
        loadAlerts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    useEffect(() => {
        loadBlocks();
        AdminService.loadAlertRules().then(result => setRules(result.rules)).catch(() => setRules([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // runs an action, then reloads what it changed
    const run = async (summary, action, success) => {
        try {
            await action();
            if (success) show('success', summary, success);
            await Promise.all([loadAlerts(), loadBlocks()]);
            announceAlertsChange();
            return true;
        } catch (error) {
            show('error', summary, error.message);
            return false;
        }
    };

    const blockedIps = new Set(blocks.ips.map(block => block.ip));

    const confirmBlockUser = (user) => confirmDialog({
        header: 'Block account',
        message: `Block ${user.email}? The account is logged out and cannot log in until you unblock it.`,
        icon: 'pi pi-ban',
        acceptLabel: 'Block',
        rejectLabel: 'Cancel',
        acceptClassName: 'p-button-danger p-button-sm',
        rejectClassName: 'p-button-secondary p-button-sm',
        accept: () => run('Block account', () => AdminService.blockUser(user.id, 'Blocked from an alert'), user.email),
    });

    const whenBody = (alert) => (
        <div className="d-flex flex-column">
            <span className="text-default fs-7 text-nowrap">{formatDateTime(alert.lastSeenAt)}</span>
            <span className="text-faint fs-8 text-nowrap">
                {dayjs(alert.lastSeenAt).fromNow()}{alert.count > 1 ? ` · ${alert.count} times` : ''}
            </span>
        </div>
    );

    const alertBody = (alert) => (
        <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
            <span className="text-default fw-semibold fs-7">{alert.rule.title}</span>
            <span className="text-subtle fs-8 text-break">{alert.message}</span>
        </div>
    );

    const whoBody = (alert) => (
        <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
            {(alert.user || alert.userEmail) &&
                <span className="text-default fs-7 text-break">
                    <i className="pi pi-user text-faint me-2" aria-hidden="true" />
                    {alert.user?.email ?? `${alert.userEmail} (deleted)`}
                    {alert.user?.blockedAt && <Tag value="Blocked" severity="danger" className="ms-2" />}
                </span>}
            {(alert.club || alert.clubName) &&
                <span className="text-subtle fs-8 text-break"><i className="pi pi-home text-faint me-2" aria-hidden="true" />{alert.club?.name ?? `${alert.clubName} (deleted)`}</span>}
            {alert.ip &&
                <span className="text-subtle fs-8">
                    <i className="pi pi-globe text-faint me-2" aria-hidden="true" />{alert.ip}
                    {blockedIps.has(alert.ip) && <Tag value="Blocked" severity="danger" className="ms-2" />}
                </span>}
        </div>
    );

    const actionTakenBody = (alert) => ACTION_LABELS[alert.action]
        ? <span className="text-subtle fs-8 text-nowrap"><i className="pi pi-shield text-faint me-2" aria-hidden="true" />{ACTION_LABELS[alert.action]}</span>
        : <span className="text-faint fs-7">–</span>;

    const actionsBody = (alert) => (
        <div className="row-actions">
            {alert.user && alert.user.role !== 'globalAdmin' && (alert.user.blockedAt
                ? <Button icon="pi pi-unlock" severity="secondary" aria-label={`Unblock ${alert.user.email}`} tooltip="Unblock account" tooltipOptions={{ position: 'top' }}
                    onClick={() => run('Unblock account', () => AdminService.unblockUser(alert.user.id), alert.user.email)} />
                : <Button icon="pi pi-ban" severity="danger" aria-label={`Block ${alert.user.email}`} tooltip="Block account" tooltipOptions={{ position: 'top' }}
                    onClick={() => confirmBlockUser(alert.user)} />
            )}
            {alert.ip && !blockedIps.has(alert.ip) &&
                <Button icon="pi pi-globe" severity="danger" aria-label={`Block registrations from ${alert.ip}`} tooltip="Block registrations from this address for 24 hours" tooltipOptions={{ position: 'top' }}
                    onClick={() => run('Block address', () => AdminService.blockIp(alert.ip, `From an alert: ${alert.rule.title}`, 24), alert.ip)} />}
            {alert.status === 'open'
                ? <Button icon="pi pi-check" aria-label="Resolve" tooltip="Resolve" tooltipOptions={{ position: 'top' }}
                    onClick={() => run('Resolve alert', () => AdminService.resolveAlert(alert.id))} />
                : <Button icon="pi pi-replay" severity="secondary" aria-label="Reopen" tooltip={`Resolved by ${alert.resolvedBy}, reopen`} tooltipOptions={{ position: 'top' }}
                    onClick={() => run('Reopen alert', () => AdminService.reopenAlert(alert.id))} />}
        </div>
    );

    const openCount = status === 'open' ? alerts?.length ?? 0 : null;

    return (
        <div className="d-flex flex-column gap-4">
            <div className="row g-3">
                <div className="col-6 col-lg-3"><StatTile label="Open alerts" value={openCount ?? '–'} /></div>
                <div className="col-6 col-lg-3"><StatTile label="Critical" value={status === 'open' ? (alerts?.filter(alert => alert.severity === 'critical').length ?? '–') : '–'} /></div>
                <div className="col-6 col-lg-3"><StatTile label="Blocked accounts" value={blocks.users.length} /></div>
                <div className="col-6 col-lg-3"><StatTile label="Blocked addresses" value={blocks.ips.length} /></div>
            </div>

            <Panel header="Alerts">
                <AdminToolbar>
                    <SelectButton value={status} options={STATUS_OPTIONS} onChange={(e) => e.value && setStatus(e.value)} aria-label="Status" />
                    <div className="ms-auto d-flex align-items-center gap-3">
                        {alerts && <span className="text-faint fs-7">{alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}</span>}
                        {status === 'open' &&
                            <Button icon="pi pi-check" label="Resolve all" size="small" disabled={!alerts?.length}
                                onClick={() => run('Resolve all', () => AdminService.resolveAllAlerts(), 'All alerts are resolved')} />}
                    </div>
                </AdminToolbar>
                <DataTable
                    value={alerts ?? []}
                    dataKey="id"
                    className="admin-table"
                    loading={alerts === null}
                    paginator
                    rows={15}
                    rowsPerPageOptions={[15, 30, 60]}
                    emptyMessage={status === 'open' ? 'No open alerts. Nothing suspicious happened.' : 'No alerts.'}
                    responsiveLayout="scroll"
                >
                    <Column header="When" body={whenBody} />
                    <Column header="Severity" body={(alert) => <Tag {...SEVERITY_TAGS[alert.severity]} />} />
                    <Column header="Alert" body={alertBody} style={{ minWidth: '16rem' }} />
                    <Column header="Who" body={whoBody} style={{ minWidth: '12rem' }} />
                    <Column header="Done by the rules" body={actionTakenBody} />
                    <Column body={actionsBody} />
                </DataTable>
            </Panel>

            <div className="row g-4">
                <div className="col-12 col-xl-6">
                    <Panel header="Blocked accounts" className="h-100">
                        <span className="d-block text-subtle fs-7 mb-3">A blocked account is logged out and cannot log in. Global admins are never blocked.</span>
                        <DataTable value={blocks.users} dataKey="id" className="admin-table" emptyMessage="No blocked accounts." responsiveLayout="scroll">
                            <Column header="Account" body={(user) => (
                                <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                                    <span className="text-default fw-semibold fs-7 text-break">{user.firstname} {user.lastname}</span>
                                    <span className="text-faint fs-8 text-break">{user.email}</span>
                                </div>
                            )} />
                            <Column header="Why" body={(user) => (
                                <div className="d-flex flex-column">
                                    <span className="text-subtle fs-8">{user.blockedReason || '–'}</span>
                                    <span className="text-faint fs-8">since {formatDateTime(user.blockedAt)}</span>
                                </div>
                            )} />
                            <Column body={(user) => (
                                <div className="row-actions">
                                    <Button icon="pi pi-unlock" severity="secondary" aria-label={`Unblock ${user.email}`} tooltip="Unblock" tooltipOptions={{ position: 'top' }}
                                        onClick={() => run('Unblock account', () => AdminService.unblockUser(user.id), user.email)} />
                                </div>
                            )} />
                        </DataTable>
                    </Panel>
                </div>
                <div className="col-12 col-xl-6">
                    <Panel header="Blocked addresses" className="h-100">
                        <span className="d-block text-subtle fs-7 mb-3">No new accounts can be registered from a blocked address; accounts that exist keep working.</span>
                        <form
                            className="d-flex flex-wrap align-items-center gap-2 mb-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                run('Block address', () => AdminService.blockIp(newIp.trim(), 'Blocked by hand', newIpHours), newIp.trim())
                                    .then(done => done && setNewIp(''));
                            }}
                        >
                            <InputText value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="e.g. 203.0.113.7" aria-label="Address to block" />
                            <Dropdown value={newIpHours} options={DURATION_OPTIONS} onChange={(e) => setNewIpHours(e.value)} aria-label="Block for" />
                            <Button type="submit" icon="pi pi-ban" label="Block" size="small" severity="danger" disabled={!newIp.trim()} />
                        </form>
                        <DataTable value={blocks.ips} dataKey="id" className="admin-table" emptyMessage="No blocked addresses." responsiveLayout="scroll">
                            <Column header="Address" body={(block) => <span className="text-default fw-semibold fs-7">{block.ip}</span>} />
                            <Column header="Why" body={(block) => (
                                <div className="d-flex flex-column">
                                    <span className="text-subtle fs-8">{block.reason || '–'}</span>
                                    <span className="text-faint fs-8">{block.blockedBy === 'rules' ? 'by the rules' : `by ${block.blockedBy}`}</span>
                                </div>
                            )} />
                            <Column header="Until" body={(block) => <span className="text-subtle fs-8 text-nowrap">{block.until ? formatDateTime(block.until) : 'No end'}</span>} />
                            <Column body={(block) => (
                                <div className="row-actions">
                                    <Button icon="pi pi-unlock" severity="secondary" aria-label={`Unblock ${block.ip}`} tooltip="Unblock" tooltipOptions={{ position: 'top' }}
                                        onClick={() => run('Unblock address', () => AdminService.unblockIp(block.id), block.ip)} />
                                </div>
                            )} />
                        </DataTable>
                    </Panel>
                </div>
            </div>

            <Panel header="Rules">
                <ul className="list-unstyled m-0 d-flex flex-column gap-3">
                    {rules.map(rule => (
                        <li key={rule.id} className="d-flex align-items-start gap-3">
                            <Tag {...SEVERITY_TAGS[rule.severity]} className="flex-shrink-0" style={{ minWidth: '4.5rem' }} />
                            <div className="d-flex flex-column">
                                <span className="text-default fw-semibold fs-7">{rule.title}</span>
                                <span className="text-subtle fs-8">{rule.description}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </Panel>

            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default AlertsPage;
