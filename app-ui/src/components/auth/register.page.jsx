import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';

import AuthLayout from './auth.layout';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { clearPendingClaim, peekPendingClaim, setPendingClaim } from '../../utils/pending.claim';

const MIN_PASSWORD_LENGTH = 8;

const RegisterPage = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [account, setAccount] = useState({ firstname: '', lastname: '', email: '', password: '' });
    // against bots: a field people never see, and how long the form was open
    const [website, setWebsite] = useState('');
    const openedAt = useRef(Date.now());
    const [passwordRepeat, setPasswordRepeat] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const onChange = (field) => (event) => setAccount({ ...account, [field]: event.target.value });

    const onSubmit = async (event) => {
        event.preventDefault();
        if (account.password.length < MIN_PASSWORD_LENGTH) {
            return setError(t('The password needs at least {{MIN_PASSWORD_LENGTH}} characters.', { MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH }));
        }
        if (account.password !== passwordRepeat) {
            return setError(t('The two passwords do not match.'));
        }
        setError('');
        setSubmitting(true);
        // registered from a claim link: the new account takes over the player at once
        // (no longer pending, so the app does not open the link again)
        const claimToken = peekPendingClaim();
        clearPendingClaim();
        try {
            const next = await register({ ...account, website, formTimeMs: Date.now() - openedAt.current, ...(claimToken && { claimToken }) });
            // required two-step login is set up first, on the login page
            if (next?.mfaRequired) navigate('/login', { replace: true, state: { mfaStep: next.step } });
        } catch (err) {
            if (claimToken) setPendingClaim(claimToken);
            setError(err.message);
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout hide="register" title={t('Register')}>
            <form onSubmit={onSubmit} className="d-flex flex-column gap-4 pt-3">
                {peekPendingClaim() && <Message severity="info" text={t('Once your account is there, you play as your player of the club, with everything you played so far.')} className="w-100 justify-content-start" />}
                <span className="fs-7 text-subtle">
                    {t('Create your account, then set up your own club and add its players, or join a club that takes new members. A club admin can also give you a login for their club.')}
                </span>
                <div className="register-website" aria-hidden="true">
                    <label htmlFor="register-website">{t('Website')}</label>
                    <input id="register-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <span className="p-float-label w-100">
                    <InputText id="register-firstname" autoComplete="given-name" value={account.firstname} onChange={onChange('firstname')} className="w-100" required />
                    <label htmlFor="register-firstname">{t('Firstname')}</label>
                </span>
                <span className="p-float-label w-100">
                    <InputText id="register-lastname" autoComplete="family-name" value={account.lastname} onChange={onChange('lastname')} className="w-100" required />
                    <label htmlFor="register-lastname">{t('Lastname')}</label>
                </span>
                <span className="p-float-label w-100">
                    <InputText id="register-email" type="email" autoComplete="username" value={account.email} onChange={onChange('email')} className="w-100" required />
                    <label htmlFor="register-email">{t('Email')}</label>
                </span>
                <span className="p-float-label w-100">
                    <Password
                        inputId="register-password"
                        autoComplete="new-password"
                        value={account.password}
                        onChange={onChange('password')}
                        feedback={false}
                        className="w-100"
                        inputClassName="w-100"
                        required
                    />
                    <label htmlFor="register-password">{t('Password (at least')}{' '}{MIN_PASSWORD_LENGTH}{' '}{t('characters)')}</label>
                </span>
                <span className="p-float-label w-100">
                    <Password
                        inputId="register-password-repeat"
                        autoComplete="new-password"
                        value={passwordRepeat}
                        onChange={(e) => setPasswordRepeat(e.target.value)}
                        feedback={false}
                        className="w-100"
                        inputClassName="w-100"
                        required
                    />
                    <label htmlFor="register-password-repeat">{t('Repeat password')}</label>
                </span>
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <Button type="submit" label={t('Create account')} icon="pi pi-user-plus" loading={submitting} />
                <span className="fs-7 text-subtle text-center">
                    {t('Already registered?')}{' '}<Link to="/login">{t('Log in')}</Link>
                </span>
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
