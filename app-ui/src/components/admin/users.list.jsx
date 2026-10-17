import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import UserService, { ROLES, ROLE_LABELS, CLUB_ROLES } from '../../services/user.service';
import AdminService from '../../services/admin.service';
import { announceAlertsChange } from './alert.events';
import DeletePopup from '../elements/delete.popup';
import { useAuth } from '../../utils/auth.context';

const roleOptions = Object.values(ROLES).map(role => ({ label: ROLE_LABELS[role], value: role }));

const UsersList = () => {
    const toast = useRef(null);
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);

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

    const clubsBody = (user) => user.clubs.length
        ? (
            <div className="d-flex flex-wrap gap-1">
                {user.clubs.map(club => (
                    <Tag key={club.id} value={`${club.name} · ${club.role === CLUB_ROLES.ADMIN ? 'Admin' : 'Player'}`} severity={club.role === CLUB_ROLES.ADMIN ? 'success' : 'secondary'} />
                ))}
            </div>
        )
        : <span className="text-faint fs-7">No club</span>;

    const formatDate = (value) => value ? dayjs(value).format('DD.MM.YYYY') : 'Never';

    const actionBody = (user) => isSelf(user) ? null : (
        <div className="row-actions">
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
            <DataTable value={users} dataKey="id" emptyMessage="No users found." responsiveLayout="scroll">
                <Column header="Name" body={nameBody} />
                <Column field="email" header="Email" />
                <Column header="Role" body={roleBody} />
                <Column header="Clubs" body={clubsBody} />
                <Column header="Registered" body={(user) => formatDate(user.createdAt)} />
                <Column header="Last login" body={(user) => formatDate(user.lastLoginAt)} />
                <Column body={actionBody} />
            </DataTable>
            <Toast ref={toast} position="bottom-right" />
        </Panel>
    );
};

export default UsersList;
