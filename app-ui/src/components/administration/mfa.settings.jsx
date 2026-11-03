import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';
import { SelectButton } from 'primereact/selectbutton';

import AdminService from '../../services/admin.service';
import SaveStatus from '../elements/save.status';
import useAutoSave from '../../utils/use.auto.save';
import { formatDate } from '../../utils/dates';
import { t } from '../../utils/i18n';

const POLICIES = [
    { value: 'off', label: t('Off'), hint: t('Nobody uses it; accounts that set it up keep using it.') },
    { value: 'optional', label: t('Optional'), hint: t('Everyone may turn it on for their account, on their profile.') },
    { value: 'admins', label: t('Required for admins'), hint: t('The club admins and global admins have to use it; for the others it is optional.') },
    { value: 'everyone', label: t('Required for everyone'), hint: t('Every account has to use it.') },
];

/**
 * Two-step login for the installation: off, optional, or required for the
 * admins or everyone, with the days to set it up before the login asks for
 * it. Requiring it needs it on for the own account first. Saved as you
 * go: the policy at once, the days a moment after they stopped changing.
 */
const MfaSettings = () => {
    const [settings, setSettings] = useState(null);
    const [policy, setPolicy] = useState(null);
    const [graceDays, setGraceDays] = useState(null);
    const [error, setError] = useState('');
    // requiring it is not sent before the own account uses it (the warning below says why)
    const allowed = (next) => settings.ownEnabled || (next.policy !== 'admins' && next.policy !== 'everyone');
    const mfaSave = useAutoSave(async (next) => {
        const saved = await AdminService.saveMfaSettings(next);
        setSettings(current => ({ ...current, ...saved }));
    }, { valid: (next) => allowed(next) && Number.isInteger(next.graceDays) });

    useEffect(() => {
        AdminService.loadMfaSettings()
            .then(loaded => { setSettings(loaded); setPolicy(loaded.policy); setGraceDays(loaded.graceDays); })
            .catch(err => setError(err.message));
    }, []);

    if (!settings) return error ? <Message severity="error" text={error} /> : null;
    const requiring = policy === 'admins' || policy === 'everyone';

    // the policy and the days are sent together, the policy at once
    const change = (patch, options) => {
        const next = { policy, graceDays, ...patch };
        if ('policy' in patch) setPolicy(patch.policy);
        if ('graceDays' in patch) setGraceDays(patch.graceDays);
        mfaSave.change(next, options);
    };

    return (
        <Panel header={t('Two-step login')} icons={<SaveStatus {...mfaSave} className="me-2" />}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7 text-measure">
                    {t('After the password, a code of an authenticator app on the phone, or one of ten recovery codes. A device can be trusted for 30 days. For a lost phone, reset it under Users.')}{' '}{t('Saved as you go.')}
                </span>
                <SelectButton value={policy} options={POLICIES} optionLabel="label" optionValue="value" onChange={(e) => e.value && e.value !== policy && change({ policy: e.value }, { now: true })} className="p-selectbutton-pills pills-inline flex-wrap" aria-label={t('Two-step login')} />
                <span className="text-faint fs-8">{POLICIES.find(entry => entry.value === policy)?.hint}</span>
                {requiring &&
                    <div className="d-flex flex-wrap align-items-center gap-3">
                        <label htmlFor="mfa-grace" className="text-default fw-semibold fs-7">{t('Days to set it up')}</label>
                        <InputNumber inputId="mfa-grace" value={graceDays} onValueChange={(event) => change({ graceDays: event.value ?? 0 })} onBlur={mfaSave.flush} min={settings.graceLimits.min} max={settings.graceLimits.max} showButtons inputClassName="session-hours-input" />
                        <span className="text-faint fs-8">{t('Until then a reminder shows; after that the login asks to set it up first. 0: at the next login.')}</span>
                    </div>}
                {requiring && settings.requiredSince && settings.policy === policy &&
                    <span className="text-faint fs-8">{t('Required since {{date}}.', { date: formatDate(settings.requiredSince) })}</span>}
                {requiring && !settings.ownEnabled &&
                    <Message severity="warn" className="w-100 justify-content-start" content={<span>{t('Not saved: turn on two-step login for your own account first, so nobody locks out the installation:')}{' '}<Link to="/profile#two-step">{t('Profile → Account')}</Link></span>} />}
            </div>
        </Panel>
    );
};

export default MfaSettings;
