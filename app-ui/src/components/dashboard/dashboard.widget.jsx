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
import ClubGoalsWidget from './widgets/club.goals.widget';
import MeWidget from './widgets/me.widget';
import UpNextWidget from './widgets/up.next.widget';
import FavouritesWidget from './widgets/favourites.widget';

/**
 * One widget of a dashboard (My club or one's own Dashboard), drawn from the
 * club's statistics. stats: what StatsService.loadClubStats answers;
 * players: Map(id → player) of the club.
 */
const DashboardWidget = ({ widget, stats, players }) => {
    const { totals } = stats;
    switch (widget.kind) {
        case 'upNext': return <UpNextWidget widget={widget} runningGames={stats.runningGames} players={players} />;
        case 'favourites': return <FavouritesWidget widget={widget} players={players} />;
        case 'totals': return <ClubKpisWidget widget={widget} kpis={stats.kpis} totals={totals} players={players} />;
        case 'activityCalendar': return <ActivityCalendarWidget widget={widget} gameLog={stats.gameLog} />;
        case 'whenWePlay': return <WhenWePlayWidget widget={widget} gameLog={stats.gameLog} />;
        case 'records': return <RecordsWidget widget={widget} records={stats.records} players={players} />;
        case 'headToHead': return <HeadToHeadWidget widget={widget} headToHead={stats.headToHead} players={players} />;
        case 'gamesPerMonth': return <GamesPerMonthWidget widget={widget} gameLog={stats.gameLog} />;
        case 'clubForm': return <ClubFormWidget widget={widget} gameLog={stats.gameLog} />;
        case 'runningGames': return <RunningGamesWidget widget={widget} games={stats.runningGames} total={totals.running} players={players} />;
        case 'hallOfShame': return <HallOfShameWidget widget={widget} />;
        case 'clubGoals': return <ClubGoalsWidget widget={widget} />;
        case 'me': return <MeWidget widget={widget} />;
        case 'timeline': return <TimelineWidget widget={widget} games={stats.recentGames} players={players} />;
        case 'leaderboard': return <LeaderboardWidget widget={widget} entries={stats.leaderboards[widget.board]} players={players} />;
        default: return null;
    }
};

export default DashboardWidget;
