import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';

import AuthLayout from './auth.layout';
import { useAuth } from '../../utils/auth.context';

const MIN_PASSWORD_LENGTH = 8;

const RegisterPage = () => {
    const { register } = useAuth();

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
            return setError(`The password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
        }
        if (account.password !== passwordRepeat) {
            return setError('The two passwords do not match.');
        }
        setError('');
        setSubmitting(true);
        try {
            await register({ ...account, website, formTimeMs: Date.now() - openedAt.current });
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout title="Register">
            <form onSubmit={onSubmit} className="d-flex flex-column gap-4 pt-3">
                <span className="fs-7 text-subtle">
                    Create your account, then set up your own club and add its players, or join a club that takes new members. A club admin can also give you a login for their club.
                </span>
                <div className="register-website" aria-hidden="true">
                    <label htmlFor="register-website">Website</label>
                    <input id="register-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <span className="p-float-label w-100">
                    <InputText id="register-firstname" autoComplete="given-name" value={account.firstname} onChange={onChange('firstname')} className="w-100" required />
                    <label htmlFor="register-firstname">Firstname</label>
                </span>
                <span className="p-float-label w-100">
                    <InputText id="register-lastname" autoComplete="family-name" value={account.lastname} onChange={onChange('lastname')} className="w-100" required />
                    <label htmlFor="register-lastname">Lastname</label>
                </span>
                <span className="p-float-label w-100">
                    <InputText id="register-email" type="email" autoComplete="username" value={account.email} onChange={onChange('email')} className="w-100" required />
                    <label htmlFor="register-email">Email</label>
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
                    <label htmlFor="register-password">Password (at least {MIN_PASSWORD_LENGTH} characters)</label>
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
                    <label htmlFor="register-password-repeat">Repeat password</label>
                </span>
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <Button type="submit" label="Create account" icon="pi pi-user-plus" loading={submitting} />
                <span className="fs-7 text-subtle text-center">
                    Already registered? <Link to="/login">Log in</Link>
                </span>
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
