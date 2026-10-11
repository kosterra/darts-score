import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AuthService from '../../services/auth.service';
import ClubService from '../../services/club.service';
import { ROLE_LABELS, CLUB_ROLES } from '../../services/user.service';
import { useAuth } from '../../utils/auth.context';

const MIN_PASSWORD_LENGTH = 8;

const ProfilePage = () => {
    const toast = useRef(null);
    const { user, setUser, clubs, isGlobalAdmin, logout, refreshClubs } = useAuth();

    const [profile, setProfile] = useState({ firstname: user.firstname, lastname: user.lastname, email: user.email });
    const [passwords, setPasswords] = useState({ current: '', next: '', repeat: '' });
    // club id -> the player this user plays as there (null when not a player)
    const [playerByClub, setPlayerByClub] = useState({});
    const [nicknames, setNicknames] = useState({});

    // A global admin sees every club; this is about the ones they really belong to
    const ownClubs = clubs.filter(club => club.role === CLUB_ROLES.PLAYER || club.admins.some(admin => admin.id === user.id));
    const ownClubIds = ownClubs.map(club => club.id).join(',');

    useEffect(() => {
        const loadPlayers = async () => {
            const entries = await Promise.all(ownClubIds.split(',').filter(Boolean).map(async (clubId) =>
                [clubId, await ClubService.findPlayerOfUser(clubId, user.id).catch(() => null)]
            ));
            setPlayerByClub(Object.fromEntries(entries));
        };
        loadPlayers();
    }, [ownClubIds, user.id]);

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

    const onAddAsPlayer = async (event, club) => {
        event.preventDefault();
        try {
            const player = await ClubService.addCurrentUserAsPlayer(club.id, nicknames[club.id] ?? '');
            setPlayerByClub({ ...playerByClub, [club.id]: player });
            await refreshClubs();
            showSuccess('Player added', `You now play in ${club.name} as ${player.nickname}.`);
        } catch (error) {
            showError('Add as player', error);
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
                    <Panel header="Your profile" className="h-100">
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

                <div className="col-12">
                    <Panel header="Your clubs">
                        <div className="p-3">
                            <p className="text-subtle fs-7">
                                In clubs you manage you can add yourself as a player, so you can be picked for games like anyone else.
                            </p>
                            {ownClubs.length === 0 &&
                                <span className="text-subtle">You are not in a club yet.</span>
                            }
                            {ownClubs.map(club => (
                                <div key={club.id} className="row gy-2 align-items-center py-2 border-top border-default">
                                    <div className="col-12 col-md-4 text-default fw-semibold text-break">
                                        {club.name} <Tag value={club.role === CLUB_ROLES.ADMIN ? 'Admin' : 'Player'} severity={club.role === CLUB_ROLES.ADMIN ? 'warning' : 'info'} className="ms-2" />
                                    </div>
                                    <div className="col-12 col-md-8">
                                        {playerByClub[club.id]
                                            ? <span className="text-subtle">You play as <span className="text-default fw-semibold">{playerByClub[club.id].nickname}</span></span>
                                            : (
                                                <form onSubmit={(e) => onAddAsPlayer(e, club)} className="d-flex flex-wrap gap-2">
                                                    <InputText
                                                        id={`profile-nickname-${club.id}`}
                                                        value={nicknames[club.id] ?? ''}
                                                        onChange={(e) => setNicknames({ ...nicknames, [club.id]: e.target.value })}
                                                        placeholder="Nickname"
                                                        aria-label={`Nickname in ${club.name}`}
                                                        minLength={3}
                                                        maxLength={25}
                                                        required
                                                    />
                                                    <Button type="submit" label="Add me as player" icon="pi pi-user-plus" size="small" />
                                                </form>
                                            )
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ProfilePage;
