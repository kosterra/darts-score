import { useState, useEffect } from 'react';
import { Avatar } from 'primereact/avatar';
import { AutoComplete } from "primereact/autocomplete";

import PlayerCard from './player.card';
import PlayerService from '../../services/player.service';
import { resolvePlayerImg } from '../../utils/image.utils';

const PlayerSelect = (props) => {
    const {
        idx,
        onSelect,
        onDelete
    } = props;

    const [players, setPlayers] = useState([]);
    const [selectedPlayers, setSelectedPlayers] = useState([]);

    const handleSearch = (event) => {
        loadPlayers(event.query);
    }

    const handleChange = selections => {
        if (selections && selections.length > 0) {
            const [selectedPlayer] = selections.slice(-1);
            setSelectedPlayers([selectedPlayer]);
            onSelect(selectedPlayer, idx);
        } else {
            setSelectedPlayers([]);
            onDelete(idx);
        }
    }

    const loadPlayers = async (searchTerm) => {
        let data = await PlayerService.searchPlayers(searchTerm);
        setPlayers(data);
    };

    const itemTemplate = (player) => {
        return (
            <div className="d-flex">
                <span>
                    <Avatar
                        label={(player.firstname + ' ' + player.lastname).split(" ").map((n) => n[0]).join("")}
                        image={resolvePlayerImg(player.profileImg)}
                        shape="circle"
                        className="avatar-md bg-shade700 m-2 me-2"
                    />
                </span>
                <span className="d-flex flex-column justify-content-center ms-4">
                    <span className="fs-6 fw-semibold">{player.nickname}</span>
                    <span className="text-shade500 fs-7 fw-semibold">{player.firstname + ' ' + player.lastname}</span>
                </span>
            </div>
        );
    };

    useEffect(() => {
        loadPlayers('');
    }, []);

    return (
        <div className="container px-1 p-0">
            <PlayerCard
                player={selectedPlayers.length > 0 ? selectedPlayers[0] : null}
            />
            <AutoComplete
                field="nickname"
                multiple
                selectionLimit={1}
                value={selectedPlayers}
                suggestions={players}
                minLength={3}
                completeMethod={handleSearch}
                onChange={(e) => handleChange(e.value)}
                itemTemplate={itemTemplate}
                placeholder="Select a Player"
                className="full-width mt-3"
            />
        </div>
    );
}

export default PlayerSelect;