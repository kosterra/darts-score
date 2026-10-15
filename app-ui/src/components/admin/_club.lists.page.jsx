import { Navigate, useSearchParams } from 'react-router-dom';

import PlayersTable from './players.table';
import GamesTable from './games.table';
import TrainingsTable from './trainings.table';
import { useAuth } from '../../utils/auth.context';

const GAME_TYPES = ['x01', 'cricket', 'elimination'];

/**
 * The lists of the selected club under "Club": its games and trainings for
 * everyone in it, its players for its admins.
 */
const ClubListsPage = ({ list }) => {
    const { isClubAdmin } = useAuth();
    const [searchParams] = useSearchParams();

    if (list === 'players' && !isClubAdmin) return <Navigate replace to="/" />;

    const type = searchParams.get('type');
    return (
        <div className="container-fluid p-4 border-0">
            {list === 'players' && <PlayersTable scope="club" />}
            {list === 'games' && <GamesTable scope="club" initialType={GAME_TYPES.includes(type) ? type : 'all'} />}
            {list === 'trainings' && <TrainingsTable scope="club" />}
        </div>
    );
};

export default ClubListsPage;
