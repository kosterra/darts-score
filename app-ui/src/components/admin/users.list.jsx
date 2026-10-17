import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import UserService, { ROLES, ROLE_LABELS, CLUB_ROLES } from '../../services/user.service';
import AdminService from '../../services/admin.service';
import { announceAlertsChange } from './alert.events';
import DeletePopup from '../elements/delete.popup';
import UserEditDialog from './user.edit.dialog';
import { ClubCell, ClubFilter } from './club.filter';
import { AdminToolbar } from './admin.common';
import { useAuth } from '../../utils/auth.context';

const roleOptions = Object.values(ROLES).map(role => ({ label: ROLE_LABELS[role], value: role }));

const UsersList = () => {
    const toast = useRef(null);
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    // the clubs to show users of; none means all users, also those without a club
    const [clubs, setClubs] = useState([]);
    const [clubIds, setClubIds] = useState([]);

    useEffect(() => {
        AdminService.loadClubs().then(setClubs).catch(() => setClubs([]));
    }, []);

    const visibleUsers = useMemo(() => {
        const term = search.trim().toLowerCase();
        return users
            .filter(user => !clubIds.length || user.clubs.some(club => clubIds.includes(String(club.id))))
            .filter(user => !term || [user.firstname, user.lastname, user.email, `${user.firstname} ${user.lastname}`]
                .some(value => value?.toLowerCase().includes(term)));
    }, [users, search, clubIds]);
    const [editedId, setEditedId] = useState(null);

    const showError = (summary, error) =>
        toast.current.show({ severity: 'error', summary, detail: error.message, life: 4000 });

    const loadUsers = async () => {
        try {
            setUsers(await UserService.loadUsers());
        } catch (error) {
            showError('Load users', error);
        }
    };

    useEffect(() => {
        loadUsers();
        // eslint-disable-next-line
    }, []);

    const onRoleChange = async (user, role) => {
        try {
            await UserService.updateRole(user.id, role);
            await loadUsers();
        } catch (error) {
            showError('Change role', error);
        }
    };

    const onDelete = async (user) => {
        try {
            await UserService.deleteUser(user.id);
            await loadUsers();
            toast.current.show({ severity: 'success', summary: 'User deleted', detail: user.email, life: 3000 });
        } catch (error) {
            showError('Delete user', error);
        }
    };

    const onToggleBlocked = async (user) => {
        try {
            if (user.blockedAt) await AdminService.unblockUser(user.id);
            else await AdminService.blockUser(user.id, `Blocked by ${currentUser.email}`);
            await loadUsers();
            announceAlertsChange();
            toast.current.show({ severity: 'success', summary: user.blockedAt ? 'Account unblocked' : 'Account blocked', detail: user.email, life: 3000 });
        } catch (error) {
            showError(user.blockedAt ? 'Unblock account' : 'Block account', error);
        }
    };

    const isSelf = (user) => user.id === currentUser.id;

    const nameBody = (user) => (
        <span className="text-default fw-semibold">
            {user.firstname} {user.lastname}{isSelf(user) && <span className="text-faint fw-normal"> (you)</span>}
            {user.blockedAt && <Tag value="Blocked" severity="danger" className="ms-2" title={user.blockedReason} />}
        </span>
    );

    const roleBody = (user) => (
        <Dropdown
            value={user.role}
            options={roleOptions}
            onChange={(e) => onRoleChange(user, e.value)}
            disabled={isSelf(user)}
            aria-label={`Role of ${user.email}`}
        />
    );

    // as in the list of players across clubs: logo and name, with the role in the club
    const clubsBody = (user) => user.clubs.length
        ? (
            <div className="d-flex flex-column gap-1">
                {user.clubs.map(club => (
                    <ClubCell key={club.id} club={club} detail={club.role === CLUB_ROLES.ADMIN ? 'Admin' : 'Player'} />
                ))}
            </div>
        )
        : <span className="text-faint fs-7">No club</span>;

    const formatDate = (value) => value ? dayjs(value).format('DD.MM.YYYY') : 'Never';

    const actionBody = (user) => isSelf(user) ? null : (
        <div className="row-actions">
            <Button
                icon="pi pi-pencil"
                severity="secondary"
                aria-label={`Edit ${user.email}`}
                tooltip="Edit: name, email, new password or a password link"
                tooltipOptions={{ position: 'top' }}
                onClick={() => setEditedId(user.id)}
            />
            {user.role !== ROLES.GLOBAL_ADMIN &&
                <Button
                    icon={user.blockedAt ? 'pi pi-unlock' : 'pi pi-ban'}
                    severity={user.blockedAt ? 'secondary' : 'danger'}
                    aria-label={user.blockedAt ? `Unblock ${user.email}` : `Block ${user.email}`}
                    tooltip={user.blockedAt ? `Blocked: ${user.blockedReason || 'no reason given'}. Unblock` : 'Block: logs the account out and stops it from logging in'}
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => onToggleBlocked(user)}
                />
            }
            <DeletePopup
                data={user}
                header="Delete User"
                message={'user ' + user.email}
                handleDelete={onDelete}
            />
        </div>
    );

    return (
        <Panel header="Users">
            <AdminToolbar>
                <ClubFilter clubs={clubs} selectedIds={clubIds} onChange={setClubIds} optional />
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" aria-label="Search users by name or email" />
                </span>
                <span className="ms-auto text-faint fs-7">{visibleUsers.length} {visibleUsers.length === 1 ? 'user' : 'users'}</span>
            </AdminToolbar>

            {/* the look of the other admin lists: every user a card of its own */}
            <DataTable
                value={visibleUsers}
                dataKey="id"
                className="admin-table"
                sortField="lastname"
                sortOrder={1}
                paginator
                rows={15}
                rowsPerPageOptions={[15, 30, 60]}
                emptyMessage={users.length ? 'No users match these filters.' : 'No users found.'}
                responsiveLayout="scroll"
            >
                <Column field="lastname" header="Name" sortable body={nameBody} />
                <Column field="email" header="Email" sortable body={(user) => <span className="text-default fs-7">{user.email}</span>} />
                <Column header="Role" body={roleBody} />
                <Column header="Clubs" body={clubsBody} />
                <Column field="createdAt" header="Registered" sortable body={(user) => <span className="text-subtle fs-7 text-nowrap">{formatDate(user.createdAt)}</span>} />
                <Column field="lastLoginAt" header="Last login" sortable body={(user) => <span className="text-subtle fs-7 text-nowrap">{formatDate(user.lastLoginAt)}</span>} />
                <Column body={actionBody} />
            </DataTable>
            <UserEditDialog
                user={users.find(user => user.id === editedId) ?? null}
                onHide={() => setEditedId(null)}
                onSaved={async (summary, detail) => {
                    toast.current.show({ severity: 'success', summary, detail, life: 4000 });
                    await loadUsers();
                }}
                onError={showError}
            />
            <Toast ref={toast} position="bottom-right" />
        </Panel>
    );
};

export default UsersList;
