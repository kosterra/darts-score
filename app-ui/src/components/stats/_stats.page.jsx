import { Navigate, useParams } from "react-router-dom";

import PlayersStatisticsPage from './players/players.statistics.page';
import X01List from '../admin/x01.list';
import CricketList from '../admin/cricket.list';
import EliminationList from '../admin/elimination.list';

const StatsPage = () => {

    const { id } = useParams();

    function StatsContent() {
        switch (id) {
            case 'players':
                return <PlayersStatisticsPage />;
            case 'vs':
                // comparisons are part of the player statistics now
                return <Navigate replace to="/stats/players" />;
            case 'x01':
                return (
                    <X01List
                        deleteActive={false}
                        rawActive={false}
                        showStatusFilter={false}
                        staticStatusValue={2}
                    />
                );
            case 'cricket':
                return (
                    <CricketList
                        deleteActive={false}
                        rawActive={false}
                        showStatusFilter={false}
                        staticStatusValue={2}
                    />
                );
            case 'elimination':
                return (
                    <EliminationList
                        deleteActive={false}
                        rawActive={false}
                        showStatusFilter={false}
                        staticStatusValue={2}
                    />
                );
            default:
                return <PlayersStatisticsPage />;
        }
    }

    // the player statistics bring their own layout (player list next to the statistics)
    if (!['x01', 'cricket', 'elimination', 'vs'].includes(id)) return <PlayersStatisticsPage />;

    return (
        <div className="container-fluid p-4 bg-transparent border-0">
            <div className="row justify-content-md-center align-items-center">
                <StatsContent />
            </div>
        </div>
    )
}

export default StatsPage;
