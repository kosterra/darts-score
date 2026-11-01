import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { SelectButton } from 'primereact/selectbutton';

import AdminService from '../../services/admin.service';
import SaveStatus from '../elements/save.status';
import useAutoSave from '../../utils/use.auto.save';
import { LANGUAGES, currentLanguage, t } from '../../utils/i18n';

const FIELDS = ['operator', 'address', 'email'];
// empty, or something that looks like an email address (the API checks it properly)
const isEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * Who runs the installation, for its privacy policy and imprint (the page
 * /privacy, linked in the footer of the public pages and on About). The
 * notes for the privacy page are written in each language; one left empty
 * shows the English ones. Saved a moment after typing.
 */
const LegalSettings = () => {
    const [settings, setSettings] = useState(null);
    const [draft, setDraft] = useState(null);
    const [error, setError] = useState('');
    const [language, setLanguage] = useState(() => currentLanguage());
    // all of it sent together; what was saved shows in the warning above the fields
    const legalSave = useAutoSave(async (next) => {
        const saved = await AdminService.saveLegalSettings({ ...Object.fromEntries(FIELDS.map(name => [name, next[name] ?? ''])), notes: next.notes });
        setSettings(saved);
    }, { valid: (next) => isEmail(next.email) });

    useEffect(() => {
        AdminService.loadLegalSettings()
            .then(loaded => { setSettings(loaded); setDraft(loaded); })
            .catch(err => setError(err.message));
    }, []);

    if (!settings) return error ? <Message severity="error" text={error} /> : null;
    const change = (patch) => {
        const next = { ...draft, ...patch };
        setDraft(next);
        legalSave.change(next);
    };
    const field = (name) => ({ value: draft[name] ?? '', onChange: (event) => change({ [name]: event.target.value }), onBlur: legalSave.flush, maxLength: settings.limits[name] });
    const emailWrong = !isEmail(draft.email);

    return (
        <Panel header={t('Privacy and imprint')} icons={<SaveStatus {...legalSave} className="me-2" />}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7 text-measure">
                    {t('Who runs this installation: shown on the privacy page and in the imprint, linked in the footer of the public pages and on About.')}{' '}{t('Saved as you go.')}{' '}<Link to="/privacy">{t('Open the privacy page')}</Link>
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
                    <InputText id="legal-email" type="email" {...field('email')} invalid={emailWrong} />
                    {emailWrong && <span className="text-danger fs-8">{t('A valid email address is required.')}</span>}
                </label>
                <div className="d-flex flex-column gap-1">
                    <label className="fs-7 text-default fw-semibold" htmlFor="legal-notes">{t('More for the privacy page')}</label>
                    <SelectButton
                        value={language}
                        options={LANGUAGES.map(entry => ({ ...entry, label: draft.notes[entry.code] ? `${entry.label} ✓` : entry.label }))}
                        optionLabel="label"
                        optionValue="code"
                        onChange={(event) => event.value && setLanguage(event.value)}
                        className="p-selectbutton-pills pills-inline flex-wrap"
                        aria-label={t('Language of the text')}
                    />
                    <InputTextarea
                        id="legal-notes"
                        value={draft.notes[language] ?? ''}
                        onChange={(event) => change({ notes: { ...draft.notes, [language]: event.target.value } })}
                        onBlur={legalSave.flush}
                        maxLength={settings.limits.notes}
                        rows={3}
                        autoResize
                        placeholder={language !== 'en' && draft.notes.en ? draft.notes.en : t('E.g. where the installation is hosted, or that its traffic goes through Cloudflare')}
                    />
                    <span className="text-faint fs-8">{t('Write it in each language. Where a language is left empty, the privacy page shows the English text.')}</span>
                </div>
            </div>
        </Panel>
    );
};

export default LegalSettings;
