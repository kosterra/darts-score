import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';

import AuthLayout from './auth.layout';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import MfaLoginStep from '../mfa/mfa.login.step';
import { cancelPasskey, isCancelled, loginWithPasskey, passkeyAutofillSupported, passkeysSupported } from '../../utils/passkeys';

const LoginPage = () => {
    const { login, completeLogin, mailEnabled, sessionEnded } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // the second step of two-step login: 'code' or 'enroll' (also after registering or a new password)
    const { state } = useLocation();
    const [mfaStep, setMfaStep] = useState(state?.mfaStep ?? null);
    const [passkeyBusy, setPasskeyBusy] = useState(false);
    const [passkeyHint, setPasskeyHint] = useState('');
    const withPasskeys = passkeysSupported();

    // with a passkey: the button opens the device's dialog; the email field offers the passkeys
    // of this website as saved passwords are offered, where the browser can
    const passkeyLogin = async (autofill = false) => {
        if (!autofill) { setError(''); setPasskeyHint(''); setPasskeyBusy(true); }
        try {
            await completeLogin(await loginWithPasskey({ autofill }));
        } catch (err) {
            // the offer in the email field fails quietly: nobody asked for it yet
            if (autofill) return;
            // closed, or no passkey for this website on the device: the browser does not tell them apart
            if (isCancelled(err)) setPasskeyHint(t('No passkey was used. Log in with your password; you can add a passkey under Profile → Account.'));
            else setError(err.message);
        }
        if (!autofill) setPasskeyBusy(false);
    };
    useEffect(() => {
        if (mfaStep || !withPasskeys) return undefined;
        passkeyAutofillSupported().then(can => { if (can) passkeyLogin(true); });
        return () => cancelPasskey();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mfaStep]);

    const onSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const next = await login(email, password);
            if (next?.mfaRequired) {
                setMfaStep(next.step);
                setSubmitting(false);
            }
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    if (mfaStep) {
        return (
            <AuthLayout hide="login" title={mfaStep === 'enroll' ? t('Set up two-step login') : t('Two-step login')}>
                <MfaLoginStep step={mfaStep} onRestart={(message) => { setMfaStep(null); setPassword(''); setError(message ?? ''); }} />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout hide="login" title={t('Log in')} heading={t('Welcome back')} intro={t('Your club, your games and your statistics are waiting.')}>
            <form onSubmit={onSubmit} className="d-flex flex-column gap-4 pt-3">
                {sessionEnded && <Message severity="info" text={t('Your session has ended. Log in again to go on where you were.')} className="w-100 justify-content-start mb-2" />}
                <span className="p-float-label w-100">
                    <InputText
                        id="login-email"
                        type="email"
                        autoComplete="username webauthn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-100"
                        required
                    />
                    <label htmlFor="login-email">{t('Email')}</label>
                </span>
                <span className="p-float-label w-100">
                    <Password
                        inputId="login-password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        feedback={false}
                        className="w-100"
                        inputClassName="w-100"
                        required
                    />
                    <label htmlFor="login-password">{t('Password')}</label>
                </span>
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                {passkeyHint && !error && <Message severity="info" text={passkeyHint} className="w-100 justify-content-start" />}
                <Button type="submit" label={t('Log in')} icon="pi pi-sign-in" loading={submitting} />
                {withPasskeys &&
                    <Button type="button" label={t('Log in with a passkey')} icon="pi pi-key" severity="secondary" outlined loading={passkeyBusy} onClick={() => passkeyLogin(false)} />}
                {mailEnabled &&
                    <span className="fs-7 text-subtle text-center">
                        <Link to="/forgot-password">{t('Forgot your password?')}</Link>
                    </span>
                }
                <span className="fs-7 text-subtle text-center">
                    {t('No account yet?')}{' '}<Link to="/register">{t('Register')}</Link>{' '}{t('to set up your own club.')}
                </span>
            </form>
        </AuthLayout>
    );
};

export default LoginPage;
