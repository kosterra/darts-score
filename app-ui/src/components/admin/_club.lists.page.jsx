import { useState } from 'react';

import PlayersTable from './players.table';
import GamesTable from './games.table';
import TrainingsTable from './trainings.table';
import JoinRequests from './join.requests';
import { useAuth } from '../../utils/auth.context';

/**
 * The lists of the selected club under "Club", for everyone in it. Only the
 * club's admins see the actions that change something.
 */
const ClubListsPage = ({ list }) => {
    const { isClubAdmin } = useAuth();
    // the players list loads again when a request to join was accepted
    const [joined, setJoined] = useState(0);

    return (
        <div className="container-fluid p-4 border-0">
            {list === 'players' && isClubAdmin && <JoinRequests onDecided={(accepted) => accepted && setJoined(count => count + 1)} />}
            {list === 'players' && <PlayersTable scope="club" key={joined} />}
            {/* the games list reads its filters from the address itself */}
            {list === 'games' && <GamesTable scope="club" />}
            {list === 'trainings' && <TrainingsTable scope="club" />}
        </div>
    );
};

export default ClubListsPage;
