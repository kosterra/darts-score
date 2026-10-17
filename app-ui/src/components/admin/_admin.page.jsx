import { Navigate, useParams } from "react-router-dom";

import PlayersTable from './players.table';
import GamesTable from './games.table';
import TrainingsTable from './trainings.table';
import ClubsTable from './clubs.table';
import AlertsPage from './alerts.page';
import ErrorLog from './error.log';
import UsersList from './users.list';
import { useAuth } from '../../utils/auth.context';

const GAME_TYPES = ['x01', 'cricket', 'elimination'];
// pages that are not lists of a club's records
const OTHER_PAGES = { clubs: ClubsTable, users: UsersList, alerts: AlertsPage, logs: ErrorLog };

/**
 * The pages under "Admin", for global admins: all clubs and users; players,
 * games and trainings of the clubs they pick, each with its club; spam alerts
 * and the error log.
 */
const AdminPage = () => {
    const { id } = useParams();
    const { isGlobalAdmin, isClubAdmin } = useAuth();

    const isGames = id === 'games' || GAME_TYPES.includes(id);
    const isTrainings = ['trainings', 'training', 'atc'].includes(id);
    const OtherPage = OTHER_PAGES[id];

    // club admins find their club's lists under "Club" (also for old links to the admin area)
    if (!isGlobalAdmin) {
        if (isGames) return <Navigate replace to="/games" />;
        if (isTrainings) return <Navigate replace to="/trainings" />;
        return <Navigate replace to={isClubAdmin ? '/players' : '/'} />;
    }

    if (OtherPage) {
        return (
            <div className="container-fluid p-4 border-0">
                <OtherPage />
            </div>
        );
    }

    return (
        <div className="container-fluid p-4 border-0">
            {isGames && <GamesTable scope="all" initialType={GAME_TYPES.includes(id) ? id : 'all'} />}
            {isTrainings && <TrainingsTable scope="all" />}
            {!isGames && !isTrainings && <PlayersTable scope="all" />}
        </div>
    );
};

export default AdminPage;
