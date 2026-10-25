import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';

import StatsService from '../../services/stats.service';
import { DashboardSkeleton } from '../elements/skeletons';
import { useAuth } from '../../utils/auth.context';
import useGamePreferences from '../../utils/use.game.preferences';
import { useMyPlayers, playerInClub } from '../../utils/use.my.players';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { DASHBOARD_WIDGETS, PERSONAL_DEFAULT_LAYOUT, resolveLayout, toLayout } from './dashboard.widgets';
import DashboardEditor from './dashboard.editor';
import DashboardWidget from './dashboard.widget';
import { t } from '../../utils/i18n';

// a greeting by the time of day
const greeting = (name, hour = new Date().getHours()) => {
    if (hour < 5 || hour >= 22) return t('Good evening, {{name}}', { name });
    if (hour < 12) return t('Good morning, {{name}}', { name });
    if (hour < 18) return t('Hello, {{name}}', { name });
    return t('Good evening, {{name}}', { name });
};

/**
 * One's own Dashboard: what waits (tournaments, games left running,
 * requests), the favourites to start again with one tap, oneself, and a look
 * at the club. Arranged by each user for themselves, with their account on
 * every device; the club itself is on My club.
 */
const Dashboard = () => {
    const toast = useRef(null);
    const { activeClub, user, isGlobalAdmin } = useAuth();
    // who the user plays as in the club: their picture and nickname on top
    const me = playerInClub(useMyPlayers(!isGlobalAdmin), activeClub?.id);
    const [preferences, savePreferences] = useGamePreferences();
    const [stats, setStats] = useState(null);
    const [failed, setFailed] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        StatsService.loadClubStats().then(setStats).catch((error) => {
            console.error('Failed to load the dashboard', error);
            setFailed(true);
        });
    }, [activeClub?.id]);

    const players = useMemo(() => new Map((stats?.players ?? []).map(player => [player.id, player])), [stats]);
    const shameBadges = activeClub?.shameBadges !== false;
    const stored = preferences.dashboard;
    const widgets = resolveLayout(stored, { shameBadges, fallback: PERSONAL_DEFAULT_LAYOUT });

    if (failed) return <div className="container-fluid p-4 text-subtle">{t('The dashboard could not be loaded. Please reload the page.')}</div>;
    if (!stats) return <DashboardSkeleton club={activeClub} widgets={widgets} />;

    const save = async (layout, summary) => {
        setSaving(true);
        try {
            await savePreferences({ dashboard: layout });
            setEditing(false);
            toast.current?.show({ severity: 'success', summary, life: 3000 });
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: t('Dashboard'), detail: error.message, life: 4000 });
        } finally {
            setSaving(false);
        }
    };
    const renderWidget = (widget) => <DashboardWidget widget={widget} stats={stats} players={players} />;

    return (
        <div className="container-fluid p-4 border-0">
            <header className="dashboard-header hero-header rounded-2 p-4 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div className="d-flex align-items-center gap-3 min-w-0">
                    {me &&
                        <Link to={`/players/${me.id}`} className="dashboard-header-avatar" aria-label={t('My statistics')}>
                            <Avatar
                                image={me.profileImg ? resolvePlayerImg(me.profileImg) : undefined}
                                label={me.profileImg ? undefined : resolvePlayerInitials(me.firstname, me.lastname)}
                                shape="circle"
                                className="avatar-md bg-surface-high"
                            />
                        </Link>}
                    <div className="d-flex flex-column gap-1 min-w-0">
                        <h1 className="fs-2 fw-semibold text-default m-0 text-break">{greeting(user?.firstname ?? '')}</h1>
                        <span className="text-subtle">
                            {me?.nickname && <><span className="dashboard-header-nickname">{me.nickname}</span>{' · '}</>}
                            {t('Your dashboard in {{club}}', { club: activeClub?.name ?? '' })}{' · '}<Link to="/club">{t('My club')}</Link>
                        </span>
                    </div>
                </div>
                {!editing && <Button label={t('Arrange')} icon="pi pi-th-large" size="small" severity="secondary" onClick={() => { setDraft(toLayout(stored, PERSONAL_DEFAULT_LAYOUT).map(({ id, size }) => ({ id, size }))); setEditing(true); }} />}
            </header>

            {editing && (
                <div className="dashboard-edit-bar" role="region" aria-label={t('Arranging your dashboard')}>
                    <div className="d-flex flex-column gap-1 min-w-0">
                        <span className="text-default fw-semibold">{t('Arranging your dashboard')}</span>
                        <span className="text-faint fs-8">{t('Only you see it, on every device. Drag the widgets by their bar, choose their width, remove them or add more below.')}</span>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <Button type="button" label={t('Default widgets')} icon="pi pi-replay" size="small" severity="secondary" text onClick={() => setDraft(PERSONAL_DEFAULT_LAYOUT)} disabled={saving} />
                        <Button type="button" label={t('Cancel')} size="small" severity="secondary" onClick={() => setEditing(false)} disabled={saving} />
                        <Button type="button" label={t('Save')} icon="pi pi-check" size="small" onClick={() => save(draft, t('Your dashboard is saved'))} loading={saving} disabled={!draft.length} />
                    </div>
                </div>
            )}

            {editing
                ? <DashboardEditor layout={draft} onChange={setDraft} renderWidget={renderWidget} shameBadges={shameBadges} pool={DASHBOARD_WIDGETS} fallback={PERSONAL_DEFAULT_LAYOUT} />
                : (
                    <div className="row g-4">
                        {widgets.map(widget => (
                            <div className={widget.cols} key={widget.id}>
                                {renderWidget(widget)}
                            </div>
                        ))}
                    </div>
                )}
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default Dashboard;
