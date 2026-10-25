import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

import AuthLayout from './auth.layout';
import PlayerService from '../../services/player.service';
import { useAuth } from '../../utils/auth.context';
import { clearPendingClaim, setPendingClaim } from '../../utils/pending.claim';
import { t } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';

/**
 * A claim link (/claim/<token>): the player of a club without a login takes
 * it over with an account of their own, with all their games, statistics and
 * badges. Logged in: one button; otherwise register or log in first, and the
 * link is kept for after.
 */
const ClaimPage = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { user, refreshClubs, selectClub } = useAuth();
    const token = decodeURIComponent(pathname.replace(/^\/claim\//, ''));
    const [info, setInfo] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        PlayerService.claimInfo(token).then(setInfo).catch((err) => setError(err.message));
    }, [token]);
    // kept while logged out (also for the Log in and Register of the bar),
    // no longer needed once back here logged in
    useEffect(() => {
        if (user) clearPendingClaim();
        else if (info) setPendingClaim(token);
    }, [user, info, token]);

    const takeOver = async () => {
        setBusy(true);
        setError('');
        try {
            const done = await PlayerService.claim(token);
            clearPendingClaim();
            await refreshClubs();
            selectClub(done.club);
            navigate('/me', { replace: true });
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    };
    const first = (path) => {
        setPendingClaim(token);
        navigate(path);
    };

    return (
        <AuthLayout hide={user ? 'both' : undefined} title={t('Your own login')}>
            {!info && !error && <Lines count={3} />}
            {error && !info &&
                <div className="d-flex flex-column gap-3">
                    <Message severity="warn" text={error} className="w-100 justify-content-start" />
                    <Button type="button" label={t('Open Legmate')} icon="pi pi-home" severity="secondary" onClick={() => navigate('/', { replace: true })} />
                </div>}
            {info &&
                <div className="d-flex flex-column gap-3 pt-2">
                    <p className="m-0">
                        {t('{{club}} plays you as {{nickname}}. With a login of your own you see your statistics, badges and level any time, start games and trainings yourself and choose your notifications.', { club: info.club.name, nickname: info.nickname })}
                    </p>
                    <p className="m-0 text-subtle fs-7">{t('Everything you played so far stays yours: your games, statistics and badges.')}</p>
                    {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                    {user
                        ? <Button type="button" label={t('Play as {{nickname}} with this account', { nickname: info.nickname })} icon="pi pi-check" loading={busy} onClick={takeOver} />
                        : <>
                            <Button type="button" label={t('Create your login')} icon="pi pi-user-plus" onClick={() => first('/register')} />
                            <Button type="button" label={t('I have an account: log in')} icon="pi pi-sign-in" severity="secondary" outlined onClick={() => first('/login')} />
                        </>}
                    {user && <span className="text-faint fs-8">{t('Logged in as {{email}}.', { email: user.email })}</span>}
                </div>}
        </AuthLayout>
    );
};

export default ClaimPage;
