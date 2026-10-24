import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';

import AuthService from '../../services/auth.service';
import { useAuth } from '../../utils/auth.context';
import { formatDate } from '../../utils/dates';
import { t } from '../../utils/i18n';
import { MFA_CHANGED } from './mfa.events';

/**
 * While the installation requires two-step login and the account has not
 * set it up yet (and may still wait): until when, and the way to it.
 */
const MfaDueNotice = () => {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [state, setState] = useState(null);

    useEffect(() => {
        if (!user?.id) return undefined;
        const load = () => AuthService.mfaStatus().then(setState).catch(() => setState(null));
        load();
        window.addEventListener(MFA_CHANGED, load);
        return () => window.removeEventListener(MFA_CHANGED, load);
    }, [user?.id]);

    if (!state?.setupDue || state.enabled || pathname === '/profile') return null;
    return (
        <div className="mfa-due-notice" role="status">
            <i className="pi pi-lock" aria-hidden="true" />
            <span className="flex-grow-1">{t('This installation requires two-step login: set it up by {{date}}, or you set it up at your next login after that.', { date: formatDate(state.setupDue) })}</span>
            <Button type="button" label={t('Set up')} icon="pi pi-arrow-right" iconPos="right" size="small" onClick={() => navigate('/profile#two-step')} />
        </div>
    );
};

export default MfaDueNotice;
