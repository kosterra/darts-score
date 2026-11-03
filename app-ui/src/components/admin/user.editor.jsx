import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import UserService from '../../services/user.service';
import SaveStatus from '../elements/save.status';
import useAutoSave from '../../utils/use.auto.save';
import { t } from '../../utils/i18n';
import RowEditor from './row.editor';

const MIN_PASSWORD_LENGTH = 8;

// as the API wants them: a name of 2 to 25 letters, an email address that looks like one
const isName = (value) => /^[\p{L}\s'-]+$/u.test(value.trim()) && value.trim().length >= 2 && value.trim().length <= 25;
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 254;

// a password that is easy to read out and type: no 0/O or 1/l/I
const generatePassword = () => {
    const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const values = crypto.getRandomValues(new Uint32Array(12));
    return [...values].map(value => letters[value % letters.length]).join('');
};

// a link without an address (APP_URL not set) is made whole with this page's address
const absolute = (link) => link.startsWith('/') ? `${window.location.origin}${link}` : link;

/**
 * For global admins: correct a user's name and email address (saved as you
 * go), set a new password, or create a "choose your password" link to pass
 * on to them, e.g. when their email address does not work.
 */
const UserEditor = ({ user, onHide, onSaved, onChanged, onError }) => {
    const [account, setAccount] = useState({ firstname: '', lastname: '', email: '' });
    const [password, setPassword] = useState('');
    const [link, setLink] = useState(null);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(null);
    // the email address goes along only once the field is left: each new one tells the old address
    const sentEmail = useRef('');
    const accountSave = useAutoSave(async (values) => {
        await UserService.updateUser(user.id, { firstname: values.firstname.trim(), lastname: values.lastname.trim(), email: values.email.trim() });
        await onChanged?.();
    }, { valid: (values) => isName(values.firstname) && isName(values.lastname) && isEmail(values.email) });

    // the fields start from the user, not again when the list is loaded after a save
    useEffect(() => {
        if (!user) return;
        setAccount({ firstname: user.firstname, lastname: user.lastname, email: user.email });
        sentEmail.current = user.email;
        setPassword('');
        setLink(null);
        setCopied(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    if (!user) return null;

    const run = async (summary, action, detail) => {
        setBusy(true);
        try {
            await action();
            onSaved(summary, detail);
        } catch (error) {
            onError(summary, error);
        } finally {
            setBusy(false);
        }
    };

    const copy = async (what, text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(what);
        } catch {
            setCopied(null);
        }
    };

    // a name saved a moment after typing, with the email address as last saved
    const onChange = (field) => (event) => {
        const next = { ...account, [field]: event.target.value };
        setAccount(next);
        if (field !== 'email') accountSave.change({ ...next, email: sentEmail.current });
    };
    // the email address when the field is left (or Enter), if it is a new one that looks right
    const saveEmail = () => {
        const email = account.email.trim();
        if (email === sentEmail.current.trim() || !isEmail(email)) {
            accountSave.flush();
            return;
        }
        sentEmail.current = email;
        accountSave.change({ ...account, email }, { now: true });
    };
    const hint = (wrong, text) => wrong && <span className="text-danger fs-8 d-block mt-1">{text}</span>;

    return (
        <RowEditor title={t('Edit {{firstname}} {{lastname}}', { firstname: user.firstname, lastname: user.lastname })} onClose={onHide}>
            <div className="d-flex flex-column gap-4">
                <section className="d-flex flex-column gap-3">
                    <span className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <span className="text-subtle fs-7 fw-semibold">{t('Account')}</span>
                        <SaveStatus {...accountSave} />
                    </span>
                    <span className="text-faint fs-8">{t('Saved as you go; the email address once you leave the field, and its old address is told.')}</span>
                    <div className="row g-4 pt-3">
                        <div className="col-12 col-sm-6">
                            <span className="p-float-label">
                                <InputText id="edit-firstname" value={account.firstname} onChange={onChange('firstname')} onBlur={accountSave.flush} invalid={!isName(account.firstname)} className="w-100" />
                                <label htmlFor="edit-firstname">{t('First name')}</label>
                            </span>
                            {hint(!isName(account.firstname), t('2 to 25 letters.'))}
                        </div>
                        <div className="col-12 col-sm-6">
                            <span className="p-float-label">
                                <InputText id="edit-lastname" value={account.lastname} onChange={onChange('lastname')} onBlur={accountSave.flush} invalid={!isName(account.lastname)} className="w-100" />
                                <label htmlFor="edit-lastname">{t('Last name')}</label>
                            </span>
                            {hint(!isName(account.lastname), t('2 to 25 letters.'))}
                        </div>
                        <div className="col-12">
                            <span className="p-float-label">
                                <InputText id="edit-email" type="email" value={account.email} onChange={onChange('email')} onBlur={saveEmail} onKeyDown={(event) => event.key === 'Enter' && saveEmail()} invalid={!isEmail(account.email)} className="w-100" />
                                <label htmlFor="edit-email">{t('Email')}</label>
                            </span>
                            {hint(!isEmail(account.email), t('A valid email address is required.'))}
                        </div>
                    </div>
                </section>

                <section className="d-flex flex-column gap-2">
                    <span className="text-subtle fs-7 fw-semibold">{t('New password')}</span>
                    <span className="text-faint fs-8">
                        {t('Set a password and tell it to')}{' '}{user.firstname}{' '}{t('in person or by message. All their sessions are logged out; they can change it in their profile afterwards.')}
                    </span>
                    <div className="d-flex flex-wrap gap-2">
                        <InputText
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setCopied(null); }}
                            placeholder={t('At least {{MIN_PASSWORD_LENGTH}} characters', { MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH })}
                            aria-label={t('New password')}
                            className="flex-grow-1"
                            autoComplete="new-password"
                        />
                        <Button icon="pi pi-refresh" label={t('Generate')} size="small" severity="secondary" onClick={() => { setPassword(generatePassword()); setCopied(null); }} />
                        <Button icon={copied === 'password' ? 'pi pi-check' : 'pi pi-copy'} size="small" severity="secondary" aria-label={t('Copy password')} disabled={!password} onClick={() => copy('password', password)} />
                    </div>
                    <div className="d-flex justify-content-end">
                        <Button
                            label={t('Set password')}
                            icon="pi pi-key"
                            size="small"
                            disabled={password.length < MIN_PASSWORD_LENGTH || busy}
                            onClick={() => run(t('Password set'), () => UserService.setPassword(user.id, password), t('{{email}} can log in with the new password', { email: user.email }))}
                        />
                    </div>
                </section>

                {user.mfaEnabled &&
                    <section className="d-flex flex-column gap-2">
                        <span className="text-subtle fs-7 fw-semibold">{t('Two-step login')}</span>
                        <span className="text-faint fs-8">
                            {t('For a lost phone without recovery codes: turns off two-step login and logs out all sessions of {{name}}. Do it only when they asked for it in person; they get a mail, and an alert notes it.', { name: user.firstname })}
                        </span>
                        <div className="d-flex justify-content-end">
                            <Button
                                label={t('Reset two-step login')}
                                icon="pi pi-unlock"
                                size="small"
                                severity="danger"
                                outlined
                                disabled={busy}
                                onClick={() => run(t('Two-step login reset'), () => UserService.resetMfa(user.id), t('{{email}} sets it up again at the next login, if it is required', { email: user.email }))}
                            />
                        </div>
                    </section>}

                <section className="d-flex flex-column gap-2">
                    <span className="text-subtle fs-7 fw-semibold">{t('Or a link to choose a password')}</span>
                    <span className="text-faint fs-8">
                        {t('Safer: you never know their password. Send the link to')}{' '}{user.firstname}{' '}{t('yourself, e.g. by message. It works once and for 24 hours.')}
                    </span>
                    {link
                        ? (
                            <div className="d-flex gap-2">
                                <InputText value={link} readOnly className="flex-grow-1 fs-8" aria-label={t('Password link')} onFocus={(e) => e.target.select()} />
                                <Button icon={copied === 'link' ? 'pi pi-check' : 'pi pi-copy'} label={copied === 'link' ? t('Copied') : t('Copy')} size="small" onClick={() => copy('link', link)} />
                            </div>
                        )
                        : (
                            <div className="d-flex justify-content-end">
                                <Button
                                    label={t('Create link')}
                                    icon="pi pi-link"
                                    size="small"
                                    outlined
                                    disabled={busy}
                                    onClick={async () => {
                                        setBusy(true);
                                        try {
                                            setLink(absolute((await UserService.createPasswordLink(user.id)).link));
                                        } catch (error) {
                                            onError(t('Password link'), error);
                                        } finally {
                                            setBusy(false);
                                        }
                                    }}
                                />
                            </div>
                        )
                    }
                    {link && <Message severity="info" text={t('A newer link replaces this one; the old one stops working.')} className="justify-content-start" />}
                </section>
            </div>
        </RowEditor>
    );
};

export default UserEditor;
