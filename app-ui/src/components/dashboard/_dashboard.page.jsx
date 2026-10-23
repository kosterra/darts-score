import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import StatsService from '../../services/stats.service';
import { DashboardSkeleton } from '../elements/skeletons';
import { useAuth } from '../../utils/auth.context';
import AuthService from '../../services/auth.service';
import ClubService from '../../services/club.service';
import { DEFAULT_LAYOUT, layoutFor, resolveLayout, toLayout } from './dashboard.widgets';
import DashboardEditor from './dashboard.editor';
import ClubLogo from '../elements/club.logo';
import LeaderboardWidget from './widgets/leaderboard.widget';
import ClubKpisWidget from './widgets/club.kpis.widget';
import ActivityCalendarWidget from './widgets/activity.calendar.widget';
import WhenWePlayWidget from './widgets/when.we.play.widget';
import RecordsWidget from './widgets/records.widget';
import HeadToHeadWidget from './widgets/head.to.head.widget';
import GamesPerMonthWidget from './widgets/games.per.month.widget';
import ClubFormWidget from './widgets/club.form.widget';
import RunningGamesWidget from './widgets/running.games.widget';
import TimelineWidget from './widgets/timeline.widget';
import HallOfShameWidget from './widgets/hall.of.shame.widget';
import MeWidget from './widgets/me.widget';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';


// what a club admin arranges: their own dashboard or the club's
const TARGETS = [{ label: t('My dashboard'), value: 'mine' }, { label: t('The club\'s dashboard'), value: 'club' }];

/**
 * The club dashboard: the club at a glance, followed by the widgets. Members
 * see the club's arrangement, or their own if they made one; the club admins
 * arrange the club's. Edit dashboard arranges it right on the page: widgets
 * dragged into place, made wider or narrower, removed and added.
 */
const Dashboard = () => {
    const toast = useRef(null);
    const { activeClub, isClubAdmin, refreshClubs, user, setUser } = useAuth();

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
    const current = layoutFor(user, activeClub);
    const widgets = resolveLayout(current.layout, { shameBadges });
    const clubLayout = layoutFor(null, activeClub).layout;

    if (failed) {
        return <div className="container-fluid p-4 text-subtle">{t('The dashboard could not be loaded. Please reload the page.')}</div>;
    }
    if (!stats) return <DashboardSkeleton club={activeClub} widgets={widgets} />;

    const { club, totals } = stats;
    const facts = [
        [t('Club since'), formatDate(club.createdAt)],
        [t('Players'), club.playerCount],
        [t('Admins'), club.adminCount],
        [t('Games played'), totals.gamesPlayed],
        [t('Last game'), formatDate(totals.lastGameAt)],
    ];

    // the arrangement to start from: one's own (or the club's, to start one's own from), or the club's
    const layoutOf = (target) => toLayout(target === 'club' ? clubLayout : current.layout).map(({ id, size }) => ({ id, size }));
    const startEditing = () => {
        const target = isClubAdmin && !current.own ? 'club' : 'mine';
        setEditing(target);
        setDraft(layoutOf(target));
    };
    const switchTarget = (target) => {
        if (!target || target === editing) return;
        setEditing(target);
        setDraft(layoutOf(target));
    };

    const run = async (action, summary) => {
        setSaving(true);
        try {
            await action();
            setEditing(null);
            toast.current?.show({ severity: 'success', summary, life: 3000 });
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: t('Dashboard'), detail: error.message, life: 4000 });
        } finally {
            setSaving(false);
        }
    };
    const save = () => editing === 'club'
        ? run(async () => {
            await ClubService.updateClub(activeClub.id, { name: activeClub.name, dashboardLayout: draft });
            await refreshClubs();
        }, t('The club\'s dashboard is saved'))
        : run(async () => setUser(await AuthService.saveDashboard(activeClub.id, draft)), t('Your dashboard is saved'));
    // back to the club's dashboard (one's own) or to the default widgets (the club's, saved with Save)
    const reset = () => editing === 'club'
        ? setDraft(DEFAULT_LAYOUT)
        : run(async () => setUser(await AuthService.saveDashboard(activeClub.id, null)), t('You see the club\'s dashboard again'));

    const renderWidget = (widget) => {
        switch (widget.kind) {
            case 'totals': return <ClubKpisWidget widget={widget} kpis={stats.kpis} totals={totals} players={players} />;
            case 'activityCalendar': return <ActivityCalendarWidget widget={widget} gameLog={stats.gameLog} />;
            case 'whenWePlay': return <WhenWePlayWidget widget={widget} gameLog={stats.gameLog} />;
            case 'records': return <RecordsWidget widget={widget} records={stats.records} players={players} />;
            case 'headToHead': return <HeadToHeadWidget widget={widget} headToHead={stats.headToHead} players={players} />;
            case 'gamesPerMonth': return <GamesPerMonthWidget widget={widget} gameLog={stats.gameLog} />;
            case 'clubForm': return <ClubFormWidget widget={widget} gameLog={stats.gameLog} />;
            case 'runningGames': return <RunningGamesWidget widget={widget} games={stats.runningGames} total={totals.running} players={players} />;
            case 'hallOfShame': return <HallOfShameWidget widget={widget} />;
            case 'me': return <MeWidget widget={widget} />;
            case 'timeline': return <TimelineWidget widget={widget} games={stats.recentGames} players={players} />;
            case 'leaderboard': return <LeaderboardWidget widget={widget} entries={stats.leaderboards[widget.board]} players={players} />;
            default: return null;
        }
    };

    return (
        <div className="container-fluid p-4 border-0">
            <header className="dashboard-header hero-header rounded-2 p-4 mb-4 d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div className="d-flex flex-wrap align-items-start gap-4" style={{ minWidth: 0 }}>
                <ClubLogo club={club} size="lg" />
                <div className="d-flex flex-column gap-3" style={{ minWidth: 0, flex: '1 1 18rem' }}>
                    <div className="d-flex flex-wrap align-items-center gap-3">
                        <h1 className="fs-2 fw-semibold text-default m-0 text-break">{club.name}</h1>
                        <Tag value={club.isPublic ? t('Public') : t('Private')} severity="secondary" />
                    </div>
                    {club.description && <p className="text-subtle m-0" style={{ maxWidth: '60ch' }}>{club.description}</p>}
                    <dl className="d-flex flex-wrap column-gap-5 row-gap-2 m-0">
                        {facts.map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-faint fs-8 fw-normal">{label}</dt>
                                <dd className="text-default fw-semibold m-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
                </div>
                {!editing && (
                    <div className="d-flex flex-column align-items-end gap-1">
                        <Button label={t('Edit dashboard')} icon="pi pi-th-large" size="small" severity="secondary" onClick={startEditing} />
                        {current.own && <span className="text-faint fs-8">{t('Your own arrangement')}</span>}
                    </div>
                )}
            </header>

            {editing && (
                <div className="dashboard-edit-bar" role="region" aria-label={t('Arranging the dashboard')}>
                    <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
                        {isClubAdmin
                            ? <SelectButton value={editing} options={TARGETS} onChange={(event) => switchTarget(event.value)} className="p-selectbutton-pills" aria-label={t('What to arrange')} />
                            : <span className="text-default fw-semibold">{t('Arranging your dashboard')}</span>}
                        <span className="text-faint fs-8">
                            {editing === 'club'
                                ? t('Everyone in the club sees it, unless they arranged their own.')
                                : t('Only you see it, in this club. Drag the widgets by their bar, choose their width, remove them or add more below.')}
                        </span>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        {(editing === 'club' || current.own) &&
                            <Button type="button" label={editing === 'club' ? t('Default widgets') : t('Use the club\'s')} icon="pi pi-replay" size="small" severity="secondary" text onClick={reset} disabled={saving} />}
                        <Button type="button" label={t('Cancel')} size="small" severity="secondary" onClick={() => setEditing(null)} disabled={saving} />
                        <Button type="button" label={t('Save')} icon="pi pi-check" size="small" onClick={save} loading={saving} disabled={!draft.length} />
                    </div>
                </div>
            )}

            {editing
                ? <DashboardEditor layout={draft} onChange={setDraft} renderWidget={renderWidget} shameBadges={shameBadges} />
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
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default Dashboard;
