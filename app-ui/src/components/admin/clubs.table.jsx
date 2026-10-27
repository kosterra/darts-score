import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import ClubService from '../../services/club.service';
import ClubLogo from '../elements/club.logo';
import DeletePopup from '../elements/delete.popup';
import ClubAdminsEditor from '../clubs/club.admins.editor';
import { AdminToolbar } from './admin.common';
import ClubsOverview from './clubs.overview';
import { formatDate } from '../../utils/dates';
import { TABLE_DEFAULTS, tableState, useUrlState } from '../../utils/use.url.state';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import CountryFlag from '../elements/country.flag';
import { TableLoading } from '../elements/skeletons';
import FilterPills from '../elements/filter.pills';

const clubDate = (value) => formatDate(value);

const STATE_OPTIONS = [
    { label: t('All'), value: 'all' },
    { label: t('Public'), value: 'public', icon: 'pi pi-globe' },
    { label: t('Needs an admin'), value: 'needsAdmin', icon: 'pi pi-exclamation-circle' },
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
            <div className="d-flex flex-column min-w-0">
                <span className="text-default fw-semibold text-break">{club.name}{' '}<CountryFlag code={club.country} /></span>
                <span className="text-faint fs-8">{t('since')}{' '}{clubDate(club.createdAt)}</span>
            </div>
        </div>
    );

    const visibilityBody = (club) => <Tag value={club.isPublic ? t('Public') : t('Private')} severity="secondary" />;

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
                onClick={() => setAdminsOfClubId(adminsOfClubId === club.id ? null : club.id)}
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
        <>
        {/* the clubs at a glance; a club picked there shows in the list */}
        <ClubsOverview clubs={clubs} onPick={(club) => setView({ search: club.name, state: 'all', page: 1 })} />
        <Panel id="admin-list" header={t('Clubs')}>
            <AdminToolbar actions={<span className="text-faint fs-7">{visibleClubs.length} {visibleClubs.length === 1 ? t('club') : t('clubs')}</span>} changed={[search, state !== 'all'].filter(Boolean).length}>
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search clubs or admins')} aria-label={t('Search clubs or admins')} />
                </span>
                <FilterPills value={state} options={STATE_OPTIONS} onChange={setState} ariaLabel={t('Show clubs')} />
            </AdminToolbar>

            <DataTable
                value={visibleClubs}
                dataKey="id"
                // the admins of a club open under its row
                expandedRows={adminsOfClubId ? { [adminsOfClubId]: true } : null}
                rowExpansionTemplate={(club) => <ClubAdminsEditor club={club} onHide={() => setAdminsOfClubId(null)} onChange={onAdminsChange} />}
                className="admin-table"
                {...tableState(view, setView, { sortField: 'name', sortOrder: 1 })}
                emptyMessage={clubs === null ? <TableLoading /> : clubs?.length ? t('No clubs match these filters.') : t('No clubs yet.')}
                responsiveLayout="stack" breakpoint="640px"
            >
                <Column bodyClassName="no-label" field="name" header={t('Club')} sortable body={clubBody} style={{ minWidth: '14rem' }} />
                <Column header={t('Visibility')} body={visibilityBody} />
                <Column header={t('Admins')} body={adminsBody} />
                <Column bodyClassName="no-label" field="playerCount" header={t('Players')} sortable />
                <Column field="gameCount" header={t('Games')} sortable />
                <Column field="lastActivityAt" header={t('Last activity')} sortable body={(club) => <span className="text-subtle fs-7 text-nowrap">{clubDate(club.lastActivityAt)}</span>} />
                <Column body={actionsBody} />
            </DataTable>

            <Toast ref={toast} position="bottom-right" />
        </Panel>
        </>
    );
};

export default ClubsTable;
