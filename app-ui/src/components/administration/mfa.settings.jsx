import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';
import { SelectButton } from 'primereact/selectbutton';

import AdminService from '../../services/admin.service';
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
 * it. Requiring it needs it on for the own account first.
 */
const MfaSettings = ({ onSaved }) => {
    const [settings, setSettings] = useState(null);
    const [policy, setPolicy] = useState(null);
    const [graceDays, setGraceDays] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        AdminService.loadMfaSettings()
            .then(loaded => { setSettings(loaded); setPolicy(loaded.policy); setGraceDays(loaded.graceDays); })
            .catch(err => setError(err.message));
    }, []);

    if (!settings) return error ? <Message severity="error" text={error} /> : null;
    const requiring = policy === 'admins' || policy === 'everyone';
    const changed = policy !== settings.policy || graceDays !== settings.graceDays;

    const save = async () => {
        setError('');
        setSaving(true);
        try {
            const saved = await AdminService.saveMfaSettings({ policy, graceDays });
            setSettings(saved);
            onSaved?.(POLICIES.find(entry => entry.value === saved.policy)?.label);
        } catch (err) {
            setError(err.message);
        }
        setSaving(false);
    };

    return (
        <Panel header={t('Two-step login')}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('After the password, a code of an authenticator app on the phone, or one of ten recovery codes. A device can be trusted for 30 days. For a lost phone, reset it under Users.')}
                </span>
                <SelectButton value={policy} options={POLICIES} optionLabel="label" optionValue="value" onChange={(e) => e.value && setPolicy(e.value)} className="p-selectbutton-pills flex-wrap" aria-label={t('Two-step login')} />
                <span className="text-faint fs-8">{POLICIES.find(entry => entry.value === policy)?.hint}</span>
                {requiring &&
                    <div className="d-flex flex-wrap align-items-center gap-3">
                        <label htmlFor="mfa-grace" className="text-default fw-semibold fs-7">{t('Days to set it up')}</label>
                        <InputNumber inputId="mfa-grace" value={graceDays} onValueChange={(event) => setGraceDays(event.value ?? 0)} min={settings.graceLimits.min} max={settings.graceLimits.max} showButtons inputClassName="session-hours-input" />
                        <span className="text-faint fs-8">{t('Until then a reminder shows; after that the login asks to set it up first. 0: at the next login.')}</span>
                    </div>}
                {requiring && settings.requiredSince && settings.policy === policy &&
                    <span className="text-faint fs-8">{t('Required since {{date}}.', { date: formatDate(settings.requiredSince) })}</span>}
                {requiring && !settings.ownEnabled &&
                    <Message severity="warn" className="w-100 justify-content-start" content={<span>{t('Turn on two-step login for your own account first, so nobody locks out the installation:')}{' '}<Link to="/profile#two-step">{t('Profile → Account')}</Link></span>} />}
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <div className="d-flex justify-content-end">
                    <Button label={t('Save')} icon="pi pi-save" size="small" loading={saving} disabled={!changed || (requiring && !settings.ownEnabled)} onClick={save} />
                </div>
            </div>
        </Panel>
    );
};

export default MfaSettings;
