import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import ClubService from '../../services/club.service';
import { CLUB_ROLES } from '../../services/user.service';
import DeletePopup from '../elements/delete.popup';
import ClubAdminsDialog from './club.admins.dialog';
import ClubEditDialog from './club.edit.dialog';
import ClubLogo from '../elements/club.logo';
import { useAuth } from '../../utils/auth.context';
import ClubMembership from './club.membership';

/**
 * My clubs: the clubs the user runs or plays in, with what they do in each:
 * switching, the admin tools, and their own player there. New clubs start here.
 */
const ClubsPage = () => {
    const toast = useRef(null);
    const navigate = useNavigate();
    const { clubs, activeClub, refreshClubs, selectClub, isGlobalAdmin } = useAuth();

    const [newName, setNewName] = useState('');
    // Settings of the club being edited: { id, name, isPublic, publicLiveGames, publicResults, shameBadges, shameWithoutChildren, shameMinAge }
    const [editing, setEditing] = useState(null);
    const [adminsOfClubId, setAdminsOfClubId] = useState(null); // club whose admins dialog is open
    const [editingClubId, setEditingClubId] = useState(null); // club whose name, description and logo are edited

    const showError = (summary, error) =>
        toast.current.show({ severity: 'error', summary, detail: error.message, life: 4000 });

    const onCreate = async (event) => {
        event.preventDefault();
        try {
            const club = await ClubService.createClub(newName);
            setNewName('');
            await refreshClubs();
            // The first club becomes the one the app works in
            if (!activeClub) selectClub(club.id);
            toast.current.show({ severity: 'success', summary: 'Club created', detail: club.name, life: 3000 });
        } catch (error) {
            showError('Create club', error);
        }
    };

    const onSaveSettings = async (event) => {
        event.preventDefault();
        try {
            const { id, ...settings } = editing;
            await ClubService.updateClub(id, settings);
            setEditing(null);
            await refreshClubs();
        } catch (error) {
            showError('Club settings', error);
        }
    };

    const settingSwitch = (field, label, hint, disabled = false) => (
        <div className="d-flex justify-content-between align-items-center gap-3">
            <label htmlFor={`club-${field}`} className="d-flex flex-column">
                <span className={disabled ? 'text-faint' : 'text-default'}>{label}</span>
                <span className="text-faint fs-8">{hint}</span>
            </label>
            <InputSwitch
                inputId={`club-${field}`}
                checked={editing[field]}
                disabled={disabled}
                onChange={(e) => setEditing({ ...editing, [field]: e.value })}
            />
        </div>
    );

    const onDelete = async (club) => {
        try {
            await ClubService.deleteClub(club.id);
            await refreshClubs();
            toast.current.show({ severity: 'success', summary: 'Club deleted', detail: club.name, life: 3000 });
        } catch (error) {
            showError('Delete club', error);
        }
    };

    const onSelect = (club) => {
        selectClub(club.id);
        navigate('/');
    };

    const openSettings = (club) => setEditing({
        id: club.id,
        name: club.name,
        isPublic: !!club.isPublic,
        publicLiveGames: club.publicLiveGames !== false,
        publicResults: club.publicResults !== false,
        shameBadges: club.shameBadges !== false,
        shameWithoutChildren: club.shameWithoutChildren === true,
        shameMinAge: club.shameMinAge ?? 16
    });
    const showSuccess = (summary, detail) => toast.current.show({ severity: 'success', summary, detail, life: 3000 });

    // global admins look after the app and belong to no club
    if (isGlobalAdmin) {
        return (
            <div className="container-fluid p-4 border-0">
                <Panel header="My clubs">
                    <p className="text-subtle fs-7 m-0">
                        Global admins look after the app and do not belong to a club. Every club is under <Link to="/admin/clubs">Admin · Clubs</Link>;
                        to run a club or to play, use another account.
                    </p>
                </Panel>
            </div>
        );
    }

    return (
        <div className="container-fluid p-4 border-0">
            <Panel header="My clubs">
                <div className="my-clubs-top">
                    <p className="text-subtle fs-7 m-0">
                        The clubs you run or play in. Switch between them here or at the top of the menu. How you appear as a player, your nickname,
                        picture and the X01 tips, is on your <Link to="/player-profile">player profile</Link>.
                    </p>
                    <form onSubmit={onCreate} className="my-clubs-create">
                        <InputText
                            id="club-name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Name of a new club"
                            aria-label="Name of a new club"
                            minLength={3}
                            maxLength={50}
                            required
                        />
                        <Button type="submit" label="Create club" icon="pi pi-plus" size="small" />
                    </form>
                </div>

                {clubs.length === 0 &&
                    <p className="text-subtle fs-7 py-4 text-center m-0">
                        You are not in a club yet. Create your own club to add players and start playing, or ask a club admin to give you a login as a player of their club.
                    </p>
                }

                <ul className="my-clubs list-unstyled m-0">
                    {clubs.map(club => {
                        const isAdmin = club.role === CLUB_ROLES.ADMIN;
                        const current = activeClub?.id === club.id;
                        return (
                            <li key={club.id} className={`my-club ${current ? 'is-current' : ''}`}>
                                <div className="my-club-head">
                                    <ClubLogo club={club} size="md" />
                                    <div className="my-club-title">
                                        <div className="d-flex flex-wrap align-items-center gap-2">
                                            <span className="text-default fw-semibold fs-6 text-break">{club.name}</span>
                                            <Tag value={isAdmin ? 'Admin' : 'Player'} severity={isAdmin ? 'warning' : 'info'} />
                                            <Tag value={club.isPublic ? 'Public' : 'Private'} severity="secondary" />
                                            {current && <Tag value="Current club" severity="success" />}
                                        </div>
                                        <span className="text-faint fs-8 text-break">
                                            {club.playerCount} {club.playerCount === 1 ? 'player' : 'players'} · {club.admins.length === 1 ? 'Admin' : 'Admins'}: {club.admins.map(admin => `${admin.firstname} ${admin.lastname}`).join(', ')}
                                        </span>
                                        {club.description && <span className="text-subtle fs-8 text-break">{club.description}</span>}
                                    </div>
                                    <div className="my-club-actions">
                                        {!current && <Button label="Switch to this club" size="small" severity="secondary" onClick={() => onSelect(club)} />}
                                        {isAdmin && <>
                                            <Button icon="pi pi-users" size="small" severity="secondary" aria-label={`Admins of ${club.name}`} tooltip="Admins" tooltipOptions={{ position: 'top' }} onClick={() => setAdminsOfClubId(club.id)} />
                                            <Button icon="pi pi-pencil" size="small" severity="secondary" aria-label={`Edit ${club.name}`} tooltip="Name, description and logo" tooltipOptions={{ position: 'top' }} onClick={() => setEditingClubId(club.id)} />
                                            <Button icon="pi pi-cog" size="small" severity="secondary" aria-label={`Settings of ${club.name}`} tooltip="Settings" tooltipOptions={{ position: 'top' }} onClick={() => openSettings(club)} />
                                            <DeletePopup data={club} header="Delete Club" message={'club ' + club.name + ' with all its games'} handleDelete={onDelete} size="small" />
                                        </>}
                                    </div>
                                </div>
                                <ClubMembership club={club} onSuccess={showSuccess} onError={showError} />
                            </li>
                        );
                    })}
                </ul>
            </Panel>

            <Dialog header={editing ? `Settings of ${editing.name}` : 'Club Settings'} visible={!!editing} blockScroll onHide={() => setEditing(null)} draggable={false} className="m-4" style={{ width: '34rem', maxWidth: '100%' }}>
                {editing &&
                    <form onSubmit={onSaveSettings} className="d-flex flex-column gap-4 pt-2">
                        <span className="text-default fw-semibold">Visibility</span>
                        {settingSwitch('isPublic', 'Public club', 'Listed by name on the public start page. Private clubs are not visible to anyone outside.')}
                        {settingSwitch('publicLiveGames', 'Show running games', 'Live scores of games in progress appear on the public start page.', !editing.isPublic)}
                        {settingSwitch('publicResults', 'Show results', 'Finished games appear under the latest results.', !editing.isPublic)}
                        <span className="text-faint fs-8">
                            Players are shown without their name unless their nickname is set to public, by an admin on the players page or by the players themselves in their profile.
                        </span>
                        <span className="text-default fw-semibold">Fun</span>
                        {settingSwitch('shameBadges', 'Hall of Shame', 'Badges nobody wants, like Bed and Breakfast or Madhouse, with who holds them on the dashboard and in X01 games.')}
                        {settingSwitch('shameWithoutChildren', `Leave out children under ${editing.shameMinAge ?? 16}`, 'Children never hold a shame badge and have no Hall of Shame on their profile; what they threw as children never counts. Players without a date of birth are always left out.', !editing.shameBadges)}
                        <div className="d-flex justify-content-between align-items-center gap-3">
                            <label htmlFor="club-shameMinAge" className="d-flex flex-column">
                                <span className={editing.shameBadges && editing.shameWithoutChildren ? 'text-default' : 'text-faint'}>Age limit</span>
                                <span className="text-faint fs-8">Players count from this birthday on.</span>
                            </label>
                            <InputNumber
                                inputId="club-shameMinAge"
                                value={editing.shameMinAge}
                                onValueChange={(e) => setEditing({ ...editing, shameMinAge: e.value ?? 16 })}
                                min={6}
                                max={21}
                                showButtons
                                suffix=" years"
                                disabled={!editing.shameBadges || !editing.shameWithoutChildren}
                                inputClassName="text-center"
                                inputStyle={{ width: '6.5rem' }}
                            />
                        </div>
                        <div className="d-flex justify-content-end gap-3">
                            <Button type="button" label="Cancel" severity="secondary" size="small" onClick={() => setEditing(null)} />
                            <Button type="submit" label="Save" icon="pi pi-save" size="small" />
                        </div>
                    </form>
                }
            </Dialog>
            <ClubEditDialog
                club={clubs.find(club => club.id === editingClubId) ?? null}
                onHide={() => setEditingClubId(null)}
                onSaved={refreshClubs}
            />
            <ClubAdminsDialog
                club={clubs.find(club => club.id === adminsOfClubId) ?? null}
                onHide={() => setAdminsOfClubId(null)}
                onChange={refreshClubs}
            />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ClubsPage;
