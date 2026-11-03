import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';

import AdminService from '../../services/admin.service';
import SaveStatus from '../elements/save.status';
import useAutoSave from '../../utils/use.auto.save';
import { LANGUAGES, currentLanguage, t } from '../../utils/i18n';

// the list of mails with one of them as just saved
const replaced = (data, id, changes) => ({
    ...data,
    templates: data.templates.map(entry => (entry.id === id ? { ...entry, ...changes } : entry)),
});

/**
 * The mails of the app, for the global admins: pick one, change its subject,
 * text and button (saved a moment after typing), see it as it arrives (with
 * sample values), send it to yourself or go back to the default.
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
    // the save on its way, so going back to the default comes after it
    const saving = useRef(null);
    // the mail and language go along with the texts: another mail may be picked before it is saved
    const templateSave = useAutoSave(async ({ id, language: of, draft: texts }) => {
        saving.current = AdminService.saveMailTemplate(id, texts, of);
        const saved = await saving.current;
        setData(current => (current?.language === of ? replaced(current, id, saved) : current));
    });

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

    // shown at once, saved a moment after typing
    const change = (next) => {
        setDraft(next);
        templateSave.change({ id: selectedId, language, draft: next });
    };
    const update = (name) => (event) => {
        lastField.current = { name, start: event.target.selectionStart, end: event.target.selectionEnd };
        change({ ...draft, [name]: event.target.value });
    };
    const remember = (name) => (event) => { lastField.current = { name, start: event.target.selectionStart, end: event.target.selectionEnd }; };
    const insert = (key) => {
        const { name, start, end } = lastField.current;
        const value = draft[name];
        const from = start ?? value.length;
        const to = end ?? from;
        change({ ...draft, [name]: `${value.slice(0, from)}{{${key}}}${value.slice(to)}` });
        lastField.current = { name, start: null, end: null };
    };
    // another mail or language: what was typed is saved first
    const pick = (setter) => (event) => {
        if (!event.value) return;
        templateSave.flush();
        setter(event.value);
    };

    const replaceTemplate = (changes) => setData(current => replaced(current, selectedId, changes));

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
    // it overwrites the texts: asked first, and after what was typed is saved
    const reset = () => {
        templateSave.flush();
        confirmDialog({
            group: 'mail-template-reset',
            header: t('Back to the default'),
            message: t('Replace the texts of "{{title}}" with the default text?', { title: template.title }),
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-sm',
            rejectClassName: 'p-button-secondary p-button-sm',
            acceptLabel: t('Back to the default'),
            rejectLabel: t('Cancel'),
            accept: () => run('reset', async () => {
                await saving.current?.catch(() => {});
                const saved = await AdminService.resetMailTemplate(selectedId, language);
                replaceTemplate(saved);
                setDraft({ ...saved.current });
                onSaved?.(t('"{{title}}" is back to the default text.', { title: template.title }));
            }),
        });
    };
    const test = () => run('test', async () => {
        const { sentTo } = await AdminService.testMailTemplate(selectedId, draft, language);
        onSaved?.(t('A test of "{{title}}" is on its way to {{sentTo}}.', { title: template.title, sentTo: sentTo }));
    });

    const options = data.templates.map(entry => ({ label: entry.title, value: entry.id, customized: entry.customized }));

    return (
        <Panel header={t('Mail templates')} icons={<SaveStatus {...templateSave} className="me-2" />}>
            <ConfirmDialog group="mail-template-reset" />
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7 text-measure">
                    {t('The mails the app sends. Change the subject, the text and the button; placeholders like')}{' '}{t('{{firstname}}')}{' '}{t('are filled in for each mail. Paragraphs are separated by an empty line. The layout with the name of the app, the button and the footer is the same for every mail.')}{' '}{t('Saved as you go.')}
                </span>
                <div className="d-flex flex-column gap-1">
                    <span className="text-subtle fs-8">{t('Language')}</span>
                    <SelectButton
                        value={language}
                        options={LANGUAGES}
                        optionLabel="label"
                        optionValue="code"
                        onChange={pick(setLanguage)}
                        className="p-selectbutton-pills pills-inline flex-wrap"
                        aria-label={t('Language of the mails')}
                    />
                    <span className="text-faint fs-8">{t('Everyone gets the mails in the language of their account; a new account in the language of the admin who invited them.')}</span>
                </div>
                {!data.mailEnabled &&
                    <Message severity="info" className="w-100 justify-content-start" text={t('Mail is not set up on this installation: no mails are sent. You can still prepare the texts.')} />}

                {/* which mail is edited, named like the fields under it */}
                <div className="d-flex flex-column gap-1">
                    <label htmlFor="mail-template" className="text-subtle fs-8">{t('Mail')}</label>
                    <Dropdown
                        inputId="mail-template"
                        value={selectedId}
                        options={options}
                        onChange={pick(setSelectedId)}
                        itemTemplate={(option) => (
                            <span className="d-flex align-items-center justify-content-between gap-3 w-100">
                                {option.label}
                                {option.customized && <Tag value={t('Changed')} severity="info" />}
                            </span>
                        )}
                        aria-label={t('Mail')}
                        className="mail-template-select"
                    />
                </div>

                {template && draft &&
                    <div className="row g-4">
                        <div className="col-12 d-flex flex-column gap-3">
                            <span className="text-faint fs-8">{template.description}{template.customized ? t(' Changed from the default.') : ''}</span>
                            <label className="d-flex flex-column gap-1">
                                <span className="text-subtle fs-8">{t('Subject')}</span>
                                <InputText value={draft.subject} onChange={update('subject')} onBlur={templateSave.flush} onSelect={remember('subject')} onFocus={remember('subject')} maxLength={data.limits.subject} />
                            </label>
                            <label className="d-flex flex-column gap-1">
                                <span className="text-subtle fs-8">{t('Text')}</span>
                                <InputTextarea value={draft.body} onChange={update('body')} onBlur={templateSave.flush} onSelect={remember('body')} onFocus={remember('body')} rows={11} autoResize maxLength={data.limits.body} />
                            </label>
                            <label className="d-flex flex-column gap-1">
                                <span className="text-subtle fs-8">{t('Button')}</span>
                                <InputText value={draft.button} onChange={update('button')} onBlur={templateSave.flush} onSelect={remember('button')} onFocus={remember('button')} maxLength={data.limits.button} />
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
                            </div>
                        </div>
                        <div className="col-12 d-flex flex-column gap-2">
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
