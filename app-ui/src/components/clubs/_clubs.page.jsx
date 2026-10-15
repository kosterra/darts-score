import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
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

const ClubsPage = () => {
    const toast = useRef(null);
    const navigate = useNavigate();
    const { clubs, activeClub, isGlobalAdmin, refreshClubs, selectClub } = useAuth();

    const [newName, setNewName] = useState('');
    // Settings of the club being edited: { id, name, isPublic, publicLiveGames, publicResults }
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

    return (
        <div className="container-fluid p-4 border-0">
            <Panel header={isGlobalAdmin ? 'All clubs' : 'Your clubs'}>
                <div className="container-fluid overflow-hidden">
                    <form onSubmit={onCreate} className="row gy-3 p-3 align-items-center">
                        <div className="col-12 col-md-6 col-xl-4">
                            <InputText
                                id="club-name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Name of the new club"
                                aria-label="Name of the new club"
                                className="w-100"
                                minLength={3}
                                maxLength={50}
                                required
                            />
                        </div>
                        <div className="col-12 col-md-auto">
                            <Button type="submit" label="Create club" icon="pi pi-plus" />
                        </div>
                    </form>

                    {clubs.length === 0 &&
                        <div className="p-3 text-subtle">
                            You are not in a club yet. Create your own club to add players and start playing, or ask a club admin to give you a login as a player of their club.
                        </div>
                    }

                    <div className="row gy-4 p-3">
                        {clubs.map(club => (
                            <div className="col-12 col-md-6 col-xl-4" key={club.id}>
                                <Panel className="panel-brighter-bg no-header h-100">
                                    <div className="d-flex flex-column gap-2 p-2">
                                        <div className="d-flex align-items-center gap-3">
                                            <ClubLogo club={club} size="md" />
                                            <span className="text-default fw-semibold fs-5 text-break">{club.name}</span>
                                        </div>
                                        <div className="d-flex flex-column gap-2">
                                            <div className="d-flex flex-wrap gap-2">
                                                <Tag value={club.isPublic ? 'Public' : 'Private'} severity="secondary" />
                                                <Tag value={club.role === CLUB_ROLES.ADMIN ? 'Admin' : 'Player'} severity={club.role === CLUB_ROLES.ADMIN ? 'warning' : 'info'} />
                                                {activeClub?.id === club.id && <Tag value="Active" severity="success" />}
                                            </div>
                                        </div>
                                        {club.description && <span className="text-subtle fs-7 text-break">{club.description}</span>}
                                        <span className="text-subtle fs-7">
                                            {club.playerCount} {club.playerCount === 1 ? 'player' : 'players'}
                                        </span>
                                        <span className="text-faint fs-7 text-break">
                                            {club.admins.length === 1 ? 'Admin' : 'Admins'}: {club.admins.map(admin => `${admin.firstname} ${admin.lastname}`).join(', ')}
                                        </span>
                                        <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mt-3">
                                            {activeClub?.id !== club.id &&
                                                <Button label="Switch to this club" size="small" outlined onClick={() => onSelect(club)} />
                                            }
                                            {club.role === CLUB_ROLES.ADMIN && <>
                                            <Button
                                                icon="pi pi-users"
                                                severity="secondary"
                                                aria-label={`Admins of ${club.name}`}
                                                tooltip="Admins"
                                                tooltipOptions={{ position: 'top' }}
                                                onClick={() => setAdminsOfClubId(club.id)}
                                            />
                                            <Button
                                                icon="pi pi-pencil"
                                                severity="secondary"
                                                aria-label={`Edit ${club.name}`}
                                                tooltip="Edit club"
                                                tooltipOptions={{ position: 'top' }}
                                                onClick={() => setEditingClubId(club.id)}
                                            />
                                            <Button
                                                icon="pi pi-cog"
                                                severity="secondary"
                                                aria-label={`Settings of ${club.name}`}
                                                tooltip="Settings"
                                                tooltipOptions={{ position: 'top' }}
                                                onClick={() => setEditing({
                                                    id: club.id,
                                                    name: club.name,
                                                    isPublic: !!club.isPublic,
                                                    publicLiveGames: club.publicLiveGames !== false,
                                                    publicResults: club.publicResults !== false
                                                })}
                                            />
                                            <DeletePopup
                                                data={club}
                                                header="Delete Club"
                                                message={'club ' + club.name + ' with all its games'}
                                                handleDelete={onDelete}
                                            />
                                            </>}
                                        </div>
                                    </div>
                                </Panel>
                            </div>
                        ))}
                    </div>
                </div>
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
