import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';

import AdminService from '../../services/admin.service';
import { LANGUAGES, currentLanguage, t } from '../../utils/i18n';

const same = (a, b) => a && b && a.subject === b.subject && a.body === b.body && a.button === b.button;

/**
 * The mails of the app, for the global admins: pick one, change its subject,
 * text and button, see it as it arrives (with sample values), send it to
 * yourself, save it or go back to the default.
 */
const MailTemplates = ({ onSaved }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [selectedId, setSelectedId] = useState('passwordReset');
    // every user gets the mails in their language: the texts of one language at a time
    const [language, setLanguage] = useState(currentLanguage());
    const [draft, setDraft] = useState(null);
    const [preview, setPreview] = useState(null);
    const [previewError, setPreviewError] = useState('');
    const [busy, setBusy] = useState('');
    // where a placeholder goes when one is clicked: the field used last, at its cursor
    const lastField = useRef({ name: 'body', start: null, end: null });

    useEffect(() => {
        AdminService.loadMailTemplates(language).then(setData).catch(err => setError(err.message));
    }, [language]);

    const template = data?.templates.find(entry => entry.id === selectedId);
    useEffect(() => {
        if (template) setDraft({ ...template.current });
        // only when another mail or language is picked, not after each save
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, data?.language]);

    // the preview follows the draft, once the typing pauses
    useEffect(() => {
        // the draft of the language shown, not the one before
        if (!draft || data?.language !== language) return undefined;
        const timer = setTimeout(() => {
            AdminService.previewMailTemplate(selectedId, draft, language)
                .then(result => { setPreview(result); setPreviewError(''); })
                .catch(err => setPreviewError(err.message));
        }, 350);
        return () => clearTimeout(timer);
    }, [draft, selectedId, language, data?.language]);

    if (!data) return error ? <Message severity="error" text={error} /> : null;

    const update = (name) => (event) => {
        lastField.current = { name, start: event.target.selectionStart, end: event.target.selectionEnd };
        setDraft(current => ({ ...current, [name]: event.target.value }));
    };
    const remember = (name) => (event) => { lastField.current = { name, start: event.target.selectionStart, end: event.target.selectionEnd }; };
    const insert = (key) => {
        const { name, start, end } = lastField.current;
        setDraft(current => {
            const value = current[name];
            const from = start ?? value.length;
            const to = end ?? from;
            return { ...current, [name]: `${value.slice(0, from)}{{${key}}}${value.slice(to)}` };
        });
        lastField.current = { name, start: null, end: null };
    };

    const replaceTemplate = (changes) => setData(current => ({
        ...current,
        templates: current.templates.map(entry => entry.id === selectedId ? { ...entry, ...changes } : entry),
    }));

    const run = async (kind, action) => {
        setBusy(kind);
        setError('');
        try {
            await action();
        } catch (err) {
            setError(err.data?.detail ? `${err.message} (${err.data.detail})` : err.message);
        } finally {
            setBusy('');
        }
    };
    const save = () => run('save', async () => {
        const saved = await AdminService.saveMailTemplate(selectedId, draft, language);
        replaceTemplate(saved);
        onSaved?.(t('"{{title}}" is saved.', { title: template.title }));
    });
    const reset = () => run('reset', async () => {
        const saved = await AdminService.resetMailTemplate(selectedId, language);
        replaceTemplate(saved);
        setDraft({ ...saved.current });
        onSaved?.(t('"{{title}}" is back to the default text.', { title: template.title }));
    });
    const test = () => run('test', async () => {
        const { sentTo } = await AdminService.testMailTemplate(selectedId, draft, language);
        onSaved?.(t('A test of "{{title}}" is on its way to {{sentTo}}.', { title: template.title, sentTo: sentTo }));
    });

    const options = data.templates.map(entry => ({ label: entry.title, value: entry.id, customized: entry.customized }));
    const unchanged = same(draft, template?.current);

    return (
        <Panel header={t('Mail templates')}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('The mails the app sends. Change the subject, the text and the button; placeholders like')}{' '}{t('{{firstname}}')}{' '}{t('are filled in for each mail. Paragraphs are separated by an empty line. The layout with the name of the app, the button and the footer is the same for every mail.')}
                </span>
                <div className="d-flex flex-column gap-1">
                    <span className="text-subtle fs-8">{t('Language')}</span>
                    <SelectButton
                        value={language}
                        options={LANGUAGES}
                        optionLabel="label"
                        optionValue="code"
                        onChange={(event) => event.value && setLanguage(event.value)}
                        className="p-selectbutton-pills flex-wrap"
                        aria-label={t('Language of the mails')}
                    />
                    <span className="text-faint fs-8">{t('Everyone gets the mails in the language of their account; a new account in the language of the admin who invited them.')}</span>
                </div>
                {!data.mailEnabled &&
                    <Message severity="info" className="w-100 justify-content-start" text={t('Mail is not set up on this installation: no mails are sent. You can still prepare the texts.')} />}

                <Dropdown
                    value={selectedId}
                    options={options}
                    onChange={(event) => setSelectedId(event.value)}
                    itemTemplate={(option) => (
                        <span className="d-flex align-items-center justify-content-between gap-3 w-100">
                            {option.label}
                            {option.customized && <Tag value={t('Changed')} severity="info" />}
                        </span>
                    )}
                    aria-label={t('Mail')}
                    className="mail-template-select"
                />

                {template && draft &&
                    <div className="row g-4">
                        <div className="col-12 col-xl-6 d-flex flex-column gap-3">
                            <span className="text-faint fs-8">{template.description}{template.customized ? t(' Changed from the default.') : ''}</span>
                            <label className="d-flex flex-column gap-1">
                                <span className="text-subtle fs-8">{t('Subject')}</span>
                                <InputText value={draft.subject} onChange={update('subject')} onSelect={remember('subject')} onFocus={remember('subject')} maxLength={data.limits.subject} />
                            </label>
                            <label className="d-flex flex-column gap-1">
                                <span className="text-subtle fs-8">{t('Text')}</span>
                                <InputTextarea value={draft.body} onChange={update('body')} onSelect={remember('body')} onFocus={remember('body')} rows={11} autoResize maxLength={data.limits.body} />
                            </label>
                            <label className="d-flex flex-column gap-1">
                                <span className="text-subtle fs-8">{t('Button')}</span>
                                <InputText value={draft.button} onChange={update('button')} onSelect={remember('button')} onFocus={remember('button')} maxLength={data.limits.button} />
                            </label>
                            <div className="d-flex flex-column gap-2">
                                <span className="text-subtle fs-8">{t('Placeholders: a click puts one where the cursor was')}</span>
                                <div className="d-flex flex-wrap gap-2">
                                    {template.placeholders.map(placeholder => (
                                        <button key={placeholder.key} type="button" className="mail-placeholder" title={t('{{description}}, e.g. {{sample}}', { description: placeholder.description, sample: placeholder.sample })} onClick={() => insert(placeholder.key)}>
                                            {`{{${placeholder.key}}}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                            <div className="d-flex flex-wrap justify-content-end gap-2">
                                {template.customized && <Button type="button" label={t('Back to the default')} icon="pi pi-replay" size="small" severity="secondary" text onClick={reset} loading={busy === 'reset'} />}
                                <Button type="button" label={t('Send me a test')} icon="pi pi-send" size="small" severity="secondary" onClick={test} loading={busy === 'test'} disabled={!data.mailEnabled || Boolean(previewError)} title={data.mailEnabled ? t('To your own address, with sample values') : t('Mail is not set up')} />
                                <Button type="button" label={t('Save')} icon="pi pi-save" size="small" onClick={save} loading={busy === 'save'} disabled={unchanged || Boolean(previewError)} />
                            </div>
                        </div>
                        <div className="col-12 col-xl-6 d-flex flex-column gap-2">
                            <span className="text-subtle fs-8">{t('Preview, with sample values')}</span>
                            {previewError
                                ? <Message severity="warn" text={previewError} className="w-100 justify-content-start" />
                                : preview && <>
                                    <div className="mail-preview-subject"><span className="text-faint">{t('Subject:')}</span> {preview.subject}</div>
                                    {/* the mail on its own page: nothing of it can reach the app */}
                                    <iframe title={t('Preview of the mail')} className="mail-preview" sandbox="" srcDoc={preview.html} />
                                </>
                            }
                        </div>
                    </div>
                }
            </div>
        </Panel>
    );
};

export default MailTemplates;
