import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';

import AdminService from '../../services/admin.service';

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
            onSaved?.(`A login now lasts ${saved.timeoutHours} ${saved.timeoutHours === 1 ? 'hour' : 'hours'}.`);
        } catch (err) {
            setError(err.message);
        }
        setSaving(false);
    };

    return (
        <Panel header="Session">
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    How long a login lasts. Ten minutes before the end everyone is asked whether to stay logged in, which starts the time again;
                    otherwise they are logged out. A shorter time also shortens logins that are running now.
                </span>
                <div className="d-flex flex-wrap align-items-center gap-3">
                    <label htmlFor="session-hours" className="text-default fw-semibold fs-7">Log out after</label>
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
                    <span className="text-faint fs-8">{min} to {max} hours, {settings.limits.default} by default</span>
                </div>
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <div className="d-flex justify-content-end">
                    <Button label="Save" icon="pi pi-save" size="small" loading={saving} disabled={!hours || hours === settings.timeoutHours} onClick={save} />
                </div>
            </div>
        </Panel>
    );
};

export default SessionSettings;
