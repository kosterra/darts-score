import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Password } from 'primereact/password';

import AuthService from '../../services/auth.service';
import { useAuth } from '../../utils/auth.context';
import { addPasskey, isCancelled, passkeysSupported } from '../../utils/passkeys';
import { formatDate } from '../../utils/dates';
import { t } from '../../utils/i18n';

/**
 * The passkeys of the account, on the profile below two-step login: log in
 * with the fingerprint, the face or the PIN of a device instead of the
 * password, in the browser and in the installed app. Adding one asks for the
 * password, and a code when two-step login is on (a device left logged in
 * cannot add a way in, a stolen password alone cannot get round the code);
 * each one shows where it was made and when it was used last, and can be
 * removed with the password.
 */
const PasskeysSetting = ({ onSaved }) => {
    const { user } = useAuth();
    const [passkeys, setPasskeys] = useState(null);
    const [adding, setAdding] = useState(false);
    // the passkey about to be removed (its id), asking for the password
    const [removing, setRemoving] = useState(null);
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const supported = passkeysSupported();

    useEffect(() => {
        AuthService.listPasskeys().then(answer => setPasskeys(answer.passkeys)).catch(() => setPasskeys([]));
    }, []);

    const close = () => { setAdding(false); setRemoving(null); setPassword(''); setCode(''); setError(''); };

    const add = async (event) => {
        event.preventDefault();
        setBusy('add');
        setError('');
        try {
            const answer = await addPasskey(password, user.mfaEnabled ? code : undefined);
            setPasskeys(answer.passkeys);
            close();
            onSaved?.(t('The passkey is added: log in with it next time.'));
        } catch (err) {
            if (!isCancelled(err)) setError(err.message);
        }
        setBusy('');
    };

    const remove = async (event) => {
        event.preventDefault();
        setBusy(removing);
        setError('');
        try {
            setPasskeys((await AuthService.removePasskey(removing, password)).passkeys);
            close();
            onSaved?.(t('The passkey is removed.'));
        } catch (err) {
            setError(err.message);
        }
        setBusy('');
    };

    const passwordInput = (id) => (
        <Password inputId={id} value={password} onChange={(e) => setPassword(e.target.value)} feedback={false} placeholder={t('Current password')} aria-label={t('Current password')} autoComplete="current-password" className="w-100" inputClassName="w-100" required />
    );

    return (
        <>
            <p className="setting-title" id="passkeys">{t('Passkeys')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-3 pt-1">
                    <span className="fs-7 text-subtle">{t('Log in with the fingerprint, the face or the PIN of your phone or computer instead of the password: also in Legmate added to the home screen. No code of two-step login is asked then. Your password stays for the other devices.')}</span>
                    {!supported && <Message severity="info" text={t('This browser cannot use passkeys. Open Legmate in a current browser to add one.')} className="w-100 justify-content-start" />}

                    {passkeys?.length > 0 &&
                        <ul className="passkey-list list-unstyled m-0">
                            {passkeys.map(passkey => (
                                <li key={passkey.id} className="passkey-row">
                                    <i className={`pi ${/iPhone|iPad|Android/.test(passkey.name) ? 'pi-mobile' : 'pi-desktop'}`} aria-hidden="true" />
                                    <span className="d-flex flex-column min-w-0 flex-grow-1">
                                        <span className="text-default fw-semibold text-truncate">{passkey.name}</span>
                                        <span className="text-faint fs-8">
                                            {t('Added {{date}}', { date: formatDate(passkey.createdAt) })}
                                            {' · '}
                                            {passkey.lastUsedAt ? t('used {{date}}', { date: formatDate(passkey.lastUsedAt) }) : t('not used yet')}
                                            {passkey.synced && <>{' · '}{t('on all your devices of the same account')}</>}
                                        </span>
                                    </span>
                                    <Button type="button" icon="pi pi-trash" size="small" severity="danger" text aria-label={t('Remove {{name}}', { name: passkey.name })} title={t('Remove')} disabled={removing === passkey.id} onClick={() => { close(); setRemoving(passkey.id); }} />
                                </li>
                            ))}
                        </ul>}

                    {removing &&
                        <form onSubmit={remove} className="d-flex flex-column gap-2">
                            <span className="fs-7 text-subtle">{t('Enter your password to remove {{name}}.', { name: passkeys?.find(passkey => passkey.id === removing)?.name ?? '' })}</span>
                            {passwordInput('passkey-remove-password')}
                            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                            <div className="d-flex justify-content-end gap-2">
                                <Button type="button" label={t('Cancel')} size="small" severity="secondary" text onClick={close} />
                                <Button type="submit" label={t('Remove')} icon="pi pi-trash" size="small" severity="danger" loading={busy === removing} disabled={!password} />
                            </div>
                        </form>}

                    {adding &&
                        <form onSubmit={add} className="d-flex flex-column gap-2">
                            <span className="fs-7 text-subtle">
                                {user.mfaEnabled
                                    ? t('Enter your password and a code of your app or a recovery code; then your device asks for your fingerprint, face or PIN.')
                                    : t('Enter your password; then your device asks for your fingerprint, face or PIN.')}
                            </span>
                            {passwordInput('passkey-password')}
                            {user.mfaEnabled &&
                                <InputText id="passkey-code" value={code} onChange={(e) => setCode(e.target.value.replace(/[^\da-zA-Z -]/g, ''))} autoComplete="one-time-code" maxLength={12} placeholder={t('Code of the app or a recovery code')} aria-label={t('Code of the app or a recovery code')} className="mfa-code-any" required />}
                            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                            <div className="d-flex justify-content-end gap-2">
                                <Button type="button" label={t('Cancel')} size="small" severity="secondary" text onClick={close} />
                                <Button type="submit" label={t('Add passkey')} icon="pi pi-key" size="small" loading={busy === 'add'} disabled={!password || (user.mfaEnabled && !code)} />
                            </div>
                        </form>}
                    {!adding && !removing &&
                        <>
                            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                            <div className="d-flex justify-content-end">
                                <Button type="button" label={passkeys?.length ? t('Add another passkey') : t('Add a passkey')} icon="pi pi-key" size="small" disabled={!supported} onClick={() => { close(); setAdding(true); }} />
                            </div>
                        </>}
                </div>
            </div>
        </>
    );
};

export default PasskeysSetting;
