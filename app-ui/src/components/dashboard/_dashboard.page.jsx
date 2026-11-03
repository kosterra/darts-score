import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';

import StatsService from '../../services/stats.service';
import { DashboardSkeleton } from '../elements/skeletons';
import SaveStatus from '../elements/save.status';
import { useAuth } from '../../utils/auth.context';
import useGamePreferences, { accountSaver } from '../../utils/use.game.preferences';
import useAutoSave from '../../utils/use.auto.save';
import { useMyPlayers, playerInClub } from '../../utils/use.my.players';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { DASHBOARD_WIDGETS, PERSONAL_DEFAULT_LAYOUT, resolveLayout, toLayout } from './dashboard.widgets';
import DashboardEditor from './dashboard.editor';
import DashboardWidget from './dashboard.widget';
import { t } from '../../utils/i18n';
import FirstSteps from '../onboarding/first.steps';
import { defaultYear, yearInDartsSeason } from '../../utils/year.in.darts';

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
    const { activeClub, user, setUser, isGlobalAdmin } = useAuth();
    // who the user plays as in the club: their picture and nickname on top
    const myPlayers = useMyPlayers(!isGlobalAdmin);
    const me = playerInClub(myPlayers, activeClub?.id);
    const [preferences] = useGamePreferences();
    const [stats, setStats] = useState(null);
    const [failed, setFailed] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState([]);
    // the layout as last arranged, shown at once while it is saved
    const [arranged, setArranged] = useState(null);
    // arranging saves as you go, a moment after the last move (drags come in bursts); with the account,
    // so a failed save says so
    const layoutSave = useAutoSave((layout) => accountSaver(setUser)({ dashboard: layout }), { delay: 500, valid: (layout) => layout.length > 0 });

    useEffect(() => {
        StatsService.loadClubStats().then(setStats).catch((error) => {
            console.error('Failed to load the dashboard', error);
            setFailed(true);
        });
    }, [activeClub?.id]);

    const players = useMemo(() => new Map((stats?.players ?? []).map(player => [player.id, player])), [stats]);
    const shameBadges = activeClub?.shameBadges !== false;
    const stored = preferences.dashboard;
    // without a player in the club, You and Your training show nothing: no hole for them
    const widgets = resolveLayout(arranged?.length ? arranged : stored, { shameBadges, fallback: PERSONAL_DEFAULT_LAYOUT, without: me || myPlayers === null ? [] : ['me', 'training'] });

    if (failed) return <div className="container-fluid p-4 text-subtle">{t('The dashboard could not be loaded. Please reload the page.')}</div>;
    if (!stats) return <DashboardSkeleton club={activeClub} widgets={widgets} />;

    // each move, width, widget removed or added: shown at once and saved
    const arrange = (layout, options) => {
        setDraft(layout);
        setArranged(layout);
        layoutSave.change(layout, options);
    };
    const startArranging = () => {
        setDraft(toLayout(arranged?.length ? arranged : stored, PERSONAL_DEFAULT_LAYOUT).map(({ id, size }) => ({ id, size })));
        setEditing(true);
    };
    // done: what still waits is saved now
    const done = () => {
        layoutSave.flush();
        setEditing(false);
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
                {!editing &&
                    <span className="d-flex flex-wrap align-items-center gap-2">
                        <SaveStatus {...layoutSave} />
                        <Button label={t('Arrange')} icon="pi pi-th-large" size="small" severity="secondary" onClick={startArranging} />
                    </span>}
            </header>

            {/* a new account: what to do first, ticked as it is done */}
            {!editing && <FirstSteps />}

            {/* in December and early January: the look back at the year */}
            {!editing && me && yearInDartsSeason() &&
                <section className="tournament-banner is-finished mb-4" aria-label={t('Your year in darts')}>
                    <i className="pi pi-star-fill tournament-banner-icon" aria-hidden="true" />
                    <div className="d-flex flex-column min-w-0 flex-grow-1">
                        <span className="tournament-banner-title">{t('Your year in darts {{year}} is here', { year: defaultYear() })}</span>
                        <span className="text-subtle fs-7">{t('Your games, records, rival and badges of the year, to look back at and share.')}</span>
                    </div>
                    <span className="d-flex flex-wrap gap-2">
                        <Link to="/year" className="p-button p-button-sm text-decoration-none">{t('Look back')}</Link>
                        <Link to="/club/year" className="p-button p-button-sm p-button-secondary text-decoration-none">{t('The club\'s year')}</Link>
                    </span>
                </section>}

            {editing && (
                <div className="dashboard-edit-bar" role="region" aria-label={t('Arranging your dashboard')}>
                    <div className="d-flex flex-column gap-1 min-w-0">
                        <span className="text-default fw-semibold">{t('Arranging your dashboard')}</span>
                        <span className="text-faint fs-8">{t('Only you see it, on every device, and it is saved as you go. Drag the widgets by their bar, choose their width, remove them or add more below.')}</span>
                        {!draft.length && <span className="text-danger fs-8">{t('Add at least one widget.')}</span>}
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <SaveStatus {...layoutSave} />
                        <Button type="button" label={t('Default widgets')} icon="pi pi-replay" size="small" severity="secondary" text onClick={() => arrange(PERSONAL_DEFAULT_LAYOUT, { now: true })} />
                        <Button type="button" label={t('Done')} icon="pi pi-check" size="small" onClick={done} />
                    </div>
                </div>
            )}

            {editing
                ? <DashboardEditor layout={draft} onChange={arrange} renderWidget={renderWidget} shameBadges={shameBadges} pool={DASHBOARD_WIDGETS} fallback={PERSONAL_DEFAULT_LAYOUT} />
                : (
                    <div className="row g-4">
                        {widgets.map(widget => (
                            <div className={widget.cols} key={widget.id}>
                                {renderWidget(widget)}
                            </div>
                        ))}
                    </div>
                )}
        </div>
    );
};

export default Dashboard;
