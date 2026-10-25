import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';

import AdminService from '../../services/admin.service';
import { t } from '../../utils/i18n';

const FIELDS = ['twint', 'url'];

/**
 * The ways to support this installation with a gift, shown on the page
 * /support (linked in the footer of the public pages and on About): a TWINT
 * link and a link to any other donation page. The project's own sponsoring
 * page is shown there anyway.
 */
const SupportSettings = ({ onSaved }) => {
    const [settings, setSettings] = useState(null);
    const [draft, setDraft] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        AdminService.loadSupportSettings().then(loaded => { setSettings(loaded); setDraft(loaded); }).catch(err => setError(err.message));
    }, []);

    if (!settings) return error ? <Message severity="error" text={error} /> : null;
    const changed = FIELDS.some(field => (draft[field] ?? '') !== (settings[field] ?? ''));
    const field = (name) => ({ value: draft[name] ?? '', onChange: (event) => setDraft({ ...draft, [name]: event.target.value }), maxLength: 500, type: 'url', inputMode: 'url' });

    const save = async () => {
        setError('');
        setSaving(true);
        try {
            const saved = await AdminService.saveSupportSettings(Object.fromEntries(FIELDS.map(name => [name, (draft[name] ?? '').trim()])));
            setSettings(saved);
            setDraft(saved);
            onSaved?.(t('Support Legmate'));
        } catch (err) {
            setError(err.message);
        }
        setSaving(false);
    };

    return (
        <Panel header={t('Support Legmate')}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('Links for gifts to this installation, shown on the page Support Legmate (in the footer of the public pages and on About), only when set. The sponsoring page of the project on GitHub is always shown there.')}{' '}<Link to="/support">{t('Open the page')}</Link>
                </span>
                <label className="d-flex flex-column gap-1" htmlFor="support-twint">
                    <span className="fs-7 text-default fw-semibold">{t('TWINT link')}</span>
                    <InputText id="support-twint" {...field('twint')} placeholder="https://" />
                    <span className="text-faint fs-8">{t('A payment or donation link that opens TWINT, e.g. a payment link of Stripe or Payrexx with TWINT, or the donation link of your bank. The page also shows it as a QR code to scan with the TWINT app.')}</span>
                </label>
                <label className="d-flex flex-column gap-1" htmlFor="support-url">
                    <span className="fs-7 text-default fw-semibold">{t('Other donation page')}</span>
                    <InputText id="support-url" {...field('url')} placeholder="https://" />
                    <span className="text-faint fs-8">{t('E.g. Ko-fi, PayPal or your own GitHub Sponsors.')}</span>
                </label>
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <div className="d-flex justify-content-end">
                    <Button label={t('Save')} icon="pi pi-save" size="small" loading={saving} disabled={!changed} onClick={save} />
                </div>
            </div>
        </Panel>
    );
};

export default SupportSettings;
