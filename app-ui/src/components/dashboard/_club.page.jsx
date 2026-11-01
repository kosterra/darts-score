import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

import StatsService from '../../services/stats.service';
import { DashboardSkeleton } from '../elements/skeletons';
import SaveStatus from '../elements/save.status';
import { useAuth } from '../../utils/auth.context';
import { useMyPlayers, playerInClub } from '../../utils/use.my.players';
import useAutoSave from '../../utils/use.auto.save';
import ClubService from '../../services/club.service';
import { DEFAULT_LAYOUT, clubLayout as layoutOfClub, resolveLayout, toLayout } from './dashboard.widgets';
import DashboardEditor from './dashboard.editor';
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
 * narrower, removed and added, each saved as you go.
 */
const ClubPage = () => {
    const { activeClub, isClubAdmin, isGlobalAdmin, refreshClubs } = useAuth();
    const myPlayers = useMyPlayers(!isGlobalAdmin);
    // known not to play in the club (not while still loading)
    const playsHere = myPlayers === null || Boolean(playerInClub(myPlayers, activeClub?.id));

    const [stats, setStats] = useState(null);
    const [failed, setFailed] = useState(false);
    // while arranging: what (mine or the club's) and the layout so far
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState([]);
    // the layout as last arranged, shown at once while it is saved
    const [arranged, setArranged] = useState(null);
    // arranging saves as you go, a moment after the last move (drags come in bursts); the club goes
    // with the layout (another club chosen meanwhile keeps its own), its name as the API needs it
    const layoutSave = useAutoSave(async ({ club, layout }) => {
        await ClubService.updateClub(club.id, { name: club.name, dashboardLayout: layout });
        await refreshClubs();
    }, { delay: 500, valid: ({ layout }) => layout.length > 0 });
    // another club: its own layout
    useEffect(() => {
        setArranged(null);
        setEditing(null);
    }, [activeClub?.id]);

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
    const clubLayout = arranged?.length ? arranged : layoutOfClub(activeClub);
    // You shows nothing to someone who does not play in the club: no hole for it
    const widgets = resolveLayout(clubLayout, { shameBadges, without: playsHere ? [] : ['me'] });

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

    // each move, width, widget removed or added: shown at once and saved
    const arrange = (layout, options) => {
        setDraft(layout);
        setArranged(layout);
        layoutSave.change({ club: { id: activeClub.id, name: activeClub.name }, layout }, options);
    };
    // done: what still waits is saved now
    const done = () => {
        layoutSave.flush();
        setEditing(null);
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
                            <SaveStatus {...layoutSave} className="ms-2" />
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
                        <span className="text-faint fs-8">{t('Everyone in the club sees it, and it is saved as you go. Drag the widgets by their bar, choose their width, remove them or add more below.')}</span>
                        {!draft.length && <span className="text-danger fs-8">{t('Add at least one widget.')}</span>}
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <SaveStatus {...layoutSave} />
                        <Button type="button" label={t('Default widgets')} icon="pi pi-replay" size="small" severity="secondary" text onClick={() => arrange(DEFAULT_LAYOUT, { now: true })} />
                        <Button type="button" label={t('Done')} icon="pi pi-check" size="small" onClick={done} />
                    </div>
                </div>
            )}

            {editing
                ? <DashboardEditor layout={draft} onChange={arrange} renderWidget={renderWidget} shameBadges={shameBadges} />
                : (
                    <div className="row g-4">
                        {widgets.map(widget => (
                            <div className={widget.cols} key={widget.id}>
                                {renderWidget(widget)}
                            </div>
                        ))}
                    </div>
                )
            }
        </div>
    );
};

export default ClubPage;
