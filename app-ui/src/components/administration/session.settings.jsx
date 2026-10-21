import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';

import AdminService from '../../services/admin.service';
import { t } from '../../utils/i18n';

/**
 * How long a login lasts: after that the user is logged out, with a warning
 * shortly before that lets them stay logged in.
 */
const SessionSettings = ({ onSaved }) => {
    const [settings, setSettings] = useState(null);
    const [hours, setHours] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        AdminService.loadSessionSettings()
            .then(loaded => { setSettings(loaded); setHours(loaded.timeoutHours); })
            .catch(err => setError(err.message));
    }, []);

    if (!settings) return error ? <Message severity="error" text={error} /> : null;
    const { min, max } = settings.limits;

    const save = async () => {
        setError('');
        setSaving(true);
        try {
            const saved = await AdminService.saveSessionSettings(hours);
            setSettings(saved);
            setHours(saved.timeoutHours);
            onSaved?.(saved.timeoutHours === 1 ? t('A login now lasts 1 hour.') : t('A login now lasts {{count}} hours.', { count: saved.timeoutHours }));
        } catch (err) {
            setError(err.message);
        }
        setSaving(false);
    };

    return (
        <Panel header={t('Session')}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('How long a login lasts. Ten minutes before the end everyone is asked whether to stay logged in, which starts the time again; otherwise they are logged out. A shorter time also shortens logins that are running now.')}
                </span>
                <div className="d-flex flex-wrap align-items-center gap-3">
                    <label htmlFor="session-hours" className="text-default fw-semibold fs-7">{t('Log out after')}</label>
                    <InputNumber
                        inputId="session-hours"
                        value={hours}
                        onValueChange={(event) => setHours(event.value)}
                        min={min}
                        max={max}
                        showButtons
                        suffix={hours === 1 ? ' hour' : ' hours'}
                        inputClassName="session-hours-input"
                    />
                    <span className="text-faint fs-8">{min}{' '}{t('to')}{' '}{max}{' '}{t('hours,')}{' '}{settings.limits.default}{' '}{t('by default')}</span>
                </div>
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <div className="d-flex justify-content-end">
                    <Button label={t('Save')} icon="pi pi-save" size="small" loading={saving} disabled={!hours || hours === settings.timeoutHours} onClick={save} />
                </div>
            </div>
        </Panel>
    );
};

export default SessionSettings;
