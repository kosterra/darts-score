import { useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Password } from 'primereact/password';

import AuthService from '../../services/auth.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';

/**
 * Deleting the own account, at the end of the profile's Account part: the
 * login, settings and notifications go; the players stay in their clubs
 * under an anonymous name, so the games of the others stay whole. With the
 * password (and a code when two-step login is on) and a confirmation.
 */
const DeleteAccount = () => {
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [understood, setUnderstood] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await AuthService.deleteAccount(password, user.mfaEnabled ? code : undefined);
            // the session is gone: back to the start page
            await logout();
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    };

    return (
        <>
            <p className="game-setup-section-title">{t('Delete account')}</p>
            <p className="setting-title" id="delete-account">{t('Delete your account')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-3 pt-1">
                    <span className="fs-7 text-subtle">
                        {t('Your login, your settings and your notifications are deleted. Your players stay in their clubs under an anonymous name (e.g. Anon 7F3A), without your name, picture and date of birth, so the games and statistics of the others stay whole. This cannot be undone.')}
                    </span>
                    {!open &&
                        <div className="d-flex justify-content-end">
                            <Button type="button" label={t('Delete account …')} icon="pi pi-trash" size="small" severity="danger" outlined onClick={() => setOpen(true)} />
                        </div>}
                    {open &&
                        <form onSubmit={submit} className="d-flex flex-column gap-3">
                            <Password inputId="delete-account-password" value={password} onChange={(e) => setPassword(e.target.value)} feedback={false} placeholder={t('Current password')} aria-label={t('Current password')} autoComplete="current-password" className="w-100" inputClassName="w-100" required />
                            {user.mfaEnabled &&
                                <InputText value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder={t('Code of the app')} aria-label={t('Code of the app')} className="mfa-code" required />}
                            <label htmlFor="delete-account-understood" className="d-flex align-items-start gap-2">
                                <Checkbox inputId="delete-account-understood" checked={understood} onChange={(e) => setUnderstood(Boolean(e.checked))} />
                                <span className="fs-7">{t('I understand that my account is deleted for good and my players stay only anonymously.')}</span>
                            </label>
                            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                            <div className="d-flex justify-content-end gap-2">
                                <Button type="button" label={t('Cancel')} size="small" severity="secondary" text onClick={() => { setOpen(false); setPassword(''); setCode(''); setUnderstood(false); setError(''); }} />
                                <Button type="submit" label={t('Delete my account')} icon="pi pi-trash" size="small" severity="danger" loading={busy} disabled={!understood || !password} />
                            </div>
                        </form>}
                </div>
            </div>
        </>
    );
};

export default DeleteAccount;
