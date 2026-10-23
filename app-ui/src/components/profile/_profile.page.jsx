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
import { LANGUAGES, currentLanguage, setLanguage, t } from '../../utils/i18n';
import PlayingPreferences from './playing.preferences';
import DateFormatSetting from './date.format.setting';

const MIN_PASSWORD_LENGTH = 8;
// "the club I used last" in the list: a value of its own, since an empty one shows as nothing chosen
const LAST_CLUB = 'last';

const ProfilePage = () => {
    const toast = useRef(null);
    const { user, setUser, clubs, isGlobalAdmin, logout } = useAuth();

    const [profile, setProfile] = useState({ firstname: user.firstname, lastname: user.lastname, email: user.email, startPage: user.startPage ?? 'dashboard', defaultClub: user.defaultClub ? String(user.defaultClub) : null });
    // the club the start page is about: the default one, or the one used last
    const startClub = clubs.find(club => club.id === profile.defaultClub);
    const startClubText = startClub ? startClub.name : t('the club you used last');
    const [passwords, setPasswords] = useState({ current: '', next: '', repeat: '' });
    const showSuccess = (summary, detail) =>
        toast.current.show({ severity: 'success', summary, detail, life: 3000 });
    const showError = (summary, error) =>
        toast.current.show({ severity: 'error', summary, detail: error.message, life: 4000 });

    const onSaveProfile = async (event) => {
        event.preventDefault();
        try {
            setUser(await AuthService.updateProfile(profile));
            showSuccess(t('Profile'), t('Your profile is saved.'));
        } catch (error) {
            showError(t('Profile'), error);
        }
    };

    // saved on the account right away; the app starts again in it
    const onChangeLanguage = async (language) => {
        if (!language || language === currentLanguage()) return;
        try {
            setUser(await AuthService.saveLanguage(language));
            setLanguage(language);
        } catch (error) {
            showError(t('Language'), error);
        }
    };

    const onChangePassword = async (event) => {
        event.preventDefault();
        if (passwords.next.length < MIN_PASSWORD_LENGTH) {
            return showError(t('Password'), new Error(t('The new password needs at least {{MIN_PASSWORD_LENGTH}} characters.', { MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH })));
        }
        if (passwords.next !== passwords.repeat) {
            return showError(t('Password'), new Error(t('The two new passwords do not match.')));
        }
        try {
            await AuthService.changePassword(passwords.current, passwords.next);
            setPasswords({ current: '', next: '', repeat: '' });
            showSuccess(t('Password'), t('Your password is changed. Other devices are logged out.'));
        } catch (error) {
            showError(t('Password'), error);
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
            <Panel header={t('User profile')}>
                <p className="text-subtle fs-7 mt-0 mb-3">
                    {t('Your account: the name your clubs see, the email you log in with, what opens after logging in, your password and how you like to play.')}
                    {isGlobalAdmin && <> <Tag value={ROLE_LABELS[user.role]} severity="secondary" className="ms-1" /></>}
                </p>
                {/* laid out as the player profile and the game setup: a section title, then a box per setting */}
                <div className="row g-4">
                    <form onSubmit={onSaveProfile} className="col-12 col-xl-6">
                        <p className="game-setup-section-title">{t('Your account')}</p>
                        <p className="setting-title">{t('Name')}</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-wrap gap-3 pt-1 profile-name">
                                {field('profile-firstname', t('First name'), <InputText id="profile-firstname" value={profile.firstname} onChange={(e) => setProfile({ ...profile, firstname: e.target.value })} required />)}
                                {field('profile-lastname', t('Last name'), <InputText id="profile-lastname" value={profile.lastname} onChange={(e) => setProfile({ ...profile, lastname: e.target.value })} required />)}
                                <span className="text-faint fs-8 w-100">{t('Your players in the clubs carry this name; their nickname you set on the player profile.')}</span>
                            </div>
                        </div>
                        <p className="setting-title">{t('Email')}</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col pt-1">
                                {field('profile-email', t('Email address'), <InputText id="profile-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />, t('You log in with it; a new password is sent there.'))}
                            </div>
                        </div>
                        <p className="setting-title">{t('Language')}</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column gap-2">
                                <SelectButton
                                    value={currentLanguage()}
                                    options={LANGUAGES}
                                    optionLabel="label"
                                    optionValue="code"
                                    onChange={(e) => onChangeLanguage(e.value)}
                                    className="p-selectbutton-pills flex-wrap"
                                    aria-label={t('Language')}
                                />
                                <span className="text-faint fs-8">{t('The app and the mails you get come in this language. Saved right away.')}</span>
                            </div>
                        </div>
                        <DateFormatSetting onSaved={(detail) => toast.current?.show({ severity: 'success', summary: t('Saved'), detail, life: 2500 })} />

                        {/* no clubs and no statistics of their own for global admins */}
                        {!isGlobalAdmin && (
                            <>
                                <p className="game-setup-section-title">{t('After logging in')}</p>
                                <p className="setting-title">{t('Open the club')}</p>
                                <div className="row mx-0 mt-0 setting-body">
                                    <div className="col pt-1">
                                        <Dropdown
                                            value={profile.defaultClub ?? LAST_CLUB}
                                            options={[{ label: t('The club I used last'), value: LAST_CLUB }, ...clubs.map(club => ({ label: club.name, value: club.id }))]}
                                            onChange={(e) => setProfile({ ...profile, defaultClub: e.value === LAST_CLUB ? null : e.value })}
                                            className="profile-club"
                                            aria-label={t('Default club')}
                                        />
                                        <span className="d-block text-faint fs-8 mt-1">{t('Also when the app opens in a new tab or browser; switching clubs while you play stays as it is.')}</span>
                                    </div>
                                </div>
                                <p className="setting-title">{t('And show')}</p>
                                <div className="row mx-0 mt-0 setting-body">
                                    <div className="col d-flex flex-column gap-2">
                                        <SelectButton
                                            value={profile.startPage}
                                            options={[{ label: t('Dashboard'), value: 'dashboard' }, { label: t('My statistics'), value: 'myStatistics' }]}
                                            onChange={(e) => e.value && setProfile({ ...profile, startPage: e.value })}
                                            className="p-selectbutton-pills flex-wrap"
                                            aria-label={t('Start page')}
                                        />
                                        <span className="text-faint fs-8">
                                            {profile.startPage === 'myStatistics' ? t('Opens your statistics in {{startClubText}}.', { startClubText: startClubText }) : t('Opens the dashboard of {{startClubText}}.', { startClubText: startClubText })}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mb-4">
                            <Button type="button" label={t('Log out')} icon="pi pi-sign-out" size="small" severity="secondary" onClick={logout} />
                            <Button type="submit" label={t('Save')} icon="pi pi-save" size="small" disabled={!changed} />
                        </div>
                    </form>

                    <div className="col-12 col-xl-6">
                    <form onSubmit={onChangePassword}>
                        <p className="game-setup-section-title">{t('Security')}</p>
                        <p className="setting-title">{t('Change password')}</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column gap-3 pt-1">
                                {passwordField('profile-password-current', t('Current password'), 'current', 'current-password')}
                                {passwordField('profile-password-new', t('New password'), 'next', 'new-password', t('At least {{MIN_PASSWORD_LENGTH}} characters. Your other devices are logged out.', { MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH }))}
                                {passwordField('profile-password-repeat', t('Repeat the new password'), 'repeat', 'new-password')}
                                <div className="d-flex justify-content-end">
                                    <Button type="submit" label={t('Change password')} icon="pi pi-key" size="small" disabled={!passwords.current || !passwords.next || !passwords.repeat} />
                                </div>
                            </div>
                        </div>
                    </form>
                    {/* how you like to play, on every device */}
                    <div className="mt-4">
                        <PlayingPreferences onSaved={(detail) => toast.current?.show({ severity: 'success', summary: t('Saved'), detail, life: 2500 })} />
                    </div>
                    </div>
                </div>
            </Panel>
        </div>
    );
};

export default ProfilePage;
