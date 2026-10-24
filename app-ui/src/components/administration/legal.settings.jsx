import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';

import AdminService from '../../services/admin.service';
import { t } from '../../utils/i18n';

const FIELDS = ['operator', 'address', 'email', 'notes'];

/**
 * Who runs the installation, for its privacy policy and imprint (the page
 * /privacy, linked in the footer of the public pages and on About).
 */
const LegalSettings = ({ onSaved }) => {
    const [settings, setSettings] = useState(null);
    const [draft, setDraft] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        AdminService.loadLegalSettings()
            .then(loaded => { setSettings(loaded); setDraft(loaded); })
            .catch(err => setError(err.message));
    }, []);

    if (!settings) return error ? <Message severity="error" text={error} /> : null;
    const changed = FIELDS.some(field => draft[field] !== settings[field]);
    const field = (name) => ({ value: draft[name] ?? '', onChange: (event) => setDraft({ ...draft, [name]: event.target.value }), maxLength: settings.limits[name] });

    const save = async () => {
        setError('');
        setSaving(true);
        try {
            const saved = await AdminService.saveLegalSettings(Object.fromEntries(FIELDS.map(name => [name, draft[name] ?? ''])));
            setSettings(saved);
            setDraft(saved);
            onSaved?.(t('Privacy and imprint'));
        } catch (err) {
            setError(err.message);
        }
        setSaving(false);
    };

    return (
        <Panel header={t('Privacy and imprint')}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('Who runs this installation: shown on the privacy page and in the imprint, linked in the footer of the public pages and on About.')}{' '}<Link to="/privacy">{t('Open the privacy page')}</Link>
                </span>
                {!settings.operator && !settings.email && <Message severity="warn" text={t('Enter at least your name and an email address before you make the installation public.')} className="w-100 justify-content-start" />}
                <label className="d-flex flex-column gap-1" htmlFor="legal-operator">
                    <span className="fs-7 text-default fw-semibold">{t('Operator')}</span>
                    <InputText id="legal-operator" {...field('operator')} placeholder={t('Your name, or the name of your club or association')} />
                </label>
                <label className="d-flex flex-column gap-1" htmlFor="legal-address">
                    <span className="fs-7 text-default fw-semibold">{t('Postal address')}</span>
                    <InputTextarea id="legal-address" {...field('address')} rows={3} autoResize />
                </label>
                <label className="d-flex flex-column gap-1" htmlFor="legal-email">
                    <span className="fs-7 text-default fw-semibold">{t('Contact email')}</span>
                    <InputText id="legal-email" type="email" {...field('email')} />
                </label>
                <label className="d-flex flex-column gap-1" htmlFor="legal-notes">
                    <span className="fs-7 text-default fw-semibold">{t('More for the privacy page')}</span>
                    <InputTextarea id="legal-notes" {...field('notes')} rows={3} autoResize placeholder={t('E.g. where the installation is hosted, or that its traffic goes through Cloudflare')} />
                </label>
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <div className="d-flex justify-content-end">
                    <Button label={t('Save')} icon="pi pi-save" size="small" loading={saving} disabled={!changed} onClick={save} />
                </div>
            </div>
        </Panel>
    );
};

export default LegalSettings;
