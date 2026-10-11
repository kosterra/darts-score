import { useState, useEffect } from 'react';
import { SelectButton } from 'primereact/selectbutton';
import { PickList } from 'primereact/picklist';
import { Avatar } from 'primereact/avatar';

import PlayerConfigOptions from '../config_options/player.config.options';
import PlayerForm from '../../elements/player.form';
import GuestForm from '../../elements/guest.form';
import PlayerService from '../../../services/player.service';
import { resolvePlayerImg } from '../../../utils/image.utils';
import { useAuth } from '../../../utils/auth.context';

const PlayerConfig = (props) => {
    const { isClubAdmin } = useAuth();
    const {
        numberOfPlayersOption,
        selectedPlayers,
        onNumberOfPlayersChange,
        onSelectedPlayersChange
    } = props;

    const [players, setPlayers] = useState([]);

    const onPlayerSelectChange = (event) => {
        setPlayers(event.source);
        onSelectedPlayersChange('players', event.target);
    };

    const onPlayerAdd = () => {
        loadPlayers('');
    }

    // A new guest goes straight into the game while there is room, otherwise into the available list
    const onGuestAdd = (guest) => {
        if (selectedPlayers.length < numberOfPlayersOption) {
            onSelectedPlayersChange('players', [...selectedPlayers, guest]);
        } else {
            setPlayers([...players, guest]);
        }
    }

    const loadPlayers = async searchTerm => {
        let data = await PlayerService.searchPlayers(searchTerm);
        // players already picked for the game stay out of the available list
        setPlayers(data.filter(player => !selectedPlayers.some(selected => selected.id === player.id)));
    };

    useEffect(() => {
        loadPlayers('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const playerItemTemplate = (player) => {
        return (
            <div className="row px-2">
                <div className="col-4 d-flex flex-column justify-content-center align-items-center">
                    <Avatar image={resolvePlayerImg(player.profileImg)} shape="circle" className="avatar-md" />
                </div>
                <div className="col-8 d-flex flex-column justify-content-center align-items-start">
                    <span className="fs-7 fw-semibold">{player.nickname}</span>
                    <div className="fs-8 text-default">
                        <span>{player.firstname + ' ' + player.lastname}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container">
            <p className="text-center text-faint fs-7 fw-semibold">Players</p>
            <div className="row m-0">
                <div className="col-12 border border-default rounded m-0 mb-4 py-3">
                    <SelectButton
                        value={numberOfPlayersOption}
                        onChange={(e) => onNumberOfPlayersChange('numberOfPlayers', e.value)}
                        optionLabel="name"
                        options={PlayerConfigOptions.numberOfPlayerOptions.values}
                        className="p-selectbutton-pills flex-wrap"
                    />
                </div>
            </div>
            <div className="row m-0">
                <span className="col-4 p-0"></span>
                <span className="col-4 p-0 d-flex justify-content-center align-items-center">
                    <p className="text-faint fs-6">{'Select ' + numberOfPlayersOption + ' player' + (numberOfPlayersOption > 1 ? 's' : '')}</p>
                </span>
                <div className="col-4 p-0 d-flex justify-content-end align-items-center gap-2 mb-2">
                    <GuestForm onGuestAdd={onGuestAdd} />
                    {isClubAdmin && <PlayerForm onPlayerAdd={onPlayerAdd} />}
                </div>
            </div>
            <div className="col-12 p-0 mb-3">
                <div className="col py-1 d-flex justify-content-center align-items-center">
                    <PickList
                        dataKey="id"
                        source={players}
                        target={selectedPlayers}
                        onChange={onPlayerSelectChange}
                        itemTemplate={playerItemTemplate}
                        filter
                        filterBy="firstname,lastname,nickname"
                        breakpoint="1280px"
                        sourceHeader="Available Players"
                        targetHeader="Selected Players"
                        showSourceControls={false}
                        sourceFilterPlaceholder="Search players"
                        targetFilterPlaceholder="Search players"
                    />
                </div>
            </div>
        </div>
    );
};

export default PlayerConfig;