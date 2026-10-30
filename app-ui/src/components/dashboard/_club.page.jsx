import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import StatsService from '../../services/stats.service';
import { DashboardSkeleton } from '../elements/skeletons';
import { useAuth } from '../../utils/auth.context';
import ClubService from '../../services/club.service';
import { DEFAULT_LAYOUT, clubLayout as layoutOfClub, resolveLayout, toLayout } from './dashboard.widgets';
import DashboardEditor from './dashboard.editor';
import { DashboardCell, DashboardGrid } from './dashboard.grid';
import DashboardWidget from './dashboard.widget';
import ClubLogo from '../elements/club.logo';
import TournamentBanner from '../tournaments/tournament.banner';
import { t } from '../../utils/i18n';
import { Link } from 'react-router-dom';
import ClubMedal from '../badges/club.medal';
import { formatDate } from '../../utils/dates';


/**
 * My club: the club at a glance, its tournaments, and the widgets its admins
 * arranged for everyone (each member arranges their own Dashboard). Arrange
 * works right on the page: widgets dragged into place, made wider or
 * narrower, removed and added.
 */
const ClubPage = () => {
    const toast = useRef(null);
    const { activeClub, isClubAdmin, refreshClubs } = useAuth();

    const [stats, setStats] = useState(null);
    const [failed, setFailed] = useState(false);
    // while arranging: what (mine or the club's) and the layout so far
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                setStats(await StatsService.loadClubStats());
            } catch (error) {
                console.error('Failed to load the club dashboard', error);
                setFailed(true);
            }
        };
        load();
    }, []);

    const players = useMemo(() => new Map((stats?.players ?? []).map(player => [player.id, player])), [stats]);
    const shameBadges = activeClub?.shameBadges !== false;
    const clubLayout = layoutOfClub(activeClub);
    const widgets = resolveLayout(clubLayout, { shameBadges });

    if (failed) {
        return <div className="container-fluid p-4 text-subtle">{t('The dashboard could not be loaded. Please reload the page.')}</div>;
    }
    if (!stats) return <DashboardSkeleton club={activeClub} widgets={widgets} />;

    const { club, totals } = stats;
    const facts = [
        [t('Club since'), formatDate(club.createdAt)],
        [t('Players'), club.playerCount],
        [t('Games played'), totals.gamesPlayed],
        [t('Last game'), formatDate(totals.lastGameAt)],
        // as the badges in a player's header: how many of all, to the club's badges
        ...(club.badgeTotal ? [[t('Club badges'), <Link key="badges" to="/badges#club">{t('{{count}} of {{total}}', { count: club.badgeCount, total: club.badgeTotal })}</Link>]] : []),
    ];

    const startEditing = () => {
        setEditing(true);
        setDraft(toLayout(clubLayout).map(({ id, size }) => ({ id, size })));
    };

    const save = async () => {
        setSaving(true);
        try {
            await ClubService.updateClub(activeClub.id, { name: activeClub.name, dashboardLayout: draft });
            await refreshClubs();
            setEditing(null);
            toast.current?.show({ severity: 'success', summary: t('My club is arranged for everyone'), life: 3000 });
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: t('My club'), detail: error.message, life: 4000 });
        } finally {
            setSaving(false);
        }
    };

    const renderWidget = (widget) => <DashboardWidget widget={widget} stats={stats} players={players} />;

    return (
        <div className="container-fluid p-4 border-0">
            <header className="dashboard-header hero-header club-header rounded-2 p-4 mb-4 d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div className="d-flex flex-wrap align-items-start gap-4 min-w-0">
                <ClubLogo club={club} size="lg" />
                <div className="d-flex flex-column gap-3" style={{ minWidth: 0, flex: '1 1 18rem' }}>
                    <div className="d-flex flex-wrap align-items-center gap-3">
                        <h1 className="fs-2 fw-semibold text-default m-0 text-break">{club.name}</h1>
                        <Tag value={club.isPublic ? t('Public') : t('Private')} severity="secondary" className="club-header-visibility" />
                    </div>
                    {club.description && <p className="text-subtle m-0" style={{ maxWidth: '60ch' }}>{club.description}</p>}
                    <dl className="hero-facts d-flex flex-wrap column-gap-5 row-gap-2 m-0">
                        {facts.map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-faint fs-8 fw-normal">{label}</dt>
                                <dd className="text-default fw-semibold m-0 tabular-nums">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    {/* the look back at a year: the figures and awards of the club */}
                    <Link to="/club/year" className="p-button p-button-sm p-button-secondary text-decoration-none align-self-start">
                        <i className="pi pi-star me-2" aria-hidden="true" />{t('The club\'s year')}
                    </Link>
                </div>
                </div>
                {/* the club's latest badges, as in a player's header */}
                {club.latestBadges?.length > 0 &&
                    <div className="d-flex flex-column gap-2 ms-md-auto">
                        <span className="text-faint fs-8">{t('Latest club badges')}</span>
                        <Link to="/badges#club" className="d-flex gap-2" aria-label={t('All club badges')}>
                            {club.latestBadges.map(badge => <ClubMedal key={badge.id} badge={badge} size="sm" />)}
                        </Link>
                    </div>}
                {/* the club's admins arrange the page for everyone */}
                {!editing && isClubAdmin && (
                    <div className="w-100 filter-panel-bar">
                        <span className="filter-panel-summary">
                            <span className="filter-chip">{t('Arranged by the club\'s admins')}</span>
                        </span>
                        <Button label={t('Arrange')} icon="pi pi-th-large" size="small" severity="secondary" onClick={startEditing} />
                    </div>
                )}
            </header>

            {/* the club's tournaments, from the registration to a week after the final */}
            {!editing && <TournamentBanner />}

            {editing && (
                <div className="dashboard-edit-bar" role="region" aria-label={t('Arranging My club')}>
                    <div className="d-flex flex-column gap-1 min-w-0">
                        <span className="text-default fw-semibold">{t('Arranging My club')}</span>
                        <span className="text-faint fs-8">{t('Everyone in the club sees it. Drag the widgets by their bar, choose their width, remove them or add more below.')}</span>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <Button type="button" label={t('Default widgets')} icon="pi pi-replay" size="small" severity="secondary" text onClick={() => setDraft(DEFAULT_LAYOUT)} disabled={saving} />
                        <Button type="button" label={t('Cancel')} size="small" severity="secondary" onClick={() => setEditing(null)} disabled={saving} />
                        <Button type="button" label={t('Save')} icon="pi pi-check" size="small" onClick={save} loading={saving} disabled={!draft.length} />
                    </div>
                </div>
            )}

            {editing
                ? <DashboardEditor layout={draft} onChange={setDraft} renderWidget={renderWidget} shameBadges={shameBadges} />
                : (
                    <DashboardGrid>
                        {widgets.map(widget => (
                            <DashboardCell widget={widget} key={widget.id}>
                                {renderWidget(widget)}
                            </DashboardCell>
                        ))}
                    </DashboardGrid>
                )
            }
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ClubPage;
