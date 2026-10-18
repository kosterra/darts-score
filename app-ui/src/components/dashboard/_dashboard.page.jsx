import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import dayjs from 'dayjs';

import StatsService from '../../services/stats.service';
import PageLoader from '../elements/page.loader';
import { useAuth } from '../../utils/auth.context';
import { resolveWidgets } from './dashboard.widgets';
import DashboardCustomizeDialog from './dashboard.customize.dialog';
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

const formatDate = (date) => date ? dayjs(date).format('DD.MM.YYYY') : '–';

/**
 * The club dashboard: the club at a glance, followed by the widgets the club chose.
 */
const Dashboard = () => {
    const { activeClub, isClubAdmin, refreshClubs } = useAuth();

    const [stats, setStats] = useState(null);
    const [failed, setFailed] = useState(false);
    const [customizing, setCustomizing] = useState(false);

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
    const widgets = resolveWidgets(activeClub?.dashboardWidgets, { shameBadges: activeClub?.shameBadges !== false });

    if (failed) {
        return <div className="container-fluid p-4 text-subtle">The dashboard could not be loaded. Please reload the page.</div>;
    }
    if (!stats) return <PageLoader />;

    const { club, totals } = stats;
    const facts = [
        ['Club since', formatDate(club.createdAt)],
        ['Players', club.playerCount],
        ['Admins', club.adminCount],
        ['Games played', totals.gamesPlayed],
        ['Last game', formatDate(totals.lastGameAt)],
    ];

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
                        <Tag value={club.isPublic ? 'Public' : 'Private'} severity="secondary" />
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
                {isClubAdmin &&
                    <Button label="Customize" icon="pi pi-sliders-h" size="small" onClick={() => setCustomizing(true)} />
                }
            </header>

            <div className="row g-4">
                {widgets.map(widget => (
                    <div className={widget.cols} key={widget.id}>
                        {renderWidget(widget)}
                    </div>
                ))}
            </div>

            {isClubAdmin &&
                <DashboardCustomizeDialog
                    club={activeClub}
                    visible={customizing}
                    onHide={() => setCustomizing(false)}
                    onSaved={refreshClubs}
                />
            }
        </div>
    );
};

export default Dashboard;
