import { useParams } from "react-router-dom";

import PlayersList from './players.list';
import X01List from './x01.list';
import CricketList from './cricket.list';
import EliminationList from './elimination.list';
import ATCEntryAdminList from "./atc.list";

const AdminPage = () => {

    const { id } = useParams();

    function AdminContent() {
        switch (id) {
            case 'players':
                return <PlayersList deleteActive={true} rawActive={true} emptyText="No Players found. Please create new players first!" />;
            case 'x01':
                return <X01List deleteActive={true} rawActive={true} emptyText="No X01 Games found. Please play any games first!" />;
            case 'cricket':
                return <CricketList deleteActive={true} rawActive={true} emptyText="No Cricket Games found. Please play any games first!" />;
            case 'elimination':
                return <EliminationList deleteActive={true} rawActive={true} emptyText="No Elimination Games found. Please play any games first!" />;
            case 'atc':
                return <ATCEntryAdminList deleteActive={true} rawActive={true} emptyText="No ATC Entries found. Please play an ATC training first!" />;
            default:
                return <PlayersList deleteActive={true} rawActive={true} emptyText="No Players found. Please create new players first!" />;
        }
    }

    return (
        <div className="container-fluid p-4 border-0">
            <AdminContent />
        </div>
    );
};

export default AdminPage;