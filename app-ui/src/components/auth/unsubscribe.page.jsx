import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

import AuthLayout from './auth.layout';
import NotificationService from '../../services/notification.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';

/**
 * The link at the bottom of a mail (/unsubscribe?token=…): no more mails of
 * one kind, or none at all, without logging in. It asks first, so a program
 * that opens the links of mails does not turn them off.
 */
const UnsubscribePage = () => {
    const { search } = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const token = new URLSearchParams(search).get('token') ?? '';
    const [target, setTarget] = useState(null);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        NotificationService.unsubscribeInfo(token).then(setTarget).catch((err) => setError(err.message));
    }, [token]);

    const confirm = async () => {
        setBusy(true);
        try {
            await NotificationService.unsubscribe(token);
            setDone(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const contact = target?.type === 'contact';
    return (
        <AuthLayout hide={user ? 'both' : undefined} title={t('No more mails')}>
            {!target && !error && <Lines count={2} />}
            {error && <Message severity="warn" text={error} className="w-100 justify-content-start mb-3" />}
            {target && !done &&
                <div className="d-flex flex-column gap-3 pt-2">
                    <p className="m-0">
                        {contact
                            ? t('Get no more mails about your player? Your club keeps your player with its games and statistics.')
                            : t('Get no more mails from Oche? Mails about the security of your account still come.')}
                    </p>
                    <Button type="button" label={t('No more mails')} icon="pi pi-envelope" loading={busy} onClick={confirm} />
                </div>}
            {done &&
                <div className="d-flex flex-column gap-3 pt-2">
                    <Message severity="success" text={t('Done: no more of these mails.')} className="w-100 justify-content-start" />
                    {!contact && <span className="text-subtle fs-7">{t('You can choose again any time on your profile, under Notifications.')}</span>}
                    <Button type="button" label={contact ? t('Open Oche') : t('Choose your notifications')} icon={contact ? 'pi pi-home' : 'pi pi-bell'} severity="secondary" onClick={() => navigate(contact ? '/' : '/profile#notifications', { replace: true })} />
                </div>}
        </AuthLayout>
    );
};

export default UnsubscribePage;
