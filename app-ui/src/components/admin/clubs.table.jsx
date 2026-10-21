import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import ClubService from '../../services/club.service';
import ClubLogo from '../elements/club.logo';
import DeletePopup from '../elements/delete.popup';
import ClubAdminsDialog from '../clubs/club.admins.dialog';
import { AdminToolbar } from './admin.common';
import { formatDateTime } from './admin.format';
import { TABLE_DEFAULTS, tableState, useUrlState } from '../../utils/use.url.state';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';

const formatDate = (value) => value ? formatDateTime(value).slice(0, 10) : '–';

const STATE_OPTIONS = [
    { label: t('All'), value: 'all' },
    { label: t('Public'), value: 'public' },
    { label: t('Needs an admin'), value: 'needsAdmin' },
];

/**
 * For global admins: every club of the installation, its admins and activity.
 */
const ClubsTable = () => {
    const toast = useRef(null);
    const { refreshClubs } = useAuth();
    const [clubs, setClubs] = useState(null);
    // the search, filter, page and order live in the address
    const [view, setView] = useUrlState({ search: '', state: 'all', ...TABLE_DEFAULTS });
    const { search, state } = view;
    const setSearch = (value) => setView({ search: value, page: 1 });
    const setState = (value) => setView({ state: value, page: 1 });
    const [adminsOfClubId, setAdminsOfClubId] = useState(null);

    const loadClubs = async () => {
        try {
            setClubs((await AdminService.loadOverview()).clubs);
        } catch (error) {
            setClubs([]);
            toast.current?.show({ severity: 'error', summary: t('Load clubs'), detail: error.message, life: 4000 });
        }
    };

    useEffect(() => {
        loadClubs();
    }, []);

    const visibleClubs = useMemo(() => {
        const term = search.trim().toLowerCase();
        return (clubs ?? [])
            .filter(club => state === 'all' || (state === 'public' ? club.isPublic : club.needsAdmin))
            .filter(club => !term || club.name.toLowerCase().includes(term)
                || club.admins.some(admin => `${admin.firstname} ${admin.lastname} ${admin.email}`.toLowerCase().includes(term)));
    }, [clubs, search, state]);

    const onAdminsChange = async () => {
        await loadClubs();
        // taking over a club hands it from the global admin to its own admin
        await refreshClubs();
    };

    const onDeleteClub = async (club) => {
        try {
            await ClubService.deleteClub(club.id);
            toast.current.show({ severity: 'success', summary: t('Club deleted'), detail: club.name, life: 3000 });
            await onAdminsChange();
        } catch (error) {
            toast.current.show({ severity: 'error', summary: t('Delete club'), detail: error.message, life: 4000 });
        }
    };

    const clubBody = (club) => (
        <div className="d-flex align-items-center gap-3">
            <ClubLogo club={club} />
            <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                <span className="text-default fw-semibold text-break">{club.name}</span>
                <span className="text-faint fs-8">{t('since')}{' '}{formatDate(club.createdAt)}</span>
            </div>
        </div>
    );

    const visibilityBody = (club) => <Tag value={club.isPublic ? t('Public') : t('Private')} severity={club.isPublic ? 'success' : 'secondary'} />;

    const adminsBody = (club) => club.needsAdmin
        ? <Tag value={t('Needs an admin')} severity="warning" />
        : <span className="text-subtle fs-7">{club.admins.map(admin => `${admin.firstname} ${admin.lastname}`).join(', ')}</span>;

    const actionsBody = (club) => (
        <div className="row-actions">
            <Button
                icon="pi pi-users"
                severity="secondary"
                aria-label={t('Admins of {{name}}', { name: club.name })}
                tooltip={t('Admins')}
                tooltipOptions={{ position: 'top' }}
                onClick={() => setAdminsOfClubId(club.id)}
            />
            <DeletePopup
                data={club}
                header={t('Delete Club')}
                message={t('club {{name}} with all its players, games and training entries', { name: club.name })}
                handleDelete={onDeleteClub}
            />
        </div>
    );

    return (
        <Panel header={t('Clubs')}>
            <AdminToolbar>
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search clubs or admins')} aria-label={t('Search clubs or admins')} />
                </span>
                <SelectButton value={state} options={STATE_OPTIONS} onChange={(e) => e.value && setState(e.value)} aria-label={t('Show clubs')} />
                <span className="ms-auto text-faint fs-7">{visibleClubs.length} {visibleClubs.length === 1 ? t('club') : t('clubs')}</span>
            </AdminToolbar>

            <DataTable
                value={visibleClubs}
                dataKey="id"
                className="admin-table"
                loading={clubs === null}
                {...tableState(view, setView, { sortField: 'name', sortOrder: 1 })}
                emptyMessage={clubs?.length ? t('No clubs match these filters.') : t('No clubs yet.')}
                responsiveLayout="scroll"
            >
                <Column field="name" header={t('Club')} sortable body={clubBody} style={{ minWidth: '14rem' }} />
                <Column header={t('Visibility')} body={visibilityBody} />
                <Column header={t('Admins')} body={adminsBody} />
                <Column field="playerCount" header={t('Players')} sortable />
                <Column field="gameCount" header={t('Games')} sortable />
                <Column field="lastActivityAt" header={t('Last activity')} sortable body={(club) => <span className="text-subtle fs-7 text-nowrap">{formatDate(club.lastActivityAt)}</span>} />
                <Column body={actionsBody} />
            </DataTable>

            <ClubAdminsDialog
                club={clubs?.find(club => club.id === adminsOfClubId) ?? null}
                onHide={() => setAdminsOfClubId(null)}
                onChange={onAdminsChange}
            />
            <Toast ref={toast} position="bottom-right" />
        </Panel>
    );
};

export default ClubsTable;
