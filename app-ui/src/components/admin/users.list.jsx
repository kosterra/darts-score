import { useEffect, useMemo, useRef, useState } from 'react';
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
import UserEditor from './user.editor';
import UsersOverview from './users.overview';
import { ClubCell, ClubFilter } from './club.filter';
import { AdminToolbar } from './admin.common';
import { TABLE_DEFAULTS, tableState, useUrlState } from '../../utils/use.url.state';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';

const roleOptions = Object.values(ROLES).map(role => ({ label: ROLE_LABELS[role], value: role }));

const UsersList = () => {
    const toast = useRef(null);
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    // the search, the clubs, page and order live in the address
    const [view, setView] = useUrlState({ search: '', clubs: '', ...TABLE_DEFAULTS });
    const { search } = view;
    const setSearch = (value) => setView({ search: value, page: 1 });
    // the clubs to show users of; none means all users, also those without a club
    const [clubs, setClubs] = useState([]);
    const clubIds = useMemo(() => view.clubs ? view.clubs.split(',') : [], [view.clubs]);
    const setClubIds = (ids) => setView({ clubs: ids.join(','), page: 1 });

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
            showError(t('Load users'), error);
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
            showError(t('Change role'), error);
        }
    };

    const onDelete = async (user) => {
        try {
            await UserService.deleteUser(user.id);
            await loadUsers();
            toast.current.show({ severity: 'success', summary: t('User deleted'), detail: user.email, life: 3000 });
        } catch (error) {
            showError(t('Delete user'), error);
        }
    };

    const onToggleBlocked = async (user) => {
        try {
            if (user.blockedAt) await AdminService.unblockUser(user.id);
            else await AdminService.blockUser(user.id, t('Blocked by {{email}}', { email: currentUser.email }));
            await loadUsers();
            announceAlertsChange();
            toast.current.show({ severity: 'success', summary: user.blockedAt ? t('Account unblocked') : t('Account blocked'), detail: user.email, life: 3000 });
        } catch (error) {
            showError(user.blockedAt ? t('Unblock account') : t('Block account'), error);
        }
    };

    const isSelf = (user) => user.id === currentUser.id;

    const nameBody = (user) => (
        <span className="text-default fw-semibold">
            {user.firstname} {user.lastname}{isSelf(user) && <span className="text-faint fw-normal">{' '}{t('(you)')}</span>}
            {user.blockedAt && <Tag value="Blocked" severity="danger" className="ms-2" title={user.blockedReason} />}
        </span>
    );

    const roleBody = (user) => (
        <Dropdown
            value={user.role}
            options={roleOptions}
            onChange={(e) => onRoleChange(user, e.value)}
            disabled={isSelf(user)}
            aria-label={t('Role of {{email}}', { email: user.email })}
        />
    );

    // as in the list of players across clubs: logo and name, with the role in the club
    const clubsBody = (user) => user.clubs.length
        ? (
            <div className="d-flex flex-column gap-1">
                {user.clubs.map(club => (
                    <ClubCell key={club.id} club={club} detail={club.role === CLUB_ROLES.ADMIN ? t('Admin') : t('Player')} />
                ))}
            </div>
        )
        : <span className="text-faint fs-7">{t('No club')}</span>;

    const dateOrNever = (value) => value ? formatDate(value) : t('Never');

    const actionBody = (user) => isSelf(user) ? null : (
        <div className="row-actions">
            <Button
                icon="pi pi-pencil"
                severity="secondary"
                aria-label={t('Edit {{email}}', { email: user.email })}
                tooltip={t('Edit: name, email, new password or a password link')}
                tooltipOptions={{ position: 'top' }}
                onClick={() => setEditedId(editedId === user.id ? null : user.id)}
            />
            {user.role !== ROLES.GLOBAL_ADMIN &&
                <Button
                    icon={user.blockedAt ? 'pi pi-unlock' : 'pi pi-ban'}
                    severity={user.blockedAt ? 'secondary' : 'danger'}
                    aria-label={user.blockedAt ? t('Unblock {{email}}', { email: user.email }) : t('Block {{email}}', { email: user.email })}
                    tooltip={user.blockedAt ? t('Blocked: {{value}}. Unblock', { value: user.blockedReason || 'no reason given' }) : t('Block: logs the account out and stops it from logging in')}
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => onToggleBlocked(user)}
                />
            }
            <DeletePopup
                data={user}
                header={t('Delete User')}
                message={'user ' + user.email}
                handleDelete={onDelete}
            />
        </div>
    );

    return (
        <>
        {/* the users at a glance; an account picked there shows in the list */}
        <UsersOverview users={users} onPick={(user) => setView({ search: user.email, clubs: '', page: 1 })} />
        <Panel id="admin-list" header={t('Users')}>
            <AdminToolbar>
                <ClubFilter clubs={clubs} selectedIds={clubIds} onChange={setClubIds} optional />
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search name or email')} aria-label={t('Search users by name or email')} />
                </span>
                <span className="ms-auto text-faint fs-7">{visibleUsers.length} {visibleUsers.length === 1 ? t('user') : t('users')}</span>
            </AdminToolbar>

            {/* the look of the other admin lists: every user a card of its own */}
            <DataTable
                value={visibleUsers}
                dataKey="id"
                // a user is edited under their row
                expandedRows={editedId ? { [editedId]: true } : null}
                rowExpansionTemplate={(user) => (
                    <UserEditor
                        user={user}
                        onHide={() => setEditedId(null)}
                        onSaved={async (summary, detail) => {
                            toast.current.show({ severity: 'success', summary, detail, life: 4000 });
                            await loadUsers();
                        }}
                        onError={showError}
                    />
                )}
                className="admin-table"
                {...tableState(view, setView, { sortField: 'lastname', sortOrder: 1 })}
                emptyMessage={users.length ? t('No users match these filters.') : t('No users found.')}
                responsiveLayout="scroll"
            >
                <Column field="lastname" header={t('Name')} sortable body={nameBody} />
                <Column field="email" header={t('Email')} sortable body={(user) => <span className="text-default fs-7">{user.email}</span>} />
                <Column header={t('Role')} body={roleBody} />
                <Column header={t('Clubs')} body={clubsBody} />
                <Column field="createdAt" header={t('Registered')} sortable body={(user) => <span className="text-subtle fs-7 text-nowrap">{dateOrNever(user.createdAt)}</span>} />
                <Column field="lastLoginAt" header={t('Last login')} sortable body={(user) => <span className="text-subtle fs-7 text-nowrap">{dateOrNever(user.lastLoginAt)}</span>} />
                <Column body={actionBody} />
            </DataTable>
            <Toast ref={toast} position="bottom-right" />
        </Panel>
        </>
    );
};

export default UsersList;
