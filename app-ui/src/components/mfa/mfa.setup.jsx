import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import QRCode from 'qrcode';

import AuthService from '../../services/auth.service';
import { t } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';
import RecoveryCodes from './recovery.codes';

/**
 * Setting up two-step login: the QR code (and the key, to type in) for the
 * authenticator app, its first code, then the recovery codes. On the profile,
 * or as part of logging in when it is required (login: with the choice to
 * trust the device). onDone gets the answer of turning it on.
 */
const MfaSetup = ({ login = false, email, onDone, onCancel, onSaved }) => {
    const [setup, setSetup] = useState(null);
    const [qr, setQr] = useState('');
    const [code, setCode] = useState('');
    const [trust, setTrust] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null);

    useEffect(() => {
        AuthService.mfaSetup()
            .then(async (started) => {
                setSetup(started);
                setQr(await QRCode.toDataURL(started.uri, { margin: 1, width: 320 }));
            })
            .catch((err) => setError(err.message));
    }, []);

    const turnOn = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            setDone(await AuthService.mfaEnable(code, login && trust));
        } catch (err) {
            setError(err.message);
        }
        setBusy(false);
    };

    if (done) {
        return (
            <div className="d-flex flex-column gap-3">
                <Message severity="success" text={t('Two-step login is on.')} className="w-100 justify-content-start" />
                <RecoveryCodes codes={done.recoveryCodes} email={email} onSaved={onSaved} />
                <div className="d-flex justify-content-end">
                    <Button type="button" label={login ? t('I have kept them: go on') : t('I have kept them')} icon="pi pi-check" onClick={() => onDone?.(done)} />
                </div>
            </div>
        );
    }
    if (!setup) return error ? <Message severity="error" text={error} className="w-100 justify-content-start" /> : <Lines count={4} />;

    // the key in groups of four, easier to type
    const key = setup.secret.match(/.{1,4}/g).join(' ');
    return (
        <form onSubmit={turnOn} className="d-flex flex-column gap-3">
            <ol className="mfa-steps m-0">
                <li>{t('Install an authenticator app on your phone, e.g. Google Authenticator, Microsoft Authenticator or the one of your password manager.')}</li>
                <li>{t('Scan this QR code with it, type in the key, or on this phone add it with the link.')}</li>
            </ol>
            <div className="claim-link">
                {qr && <img src={qr} alt={t('QR code for the authenticator app')} className="claim-link-qr" />}
                <div className="claim-link-text">
                    <span className="text-faint fs-8">{t('Key')}</span>
                    <span className="mfa-key">{key}</span>
                    {/* on the phone itself the QR code cannot be scanned: the app opens from the link */}
                    <a href={setup.uri} className="fs-7">{t('Add to an app on this phone')}</a>
                </div>
            </div>
            <label htmlFor="mfa-setup-code" className="d-flex flex-column gap-1">
                <span>{t('3. Enter the code the app shows now')}</span>
                <InputText id="mfa-setup-code" value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="mfa-code" required />
            </label>
            {login &&
                <label htmlFor="mfa-setup-trust" className="d-flex align-items-center gap-2">
                    <Checkbox inputId="mfa-setup-trust" checked={trust} onChange={(e) => setTrust(Boolean(e.checked))} />
                    <span className="fs-7">{t('Do not ask for the code on this device for 30 days (not on a device others use, e.g. the club\'s tablet)')}</span>
                </label>}
            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
            <div className="d-flex justify-content-end gap-2">
                {onCancel && <Button type="button" label={t('Cancel')} size="small" severity="secondary" text onClick={onCancel} />}
                <Button type="submit" label={t('Turn on')} icon="pi pi-lock" size="small" loading={busy} disabled={code.replace(/\s/g, '').length !== 6} />
            </div>
        </form>
    );
};

export default MfaSetup;
