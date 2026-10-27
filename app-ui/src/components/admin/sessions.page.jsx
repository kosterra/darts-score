import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import { KpiHero } from '../stats/players/kpi';
import { formatNumber } from './installation.utils';
import { OverviewSkeleton } from '../elements/skeletons';
import { formatDateTime } from '../../utils/dates';
import { relativeTime } from '../../utils/relative.time';
import { t, tn } from '../../utils/i18n';
import { ACCENT } from '../../utils/palette';

const GREEN = ACCENT.green;
// the list follows on its own, every half minute
const REFRESH_MS = 30 * 1000;
const initials = (user) => `${user.firstname?.[0] ?? ''}${user.lastname?.[0] ?? ''}`.toUpperCase() || '?';

/**
 * For global admins: who is logged in now. The totals (accounts, sessions,
 * active in the last minutes, used the app today) and every account with its
 * sessions: the device, since when, last used and until when. A session, or
 * all of an account, can be ended: that device has to log in again.
 */
const SessionsPage = () => {
    const toast = useRef(null);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [now, setNow] = useState(Date.now());

    const load = useCallback(() => AdminService.loadSessions()
        .then(loaded => { setData(loaded); setError(''); setNow(Date.now()); })
        .catch(err => setError(err.message)), []);

    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load]);

    const run = async (key, action, detail) => {
        setBusy(key);
        try {
            setData(await action());
            setNow(Date.now());
            toast.current?.show({ severity: 'success', summary: t('Logged in'), detail, life: 3000 });
        } catch (err) {
            toast.current?.show({ severity: 'error', summary: t('Logged in'), detail: err.message, life: 4000 });
            load();
        }
        setBusy('');
    };
    const endOne = (user, session) => confirmDialog({
        header: t('End session'),
        message: t('{{name}} is logged out on {{device}} and has to log in again there.', { name: `${user.firstname} ${user.lastname}`, device: session.device || t('this device') }),
        icon: 'pi pi-sign-out',
        acceptLabel: t('End session'),
        rejectLabel: t('Cancel'),
        acceptClassName: 'p-button-danger p-button-sm',
        rejectClassName: 'p-button-secondary p-button-sm',
        accept: () => run(session.id, () => AdminService.endSession(session.id), t('The session has ended.')),
    });
    const endAll = (user) => confirmDialog({
        header: t('End all sessions'),
        message: t('{{name}} is logged out on every device and has to log in again.', { name: `${user.firstname} ${user.lastname}` }),
        icon: 'pi pi-sign-out',
        acceptLabel: t('End all sessions'),
        rejectLabel: t('Cancel'),
        acceptClassName: 'p-button-danger p-button-sm',
        rejectClassName: 'p-button-secondary p-button-sm',
        accept: () => run(user.id, () => AdminService.endSessionsOf(user.id), t('All sessions of {{name}} have ended.', { name: `${user.firstname} ${user.lastname}` })),
    });

    if (!data) return error ? <Message severity="error" text={error} /> : <OverviewSkeleton title={t('Logged in now')} />;
    const activeSince = now - data.activeMinutes * 60 * 1000;

    return (
        <div className="d-flex flex-column gap-4">
            <Panel header={t('Logged in now')}>
                <div className="kpi-headline">
                    <KpiHero label={t('Logged-in users')} value={formatNumber(data.totals.users)} color={GREEN} />
                    <KpiHero label={t('Active sessions')} value={formatNumber(data.totals.sessions)} color={GREEN} />
                    <KpiHero label={t('Active now')} value={formatNumber(data.totals.activeNow)} detail={t('in the last {{count}} minutes', { count: data.activeMinutes })} color={GREEN} />
                    <KpiHero label={t('Used the app today')} value={formatNumber(data.totals.usedToday)} color={GREEN} />
                </div>
                <p className="text-faint fs-8 mt-3 mb-0">{t('A session is a login on one device; it ends with logging out, a new password, or when its time is up. The list follows on its own.')}</p>
            </Panel>

            <Panel header={t('Accounts')}>
                {!data.users.length && <span className="text-faint">{t('Nobody is logged in.')}</span>}
                <ul className="list-unstyled m-0 session-list">
                    {data.users.map(user => {
                        const own = user.sessions.some(session => session.current);
                        const active = new Date(user.lastSeenAt).getTime() > activeSince;
                        return (
                            <li key={user.id} className="session-account">
                                <div className="session-account-head">
                                    <span className="session-avatar">
                                        <Avatar label={initials(user)} shape="circle" className="bg-surface-high" />
                                        {active && <span className="session-dot" title={t('Active now')} />}
                                    </span>
                                    <span className="d-flex flex-column min-w-0 flex-grow-1">
                                        <span className="d-flex flex-wrap align-items-center column-gap-2 row-gap-1">
                                            <span className="text-default fw-semibold text-truncate mw-100">{user.firstname} {user.lastname}</span>
                                            {user.role === 'globalAdmin' && <Tag value={t('Global admin')} severity="info" />}
                                            {own && <span className="text-faint fs-8">{t('(you)')}</span>}
                                        </span>
                                        <span className="text-subtle fs-8 text-truncate">{user.email}</span>
                                    </span>
                                    <span className="d-flex flex-column align-items-end text-nowrap">
                                        <span className="text-default fs-7">{relativeTime(user.lastSeenAt, now)}</span>
                                        <span className="text-faint fs-8">{tn(user.sessions.length, '{{count}} session', '{{count}} sessions')}</span>
                                    </span>
                                </div>
                                <ul className="list-unstyled m-0 session-devices">
                                    {user.sessions.map(session => (
                                        <li key={session.id}>
                                            <i className={`pi ${/iPhone|Android/.test(session.device) ? 'pi-mobile' : /iPad/.test(session.device) ? 'pi-tablet' : 'pi-desktop'} text-subtle`} aria-hidden="true" />
                                            <span className="d-flex flex-column min-w-0 flex-grow-1">
                                                <span className="text-default fs-7">
                                                    {session.device || t('Unknown device')}
                                                    {session.current && <span className="text-faint fs-8 ms-2">{t('This device')}</span>}
                                                </span>
                                                <span className="text-faint fs-8">
                                                    {t('Logged in {{when}} · last used {{used}} · ends {{ends}}', { when: formatDateTime(session.startedAt), used: relativeTime(session.lastSeenAt, now), ends: relativeTime(session.expiresAt, now) })}
                                                </span>
                                            </span>
                                            {!session.current &&
                                                <Button icon="pi pi-sign-out" text severity="danger" size="small" aria-label={t('End session')} title={t('End session')} loading={busy === session.id} onClick={() => endOne(user, session)} />}
                                        </li>
                                    ))}
                                </ul>
                                {!own && user.sessions.length > 1 &&
                                    <div className="d-flex justify-content-end">
                                        <Button label={t('End all sessions')} icon="pi pi-sign-out" size="small" severity="danger" outlined loading={busy === user.id} onClick={() => endAll(user)} />
                                    </div>}
                            </li>
                        );
                    })}
                </ul>
            </Panel>
            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default SessionsPage;
