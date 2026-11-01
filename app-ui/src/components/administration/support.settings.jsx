import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';

import AdminService from '../../services/admin.service';
import SaveStatus from '../elements/save.status';
import useAutoSave from '../../utils/use.auto.save';
import { t } from '../../utils/i18n';

const FIELDS = ['twint', 'url'];

// empty, or a full address starting with https:// (as the API wants it)
const isLink = (value) => {
    const link = (value ?? '').trim();
    if (!link) return true;
    try {
        return /^https:\/\/[^/\s]+\.[^/\s]+/i.test(link) && Boolean(new URL(link));
    } catch {
        return false;
    }
};

/**
 * The ways to support this installation with a gift, shown on the page
 * /support (linked in the footer of the public pages and on About): a TWINT
 * link and a link to any other donation page. The project's own sponsoring
 * page is shown there anyway. Saved a moment after typing.
 */
const SupportSettings = () => {
    const [settings, setSettings] = useState(null);
    const [draft, setDraft] = useState(null);
    const [error, setError] = useState('');
    const supportSave = useAutoSave(
        (next) => AdminService.saveSupportSettings(Object.fromEntries(FIELDS.map(name => [name, (next[name] ?? '').trim()]))),
        { valid: (next) => FIELDS.every(name => isLink(next[name])) },
    );

    useEffect(() => {
        AdminService.loadSupportSettings().then(loaded => { setSettings(loaded); setDraft(loaded); }).catch(err => setError(err.message));
    }, []);

    if (!settings) return error ? <Message severity="error" text={error} /> : null;
    const change = (name) => (event) => {
        const next = { ...draft, [name]: event.target.value };
        setDraft(next);
        supportSave.change(next);
    };
    const field = (name) => ({ value: draft[name] ?? '', onChange: change(name), onBlur: supportSave.flush, invalid: !isLink(draft[name]), maxLength: 500, type: 'url', inputMode: 'url' });
    const linkHint = (name) => !isLink(draft[name]) && <span className="text-danger fs-8">{t('Enter a full address starting with https://.')}</span>;

    return (
        <Panel header={t('Support Legmate')} icons={<SaveStatus {...supportSave} className="me-2" />}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('Links for gifts to this installation, shown on the page Support Legmate (in the footer of the public pages and on About), only when set. The sponsoring page of the project on GitHub is always shown there.')}{' '}{t('Saved as you go.')}{' '}<Link to="/support">{t('Open the page')}</Link>
                </span>
                <label className="d-flex flex-column gap-1" htmlFor="support-twint">
                    <span className="fs-7 text-default fw-semibold">{t('TWINT link')}</span>
                    <InputText id="support-twint" {...field('twint')} placeholder="https://" />
                    {linkHint('twint')}
                    <span className="text-faint fs-8">{t('A payment or donation link that opens TWINT, e.g. a payment link of Stripe or Payrexx with TWINT, or the donation link of your bank. The page also shows it as a QR code to scan with the TWINT app.')}</span>
                </label>
                <label className="d-flex flex-column gap-1" htmlFor="support-url">
                    <span className="fs-7 text-default fw-semibold">{t('Other donation page')}</span>
                    <InputText id="support-url" {...field('url')} placeholder="https://" />
                    {linkHint('url')}
                    <span className="text-faint fs-8">{t('E.g. Ko-fi, PayPal or your own GitHub Sponsors.')}</span>
                </label>
            </div>
        </Panel>
    );
};

export default SupportSettings;
