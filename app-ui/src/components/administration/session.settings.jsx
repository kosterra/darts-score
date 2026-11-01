import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';

import AdminService from '../../services/admin.service';
import SaveStatus from '../elements/save.status';
import useAutoSave from '../../utils/use.auto.save';
import { t } from '../../utils/i18n';

/**
 * How long a login lasts: after that the user is logged out, with a warning
 * shortly before that lets them stay logged in. Saved a moment after the
 * hours stopped changing.
 */
const SessionSettings = () => {
    const [settings, setSettings] = useState(null);
    const [hours, setHours] = useState(null);
    const [error, setError] = useState('');
    const inRange = (value) => Number.isInteger(value) && value >= settings.limits.min && value <= settings.limits.max;
    const hoursSave = useAutoSave((value) => AdminService.saveSessionSettings(value), { valid: (value) => inRange(value) });

    useEffect(() => {
        AdminService.loadSessionSettings()
            .then(loaded => { setSettings(loaded); setHours(loaded.timeoutHours); })
            .catch(err => setError(err.message));
    }, []);

    if (!settings) return error ? <Message severity="error" text={error} /> : null;
    const { min, max } = settings.limits;

    const change = (value) => {
        setHours(value);
        hoursSave.change(value);
    };

    return (
        <Panel header={t('Session')} icons={<SaveStatus {...hoursSave} className="me-2" />}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('How long a login lasts. Ten minutes before the end everyone is asked whether to stay logged in, which starts the time again; otherwise they are logged out. A shorter time also shortens logins that are running now.')}{' '}{t('Saved as you go.')}
                </span>
                <div className="d-flex flex-wrap align-items-center gap-3">
                    <label htmlFor="session-hours" className="text-default fw-semibold fs-7">{t('Log out after')}</label>
                    <InputNumber
                        inputId="session-hours"
                        value={hours}
                        onValueChange={(event) => change(event.value)}
                        onBlur={hoursSave.flush}
                        invalid={!inRange(hours)}
                        min={min}
                        max={max}
                        showButtons
                        suffix={hours === 1 ? ' hour' : ' hours'}
                        inputClassName="session-hours-input"
                    />
                    <span className={`fs-8 ${inRange(hours) ? 'text-faint' : 'text-danger'}`}>{min}{' '}{t('to')}{' '}{max}{' '}{t('hours,')}{' '}{settings.limits.default}{' '}{t('by default')}</span>
                </div>
            </div>
        </Panel>
    );
};

export default SessionSettings;
