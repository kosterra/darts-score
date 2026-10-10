import { useParams } from "react-router-dom";

import PlayerStats from './players/player.stats';
import PlayerVSStats from './players/player.vs.stats';
import X01List from '../admin/x01.list';
import CricketList from '../admin/cricket.list';
import EliminationList from '../admin/elimination.list';

const StatsPage = () => {

    const { id } = useParams();

    function StatsContent() {
        switch (id) {
            case 'players':
                return (
                    <PlayerStats />
                );
            case 'vs':
                return (
                    <PlayerVSStats />
                );
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
                return (
                    <PlayerStats />
                );
        }
    }

    return (
        <div className="container-fluid p-4 bg-transparent border-0">
            <div className="row justify-content-md-center align-items-center">
                <StatsContent />
            </div>
        </div>
    )
}

export default StatsPage;
