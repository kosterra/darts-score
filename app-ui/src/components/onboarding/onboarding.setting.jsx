import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';

import AuthService from '../../services/auth.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';

/**
 * Getting to know Legmate, on the profile: the welcome tour once more (on the
 * Dashboard), and the first steps back on the Dashboard after hiding them.
 */
const OnboardingSetting = ({ onError }) => {
    const { user, setUser, isGlobalAdmin } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(null);
    if (isGlobalAdmin) return null;

    const again = async (changes, key) => {
        setBusy(key);
        try {
            setUser(await AuthService.setOnboarding(changes));
            navigate('/');
        } catch (err) {
            onError?.(t('Tour and first steps'), err);
            setBusy(null);
        }
    };
    const stepsHidden = Boolean(user?.onboarding?.firstStepsHiddenAt);

    return (
        <>
            <p className="game-setup-section-title">{t('Getting to know Legmate')}</p>
            <p className="setting-title">{t('Tour and first steps')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2 pt-1">
                    <span className="text-subtle fs-7">{t('The welcome tour shows the menu in a few steps; the first steps on the Dashboard help you get going and tick themselves off.')}</span>
                    <div className="d-flex flex-wrap gap-2">
                        <Button type="button" label={t('Show the tour again')} icon="pi pi-compass" size="small" severity="secondary" loading={busy === 'tour'} onClick={() => again({ tour: 'again' }, 'tour')} />
                        {stepsHidden && <Button type="button" label={t('Show the first steps again')} icon="pi pi-list-check" size="small" severity="secondary" outlined loading={busy === 'steps'} onClick={() => again({ firstSteps: 'shown' }, 'steps')} />}
                    </div>
                </div>
            </div>
        </>
    );
};

export default OnboardingSetting;
