import { Navigate, useParams } from "react-router-dom";

import PlayersStatisticsPage from './players/players.statistics.page';

const StatsPage = () => {
    const { id } = useParams();

    // comparisons are part of the player statistics now
    if (id === 'vs') return <Navigate replace to="/stats/players" />;
    return <PlayersStatisticsPage />;
};

export default StatsPage;
