import { useCallback, useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

import AuthService from '../../services/auth.service';
import { useAuth } from '../../utils/auth.context';
import { countdown, sessionPhase, warningMs } from './session.timing';
import { t } from '../../utils/i18n';

/**
 * Watches the end of the session: shortly before it asks whether to stay
 * logged in, and when it has run out it goes back to the login. Before either
 * it asks the server again, so extending in another tab counts here too.
 */
const SessionWatch = () => {
    const { user, logout, endSession } = useAuth();
    // { expiresAt, timeoutHours }
    const [session, setSession] = useState(null);
    const [now, setNow] = useState(() => Date.now());
    // the end the warning was confirmed for, and the one it was closed for
    const [confirmed, setConfirmed] = useState(null);
    const [dismissed, setDismissed] = useState(null);
    const [extending, setExtending] = useState(false);

    const load = useCallback(() => AuthService.getSession().then(setSession).catch(() => {}), []);

    useEffect(() => { load(); }, [load, user?.id]);

    // a second's tick, and a fresh look when the tab comes back (e.g. after the laptop slept)
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                setNow(Date.now());
                load();
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [load]);

    const phase = sessionPhase(session?.expiresAt, now, warningMs(session?.timeoutHours ?? 5));

    // ending soon or over: first ask the server whether it still is
    useEffect(() => {
        if (phase === 'ok' || !session) return;
        let current = true;
        AuthService.getSession()
            .then(fresh => {
                if (!current) return;
                setSession(fresh);
                if (fresh.expiresAt <= Date.now()) endSession();
                else setConfirmed(fresh.expiresAt);
            })
            .catch(() => current && endSession());
        return () => { current = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    const extend = async () => {
        setExtending(true);
        try {
            const { expiresAt } = await AuthService.extendSession();
            setSession(value => ({ ...value, expiresAt }));
        } catch {
            endSession();
        } finally {
            setExtending(false);
        }
    };

    const visible = phase === 'warn' && session && confirmed === session.expiresAt && dismissed !== session.expiresAt;
    if (!visible) return null;

    const hours = session.timeoutHours;
    return (
        <Dialog
            header={t('Your session ends soon')}
            visible
            onHide={() => setDismissed(session.expiresAt)}
            draggable={false}
            blockScroll
            style={{ width: 'min(28rem, calc(100vw - 2rem))' }}
        >
            <div className="d-flex flex-column align-items-center gap-2 text-center pb-2">
                <span className="session-countdown" aria-live="polite">{countdown(session.expiresAt - now)}</span>
                <p className="text-subtle fs-7 m-0">
                    {t('Then you are logged out. A game going on is saved after every visit and can be continued after logging in again.')}
                </p>
            </div>
            <div className="d-flex justify-content-end flex-wrap gap-2 mt-3">
                <Button type="button" label={t('Log out')} size="small" severity="secondary" onClick={logout} />
                <Button type="button" label={(hours === 1 ? t('Stay logged in for 1 hour') : t('Stay logged in for {{hours}} hours', { hours }))} icon="pi pi-clock" size="small" loading={extending} onClick={extend} autoFocus />
            </div>
        </Dialog>
    );
};

export default SessionWatch;
