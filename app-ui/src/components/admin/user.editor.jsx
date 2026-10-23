import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import UserService from '../../services/user.service';
import { t } from '../../utils/i18n';
import RowEditor from './row.editor';

const MIN_PASSWORD_LENGTH = 8;

// a password that is easy to read out and type: no 0/O or 1/l/I
const generatePassword = () => {
    const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const values = crypto.getRandomValues(new Uint32Array(12));
    return [...values].map(value => letters[value % letters.length]).join('');
};

// a link without an address (APP_URL not set) is made whole with this page's address
const absolute = (link) => link.startsWith('/') ? `${window.location.origin}${link}` : link;

/**
 * For global admins: correct a user's name and email address, set a new
 * password, or create a "choose your password" link to pass on to them,
 * e.g. when their email address does not work.
 */
const UserEditor = ({ user, onHide, onSaved, onError }) => {
    const [account, setAccount] = useState({ firstname: '', lastname: '', email: '' });
    const [password, setPassword] = useState('');
    const [link, setLink] = useState(null);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        if (!user) return;
        setAccount({ firstname: user.firstname, lastname: user.lastname, email: user.email });
        setPassword('');
        setLink(null);
        setCopied(null);
    }, [user]);

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

    const onChange = (field) => (event) => setAccount({ ...account, [field]: event.target.value });
    const changed = account.firstname !== user.firstname || account.lastname !== user.lastname || account.email !== user.email;

    return (
        <RowEditor title={t('Edit {{firstname}} {{lastname}}', { firstname: user.firstname, lastname: user.lastname })} onClose={onHide}>
            <div className="d-flex flex-column gap-4">
                <section className="d-flex flex-column gap-3">
                    <span className="text-subtle fs-7 fw-semibold">{t('Account')}</span>
                    <div className="row g-4 pt-3">
                        <div className="col-12 col-sm-6">
                            <span className="p-float-label">
                                <InputText id="edit-firstname" value={account.firstname} onChange={onChange('firstname')} className="w-100" />
                                <label htmlFor="edit-firstname">{t('Firstname')}</label>
                            </span>
                        </div>
                        <div className="col-12 col-sm-6">
                            <span className="p-float-label">
                                <InputText id="edit-lastname" value={account.lastname} onChange={onChange('lastname')} className="w-100" />
                                <label htmlFor="edit-lastname">{t('Lastname')}</label>
                            </span>
                        </div>
                        <div className="col-12">
                            <span className="p-float-label">
                                <InputText id="edit-email" type="email" value={account.email} onChange={onChange('email')} className="w-100" />
                                <label htmlFor="edit-email">{t('Email')}</label>
                            </span>
                        </div>
                    </div>
                    <div className="d-flex justify-content-end">
                        <Button
                            label={t('Save')}
                            icon="pi pi-save"
                            size="small"
                            disabled={!changed || busy}
                            onClick={() => run(t('Account saved'), () => UserService.updateUser(user.id, account), account.email)}
                        />
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
