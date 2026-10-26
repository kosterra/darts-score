import { useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import AuthService from '../../services/auth.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import MfaSetup from './mfa.setup';

/**
 * The second step of logging in: the code of the authenticator app (or a
 * recovery code), or, when two-step login is required and not set up yet,
 * setting it up. onRestart: back to the password (the step took too long).
 */
const MfaLoginStep = ({ step, onRestart }) => {
    const { completeLogin } = useAuth();
    const [code, setCode] = useState('');
    const [recovery, setRecovery] = useState(false);
    const [trust, setTrust] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    // a recovery code got in, but the app no longer matches (the key of the installation changed): set it up again
    const [reset, setReset] = useState(false);

    if (step === 'enroll' || reset) {
        return (
            <div className="d-flex flex-column gap-3 pt-2">
                <Message
                    severity="info"
                    text={reset
                        ? t('Your authenticator app no longer matches this installation (its key changed). Set up two-step login again now: a new QR code, and new recovery codes.')
                        : t('This installation requires two-step login: after the password, a code of an app on your phone. Set it up now to go on.')}
                    className="w-100 justify-content-start"
                />
                <MfaSetup login onDone={(answer) => completeLogin(answer)} />
                <Button type="button" label={t('Log in with another account')} size="small" severity="secondary" text onClick={() => onRestart?.()} />
            </div>
        );
    }

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const answer = await AuthService.loginMfa(recovery ? { recoveryCode: code, trust } : { code, trust });
            // set up again first (required on this installation), else logged in
            if (answer?.mfaRequired) {
                setReset(true);
                setBusy(false);
            } else {
                await completeLogin(answer);
            }
        } catch (err) {
            setError(err.message);
            setBusy(false);
            // the app cannot be checked any more: only a recovery code helps
            if (err.data?.unreadable) { setRecovery(true); setCode(''); }
            // the waiting login is gone: back to the password
            if (err.data?.expired) onRestart?.(err.message);
        }
    };

    return (
        <form onSubmit={submit} className="d-flex flex-column gap-3 pt-2">
            <span className="fs-7 text-subtle">
                {recovery ? t('Enter one of your recovery codes. Each one works once.') : t('Enter the code your authenticator app shows for Legmate.')}
            </span>
            <InputText
                id="mfa-login-code"
                value={code}
                onChange={(e) => setCode(recovery ? e.target.value : e.target.value.replace(/[^\d ]/g, ''))}
                inputMode={recovery ? 'text' : 'numeric'}
                autoComplete="one-time-code"
                maxLength={recovery ? 12 : 7}
                className={recovery ? '' : 'mfa-code'}
                placeholder={recovery ? 'xxxx-xxxx' : '123 456'}
                aria-label={recovery ? t('Recovery code') : t('Code')}
                autoFocus
                required
            />
            <label htmlFor="mfa-login-trust" className="d-flex align-items-center gap-2">
                <Checkbox inputId="mfa-login-trust" checked={trust} onChange={(e) => setTrust(Boolean(e.checked))} />
                <span className="fs-7">{t('Do not ask for the code on this device for 30 days (not on a device others use, e.g. the club\'s tablet)')}</span>
            </label>
            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
            <Button type="submit" label={t('Log in')} icon="pi pi-sign-in" loading={busy} />
            <div className="d-flex justify-content-between flex-wrap gap-2">
                <Button type="button" label={recovery ? t('Use a code of the app') : t('Use a recovery code')} size="small" severity="secondary" text onClick={() => { setRecovery(!recovery); setCode(''); setError(''); }} />
                <Button type="button" label={t('Back')} size="small" severity="secondary" text onClick={() => onRestart?.()} />
            </div>
            <span className="text-faint fs-8">{t('No phone and no recovery code? A global admin of this installation can reset your two-step login.')}</span>
        </form>
    );
};

export default MfaLoginStep;
