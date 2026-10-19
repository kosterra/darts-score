import { Link, Navigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';

import PageLoader from '../elements/page.loader';
import { useAuth } from '../../utils/auth.context';
import { useMyPlayers, playerInClub } from '../../utils/use.my.players';

/**
 * /me: the user's own statistics in the selected club, e.g. as the start
 * page. Without a player there it says so.
 */
const MyStatistics = () => {
    const { activeClub, isGlobalAdmin } = useAuth();
    const players = useMyPlayers(!isGlobalAdmin);
    if (isGlobalAdmin) return <Navigate replace to="/" />;
    if (players === null) return <PageLoader />;
    const player = playerInClub(players, activeClub?.id);
    if (player) return <Navigate replace to={`/players/${player.id}`} />;
    return (
        <div className="container-fluid p-4 border-0">
            <Panel header="My statistics">
                <p className="text-subtle fs-7 m-0">
                    You do not play in {activeClub?.name ?? 'this club'}, so there are no statistics of your own here.
                    {' '}Switch to a club you play in, or add yourself as a player under <Link to="/my-clubs">My clubs</Link>.
                </p>
            </Panel>
        </div>
    );
};

export default MyStatistics;
