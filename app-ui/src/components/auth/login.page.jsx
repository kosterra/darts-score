import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';

import AuthLayout from './auth.layout';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import MfaLoginStep from '../mfa/mfa.login.step';

const LoginPage = () => {
    const { login, mailEnabled, sessionEnded } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // the second step of two-step login: 'code' or 'enroll' (also after registering or a new password)
    const { state } = useLocation();
    const [mfaStep, setMfaStep] = useState(state?.mfaStep ?? null);

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
                        autoComplete="username"
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
                <Button type="submit" label={t('Log in')} icon="pi pi-sign-in" loading={submitting} />
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
