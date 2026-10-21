import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import AuthLayout from './auth.layout';
import AuthService from '../../services/auth.service';
import { t } from '../../utils/i18n';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await AuthService.requestPasswordReset(email);
            setSent(true);
        } catch (err) {
            setError(err.message);
        }
        setSubmitting(false);
    };

    return (
        <AuthLayout title={t('Reset password')}>
            {sent
                ? (
                    <div className="d-flex flex-column gap-4 pt-3">
                        <Message
                            severity="success"
                            text={t('If an account exists for {{email}}, we sent a link to choose a new password. It is valid for one hour.', { email: email })}
                            className="w-100 justify-content-start"
                        />
                        <span className="fs-7 text-subtle text-center"><Link to="/login">{t('Back to log in')}</Link></span>
                    </div>
                )
                : (
                    <form onSubmit={onSubmit} className="d-flex flex-column gap-4 pt-3">
                        <span className="fs-7 text-subtle">
                            {t('Enter the email address of your account and we send you a link to choose a new password.')}
                        </span>
                        <span className="p-float-label w-100">
                            <InputText
                                id="forgot-email"
                                type="email"
                                autoComplete="username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-100"
                                required
                            />
                            <label htmlFor="forgot-email">{t('Email')}</label>
                        </span>
                        {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                        <Button type="submit" label={t('Send reset link')} icon="pi pi-envelope" loading={submitting} />
                        <span className="fs-7 text-subtle text-center"><Link to="/login">{t('Back to log in')}</Link></span>
                    </form>
                )
            }
        </AuthLayout>
    );
};

export default ForgotPasswordPage;
