import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';

import AuthLayout from './auth.layout';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Target of the links in password reset and club admin invitation mails.
 */
const ResetPasswordPage = () => {
    const { resetPassword } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [passwordRepeat, setPasswordRepeat] = useState('');
    const [error, setError] = useState(token ? '' : t('This link is incomplete. Please use the link from your mail.'));
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (event) => {
        event.preventDefault();
        if (password.length < MIN_PASSWORD_LENGTH) {
            return setError(t('The password needs at least {{MIN_PASSWORD_LENGTH}} characters.', { MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH }));
        }
        if (password !== passwordRepeat) {
            return setError(t('The two passwords do not match.'));
        }
        setError('');
        setSubmitting(true);
        try {
            await resetPassword(token, password);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout title={t('Choose a new password')}>
            <form onSubmit={onSubmit} className="d-flex flex-column gap-4 pt-3">
                <span className="p-float-label w-100">
                    <Password
                        inputId="reset-password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        feedback={false}
                        className="w-100"
                        inputClassName="w-100"
                        required
                    />
                    <label htmlFor="reset-password">{t('New password (at least')}{' '}{MIN_PASSWORD_LENGTH}{' '}{t('characters)')}</label>
                </span>
                <span className="p-float-label w-100">
                    <Password
                        inputId="reset-password-repeat"
                        autoComplete="new-password"
                        value={passwordRepeat}
                        onChange={(e) => setPasswordRepeat(e.target.value)}
                        feedback={false}
                        className="w-100"
                        inputClassName="w-100"
                        required
                    />
                    <label htmlFor="reset-password-repeat">{t('Repeat new password')}</label>
                </span>
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <Button type="submit" label={t('Save password and log in')} icon="pi pi-key" loading={submitting} disabled={!token} />
                <span className="fs-7 text-subtle text-center"><Link to="/login">{t('Back to log in')}</Link></span>
            </form>
        </AuthLayout>
    );
};

export default ResetPasswordPage;
