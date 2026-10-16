import { Navigate, useParams } from "react-router-dom";

import PlayersTable from './players.table';
import GamesTable from './games.table';
import TrainingsTable from './trainings.table';
import { useAuth } from '../../utils/auth.context';

const GAME_TYPES = ['x01', 'cricket', 'elimination'];

/**
 * The lists across clubs under "Admin", for global admins: players, games and
 * trainings of the clubs they pick, each with its club.
 */
const AdminPage = () => {
    const { id } = useParams();
    const { isGlobalAdmin, isClubAdmin } = useAuth();

    const isGames = id === 'games' || GAME_TYPES.includes(id);
    const isTrainings = ['trainings', 'training', 'atc'].includes(id);

    if (id === 'users') return <Navigate replace to={isGlobalAdmin ? '/administration' : '/'} />;
    // club admins find their club's lists under "Club" (also for old links to the admin area)
    if (!isGlobalAdmin) {
        if (isGames) return <Navigate replace to="/games" />;
        if (isTrainings) return <Navigate replace to="/trainings" />;
        return <Navigate replace to={isClubAdmin ? '/players' : '/'} />;
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
