import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import BannerSettings from './banner.settings';
import SessionSettings from './session.settings';
import MfaSettings from './mfa.settings';
import StartPageSettings from './start.page.settings';
import MailTemplates from './mail.templates';
import StatTile from '../stats/players/stat.tile';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';


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
 * For global admins: the totals, the banner and the state of the installation.
 * Clubs, users, alerts and the error log have their own pages under "Admin".
 */
const AdministrationPage = () => {
    const toast = useRef(null);
    const { isGlobalAdmin } = useAuth();
    const [overview, setOverview] = useState(null);

    const loadOverview = async () => {
        try {
            setOverview(await AdminService.loadOverview());
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: t('Load administration'), detail: error.message, life: 4000 });
        }
    };

    useEffect(() => {
        if (isGlobalAdmin) loadOverview();
    }, [isGlobalAdmin]);

    if (!isGlobalAdmin) return <Navigate replace to="/" />;

    const system = overview?.system;
    const systemRows = system ? [
        [t('App version'), import.meta.env.VITE_APP_VERSION],
        [t('Environment'), system.environment],
        ['Node.js', system.nodeVersion],
        [t('Mail'), <Tag key="mail" value={system.mailEnabled ? t('Configured') : t('Not configured')} severity={system.mailEnabled ? 'success' : 'warning'} />],
        [t('Database size'), formatBytes(system.databaseSize)],
    ] : [];

    return (
        <div className="container-fluid p-4 d-flex flex-column gap-4">
            <div className="row g-3">
                {[[t('Clubs'), 'clubs'], [t('Users'), 'users'], [t('Players'), 'players'], [t('Games'), 'games']].map(([label, key]) => (
                    <div key={key} className="col-6 col-lg-3">
                        <StatTile label={label} value={overview?.totals[key] ?? '–'} />
                    </div>
                ))}
            </div>

            <BannerSettings onSaved={(detail) => toast.current.show({ severity: 'success', summary: t('Banner saved'), detail, life: 3000 })} />

            <StartPageSettings onSaved={(detail) => toast.current.show({ severity: 'success', summary: t('Start page'), detail, life: 3000 })} />

            <MailTemplates onSaved={(detail) => toast.current.show({ severity: 'success', summary: t('Mail templates'), detail, life: 3500 })} />

            <SessionSettings onSaved={(detail) => toast.current.show({ severity: 'success', summary: t('Session saved'), detail, life: 3000 })} />

            <MfaSettings onSaved={(detail) => toast.current.show({ severity: 'success', summary: t('Two-step login'), detail, life: 3000 })} />

            {system &&
                <Panel header={t('System')}>
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
                            <span className="text-subtle d-block mb-2">{t('Database migrations')}</span>
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
                                : <span className="text-faint">{t('None yet')}</span>
                            }
                        </div>
                    </div>
                </Panel>
            }

            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default AdministrationPage;
