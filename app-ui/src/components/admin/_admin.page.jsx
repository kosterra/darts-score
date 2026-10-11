import { Navigate, useParams } from "react-router-dom";

import PlayersList from './players.list';
import X01List from './x01.list';
import CricketList from './cricket.list';
import EliminationList from './elimination.list';
import ATCEntryAdminList from "./atc.list";
import UsersList from './users.list';
import { useAuth } from '../../utils/auth.context';

const AdminPage = () => {

    const { id } = useParams();
    const { isGlobalAdmin, isClubAdmin } = useAuth();

    // Players of a club have no admin area; the API refuses these actions too
    if (!isClubAdmin && !(isGlobalAdmin && id === 'users')) return <Navigate replace to="/" />;

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
            case 'users':
                // The API refuses the list to anyone else as well
                return isGlobalAdmin ? <UsersList /> : <PlayersList deleteActive={true} rawActive={true} emptyText="No Players found. Please create new players first!" />;
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