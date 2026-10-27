import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Password } from 'primereact/password';

import AuthService from '../../services/auth.service';
import { addPasskey, isCancelled, passkeysSupported } from '../../utils/passkeys';
import { formatDate } from '../../utils/dates';
import { t } from '../../utils/i18n';

/**
 * The passkeys of the account, on the profile below two-step login: log in
 * with the fingerprint, the face or the PIN of a device instead of the
 * password, in the browser and in the installed app. Adding one asks for the
 * password (a device left logged in cannot add a way in); each one shows
 * where it was made and when it was used last, and can be removed.
 */
const PasskeysSetting = ({ onSaved }) => {
    const [passkeys, setPasskeys] = useState(null);
    const [adding, setAdding] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const supported = passkeysSupported();

    useEffect(() => {
        AuthService.listPasskeys().then(answer => setPasskeys(answer.passkeys)).catch(() => setPasskeys([]));
    }, []);

    const close = () => { setAdding(false); setPassword(''); setError(''); };

    const add = async (event) => {
        event.preventDefault();
        setBusy('add');
        setError('');
        try {
            const answer = await addPasskey(password);
            setPasskeys(answer.passkeys);
            close();
            onSaved?.(t('The passkey is added: log in with it next time.'));
        } catch (err) {
            if (!isCancelled(err)) setError(err.message);
        }
        setBusy('');
    };

    const remove = async (passkey) => {
        setBusy(passkey.id);
        try {
            setPasskeys((await AuthService.removePasskey(passkey.id)).passkeys);
            onSaved?.(t('The passkey is removed.'));
        } catch (err) {
            setError(err.message);
        }
        setBusy('');
    };

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
                                    <Button type="button" icon="pi pi-trash" size="small" severity="danger" text aria-label={t('Remove {{name}}', { name: passkey.name })} title={t('Remove')} loading={busy === passkey.id} onClick={() => remove(passkey)} />
                                </li>
                            ))}
                        </ul>}

                    {adding
                        ? <form onSubmit={add} className="d-flex flex-column gap-2">
                            <span className="fs-7 text-subtle">{t('Enter your password; then your device asks for your fingerprint, face or PIN.')}</span>
                            <Password inputId="passkey-password" value={password} onChange={(e) => setPassword(e.target.value)} feedback={false} placeholder={t('Current password')} aria-label={t('Current password')} autoComplete="current-password" className="w-100" inputClassName="w-100" required />
                            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                            <div className="d-flex justify-content-end gap-2">
                                <Button type="button" label={t('Cancel')} size="small" severity="secondary" text onClick={close} />
                                <Button type="submit" label={t('Add passkey')} icon="pi pi-key" size="small" loading={busy === 'add'} />
                            </div>
                        </form>
                        : <>
                            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                            <div className="d-flex justify-content-end">
                                <Button type="button" label={passkeys?.length ? t('Add another passkey') : t('Add a passkey')} icon="pi pi-key" size="small" disabled={!supported} onClick={() => { setError(''); setAdding(true); }} />
                            </div>
                        </>}
                </div>
            </div>
        </>
    );
};

export default PasskeysSetting;
