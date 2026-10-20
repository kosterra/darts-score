import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AuthService from '../../services/auth.service';
import { ROLE_LABELS } from '../../services/user.service';
import { useAuth } from '../../utils/auth.context';

const MIN_PASSWORD_LENGTH = 8;
// "the club I used last" in the list: a value of its own, since an empty one shows as nothing chosen
const LAST_CLUB = 'last';

const ProfilePage = () => {
    const toast = useRef(null);
    const { user, setUser, clubs, isGlobalAdmin, logout } = useAuth();

    const [profile, setProfile] = useState({ firstname: user.firstname, lastname: user.lastname, email: user.email, startPage: user.startPage ?? 'dashboard', defaultClub: user.defaultClub ? String(user.defaultClub) : null });
    // the club the start page is about: the default one, or the one used last
    const startClub = clubs.find(club => club.id === profile.defaultClub);
    const startClubText = startClub ? startClub.name : 'the club you used last';
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

    const changed = profile.firstname !== user.firstname || profile.lastname !== user.lastname || profile.email !== user.email
        || profile.startPage !== (user.startPage ?? 'dashboard') || profile.defaultClub !== (user.defaultClub ? String(user.defaultClub) : null);

    // a field with its label above it, as on the player profile
    const field = (id, label, input, hint) => (
        <label htmlFor={id} className="d-flex flex-column gap-1 profile-field">
            <span className="text-subtle fs-8">{label}</span>
            {input}
            {hint && <span className="text-faint fs-8">{hint}</span>}
        </label>
    );
    const passwordField = (id, label, key, autoComplete, hint) => field(id, label, (
        <Password
            inputId={id}
            autoComplete={autoComplete}
            value={passwords[key]}
            onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })}
            feedback={false}
            className="w-100"
            inputClassName="w-100"
            required
        />
    ), hint);

    return (
        <div className="container-fluid p-4 border-0">
            <Toast ref={toast} position="bottom-right" />
            <Panel header="User profile">
                <p className="text-subtle fs-7 mt-0 mb-3">
                    Your account: the name your clubs see, the email you log in with, what opens after logging in and your password.
                    {isGlobalAdmin && <> <Tag value={ROLE_LABELS[user.role]} severity="warning" className="ms-1" /></>}
                </p>
                {/* laid out as the player profile and the game setup: a section title, then a box per setting */}
                <div className="row g-4">
                    <form onSubmit={onSaveProfile} className="col-12 col-xl-6">
                        <p className="game-setup-section-title">Your account</p>
                        <p className="setting-title">Name</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-wrap gap-3 pt-1 profile-name">
                                {field('profile-firstname', 'First name', <InputText id="profile-firstname" value={profile.firstname} onChange={(e) => setProfile({ ...profile, firstname: e.target.value })} required />)}
                                {field('profile-lastname', 'Last name', <InputText id="profile-lastname" value={profile.lastname} onChange={(e) => setProfile({ ...profile, lastname: e.target.value })} required />)}
                                <span className="text-faint fs-8 w-100">Your players in the clubs carry this name; their nickname you set on the player profile.</span>
                            </div>
                        </div>
                        <p className="setting-title">Email</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col pt-1">
                                {field('profile-email', 'Email address', <InputText id="profile-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />, 'You log in with it; a new password is sent there.')}
                            </div>
                        </div>

                        {/* no clubs and no statistics of their own for global admins */}
                        {!isGlobalAdmin && (
                            <>
                                <p className="game-setup-section-title">After logging in</p>
                                <p className="setting-title">Open the club</p>
                                <div className="row mx-0 mt-0 setting-body">
                                    <div className="col pt-1">
                                        <Dropdown
                                            value={profile.defaultClub ?? LAST_CLUB}
                                            options={[{ label: 'The club I used last', value: LAST_CLUB }, ...clubs.map(club => ({ label: club.name, value: club.id }))]}
                                            onChange={(e) => setProfile({ ...profile, defaultClub: e.value === LAST_CLUB ? null : e.value })}
                                            className="profile-club"
                                            aria-label="Default club"
                                        />
                                        <span className="d-block text-faint fs-8 mt-1">Also when the app opens in a new tab or browser; switching clubs while you play stays as it is.</span>
                                    </div>
                                </div>
                                <p className="setting-title">And show</p>
                                <div className="row mx-0 mt-0 setting-body">
                                    <div className="col d-flex flex-column gap-2">
                                        <SelectButton
                                            value={profile.startPage}
                                            options={[{ label: 'Dashboard', value: 'dashboard' }, { label: 'My statistics', value: 'myStatistics' }]}
                                            onChange={(e) => e.value && setProfile({ ...profile, startPage: e.value })}
                                            className="p-selectbutton-pills flex-wrap"
                                            aria-label="Start page"
                                        />
                                        <span className="text-faint fs-8">
                                            {profile.startPage === 'myStatistics' ? `Opens your statistics in ${startClubText}.` : `Opens the dashboard of ${startClubText}.`}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mb-4">
                            <Button type="button" label="Log out" icon="pi pi-sign-out" size="small" severity="secondary" onClick={logout} />
                            <Button type="submit" label="Save" icon="pi pi-save" size="small" disabled={!changed} />
                        </div>
                    </form>

                    <form onSubmit={onChangePassword} className="col-12 col-xl-6">
                        <p className="game-setup-section-title">Security</p>
                        <p className="setting-title">Change password</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column gap-3 pt-1">
                                {passwordField('profile-password-current', 'Current password', 'current', 'current-password')}
                                {passwordField('profile-password-new', 'New password', 'next', 'new-password', `At least ${MIN_PASSWORD_LENGTH} characters. Your other devices are logged out.`)}
                                {passwordField('profile-password-repeat', 'Repeat the new password', 'repeat', 'new-password')}
                                <div className="d-flex justify-content-end">
                                    <Button type="submit" label="Change password" icon="pi pi-key" size="small" disabled={!passwords.current || !passwords.next || !passwords.repeat} />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </Panel>
        </div>
    );
};

export default ProfilePage;
