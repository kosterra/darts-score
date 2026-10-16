import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Navigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import ClubService from '../../services/club.service';
import ClubLogo from '../elements/club.logo';
import DeletePopup from '../elements/delete.popup';
import ClubAdminsDialog from '../clubs/club.admins.dialog';
import UsersList from '../admin/users.list';
import BannerSettings from './banner.settings';
import StatTile from '../stats/players/stat.tile';
import { useAuth } from '../../utils/auth.context';

const formatDate = (value) => value ? dayjs(value).format('DD.MM.YYYY') : '–';

const formatBytes = (bytes) => {
    if (bytes == null) return 'unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
    }
    return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`;
};

/**
 * For global admins: every club and account of the installation and its state.
 * Global admins look after the app here; playing happens in clubs.
 */
const AdministrationPage = () => {
    const toast = useRef(null);
    const { isGlobalAdmin, refreshClubs } = useAuth();
    const [overview, setOverview] = useState(null);
    const [adminsOfClubId, setAdminsOfClubId] = useState(null);

    const loadOverview = async () => {
        try {
            setOverview(await AdminService.loadOverview());
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: 'Load administration', detail: error.message, life: 4000 });
        }
    };

    useEffect(() => {
        if (isGlobalAdmin) loadOverview();
    }, [isGlobalAdmin]);

    if (!isGlobalAdmin) return <Navigate replace to="/" />;

    const onAdminsChange = async () => {
        await loadOverview();
        // taking over a club hands it from the global admin to its own admin
        await refreshClubs();
    };

    const onDeleteClub = async (club) => {
        try {
            await ClubService.deleteClub(club.id);
            toast.current.show({ severity: 'success', summary: 'Club deleted', detail: club.name, life: 3000 });
            await onAdminsChange();
        } catch (error) {
            toast.current.show({ severity: 'error', summary: 'Delete club', detail: error.message, life: 4000 });
        }
    };

    const clubBody = (club) => (
        <div className="d-flex align-items-center gap-3">
            <ClubLogo club={club} />
            <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                <span className="text-default fw-semibold text-break">{club.name}</span>
                <span className="text-faint fs-8">since {formatDate(club.createdAt)}</span>
            </div>
        </div>
    );

    const visibilityBody = (club) => <Tag value={club.isPublic ? 'Public' : 'Private'} severity={club.isPublic ? 'success' : 'secondary'} />;

    const adminsBody = (club) => club.needsAdmin
        ? <Tag value="Needs an admin" severity="warning" />
        : <span className="text-subtle fs-7">{club.admins.map(admin => `${admin.firstname} ${admin.lastname}`).join(', ')}</span>;

    const actionsBody = (club) => (
        <div className="d-flex justify-content-end gap-2">
            <Button
                icon="pi pi-users"
                size="small"
                severity="secondary"
                aria-label={`Admins of ${club.name}`}
                tooltip="Admins"
                tooltipOptions={{ position: 'top' }}
                onClick={() => setAdminsOfClubId(club.id)}
            />
            <DeletePopup
                data={club}
                header="Delete Club"
                message={`club ${club.name} with all its players, games and training entries`}
                handleDelete={onDeleteClub}
            />
        </div>
    );

    const system = overview?.system;
    const systemRows = system ? [
        ['App version', import.meta.env.VITE_APP_VERSION],
        ['Environment', system.environment],
        ['Node.js', system.nodeVersion],
        ['Mail', <Tag key="mail" value={system.mailEnabled ? 'Configured' : 'Not configured'} severity={system.mailEnabled ? 'success' : 'warning'} />],
        ['Database size', formatBytes(system.databaseSize)],
    ] : [];

    return (
        <div className="container-fluid p-4 d-flex flex-column gap-4">
            <div className="row g-3">
                {[['Clubs', 'clubs'], ['Users', 'users'], ['Players', 'players'], ['Games', 'games']].map(([label, key]) => (
                    <div key={key} className="col-6 col-lg-3">
                        <StatTile label={label} value={overview?.totals[key] ?? '–'} />
                    </div>
                ))}
            </div>

            <Panel header="Clubs">
                <DataTable value={overview?.clubs ?? []} dataKey="id" loading={!overview} emptyMessage="No clubs yet." responsiveLayout="scroll">
                    <Column header="Club" body={clubBody} />
                    <Column header="Visibility" body={visibilityBody} />
                    <Column header="Admins" body={adminsBody} />
                    <Column field="playerCount" header="Players" />
                    <Column field="gameCount" header="Games" />
                    <Column header="Last activity" body={(club) => formatDate(club.lastActivityAt)} />
                    <Column body={actionsBody} />
                </DataTable>
            </Panel>

            <UsersList />

            <BannerSettings onSaved={(detail) => toast.current.show({ severity: 'success', summary: 'Banner saved', detail, life: 3000 })} />

            {system &&
                <Panel header="System">
                    <div className="row g-4">
                        <div className="col-12 col-lg-6">
                            <dl className="m-0 d-grid gap-2" style={{ gridTemplateColumns: 'max-content 1fr', columnGap: '1.5rem' }}>
                                {systemRows.map(([label, value]) => (
                                    <div key={label} style={{ display: "contents" }}>
                                        <dt className="text-subtle fw-normal">{label}</dt>
                                        <dd className="text-default m-0">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                        <div className="col-12 col-lg-6">
                            <span className="text-subtle d-block mb-2">Database migrations</span>
                            {system.migrations.length
                                ? (
                                    <ul className="list-unstyled m-0 d-flex flex-column gap-1">
                                        {system.migrations.map(migration => (
                                            <li key={migration.id} className="d-flex justify-content-between gap-3">
                                                <span className="text-default"><i className="pi pi-check text-success me-2" aria-hidden="true" />{migration.id}</span>
                                                <span className="text-faint fs-7">{formatDate(migration.appliedAt)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )
                                : <span className="text-faint">None yet</span>
                            }
                        </div>
                    </div>
                </Panel>
            }

            <ClubAdminsDialog
                club={overview?.clubs.find(club => club.id === adminsOfClubId) ?? null}
                onHide={() => setAdminsOfClubId(null)}
                onChange={onAdminsChange}
            />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default AdministrationPage;
