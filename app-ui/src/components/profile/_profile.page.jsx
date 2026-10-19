import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AuthService from '../../services/auth.service';
import { ROLE_LABELS } from '../../services/user.service';
import { useAuth } from '../../utils/auth.context';

const MIN_PASSWORD_LENGTH = 8;

const ProfilePage = () => {
    const toast = useRef(null);
    const { user, setUser, isGlobalAdmin, logout } = useAuth();

    const [profile, setProfile] = useState({ firstname: user.firstname, lastname: user.lastname, email: user.email });
    const [passwords, setPasswords] = useState({ current: '', next: '', repeat: '' });
    const showSuccess = (summary, detail) =>
        toast.current.show({ severity: 'success', summary, detail, life: 3000 });
    const showError = (summary, error) =>
        toast.current.show({ severity: 'error', summary, detail: error.message, life: 4000 });

    const onSaveProfile = async (event) => {
        event.preventDefault();
        try {
            setUser(await AuthService.updateProfile(profile));
            showSuccess('Profile', 'Your profile is saved.');
        } catch (error) {
            showError('Profile', error);
        }
    };

    const onChangePassword = async (event) => {
        event.preventDefault();
        if (passwords.next.length < MIN_PASSWORD_LENGTH) {
            return showError('Password', new Error(`The new password needs at least ${MIN_PASSWORD_LENGTH} characters.`));
        }
        if (passwords.next !== passwords.repeat) {
            return showError('Password', new Error('The two new passwords do not match.'));
        }
        try {
            await AuthService.changePassword(passwords.current, passwords.next);
            setPasswords({ current: '', next: '', repeat: '' });
            showSuccess('Password', 'Your password is changed. Other devices are logged out.');
        } catch (error) {
            showError('Password', error);
        }
    };

    const passwordField = (id, label, field, autoComplete) => (
        <span className="p-float-label w-100">
            <Password
                inputId={id}
                autoComplete={autoComplete}
                value={passwords[field]}
                onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })}
                feedback={false}
                className="w-100"
                inputClassName="w-100"
                required
            />
            <label htmlFor={id}>{label}</label>
        </span>
    );

    return (
        <div className="container-fluid p-4 border-0">
            <div className="row gy-4">
                <div className="col-12 col-lg-6">
                    <Panel header="User profile" className="h-100">
                        <form onSubmit={onSaveProfile} className="d-flex flex-column gap-4 p-3 pt-4">
                            {isGlobalAdmin && <div className="mb-2"><Tag value={ROLE_LABELS[user.role]} severity="warning" /></div>}
                            <span className="p-float-label w-100">
                                <InputText id="profile-firstname" value={profile.firstname} onChange={(e) => setProfile({ ...profile, firstname: e.target.value })} className="w-100" required />
                                <label htmlFor="profile-firstname">Firstname</label>
                            </span>
                            <span className="p-float-label w-100">
                                <InputText id="profile-lastname" value={profile.lastname} onChange={(e) => setProfile({ ...profile, lastname: e.target.value })} className="w-100" required />
                                <label htmlFor="profile-lastname">Lastname</label>
                            </span>
                            <span className="p-float-label w-100">
                                <InputText id="profile-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-100" required />
                                <label htmlFor="profile-email">Email</label>
                            </span>
                            <div className="d-flex justify-content-between gap-3">
                                <Button type="button" label="Log out" icon="pi pi-sign-out" severity="secondary" onClick={logout} />
                                <Button type="submit" label="Save" icon="pi pi-save" />
                            </div>
                        </form>
                    </Panel>
                </div>

                <div className="col-12 col-lg-6">
                    <Panel header="Change password" className="h-100">
                        <form onSubmit={onChangePassword} className="d-flex flex-column gap-4 p-3 pt-4">
                            {passwordField('profile-password-current', 'Current password', 'current', 'current-password')}
                            {passwordField('profile-password-new', `New password (at least ${MIN_PASSWORD_LENGTH} characters)`, 'next', 'new-password')}
                            {passwordField('profile-password-repeat', 'Repeat new password', 'repeat', 'new-password')}
                            <div className="d-flex justify-content-end">
                                <Button type="submit" label="Change password" icon="pi pi-key" />
                            </div>
                        </form>
                    </Panel>
                </div>

            </div>
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ProfilePage;
