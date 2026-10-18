import { useSearchParams } from 'react-router-dom';

import PlayersTable from './players.table';
import GamesTable from './games.table';
import TrainingsTable from './trainings.table';

const GAME_TYPES = ['x01', 'cricket', 'elimination', 'clock'];

/**
 * The lists of the selected club under "Club", for everyone in it. Only the
 * club's admins see the actions that change something.
 */
const ClubListsPage = ({ list }) => {
    const [searchParams] = useSearchParams();

    const type = searchParams.get('type');
    return (
        <div className="container-fluid p-4 border-0">
            {list === 'players' && <PlayersTable scope="club" />}
            {list === 'games' && <GamesTable scope="club" initialType={GAME_TYPES.includes(type) ? type : 'all'} initialPlayerId={searchParams.get('player')} />}
            {list === 'trainings' && <TrainingsTable scope="club" />}
        </div>
    );
};

export default ClubListsPage;
