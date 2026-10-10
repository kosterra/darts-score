import { useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';

import PlayerConfig from '../config_components/player.config';
import CricketModels from '../../../models/cricket.models';
import CricketService from '../../../services/cricket.service';


const CricketConfig = () => {
    const initialState = CricketModels.CricketGameModel;

    const [game, setGame] = useState(initialState);

    const toast = useRef(null);

    const navigate = useNavigate();

    const handleConfigChange = (name, value) => {
        if (name === 'players') {
            setGame({ ...game, players: value })
        } else {
            setGame({ ...game, [name]: Number(value) });
        }
    }

    const handleSubmit = async (event) => {
        if (!validate()) {
            event.preventDefault();
            event.stopPropagation();
            toast.current.show(
                {
                    severity: 'error',
                    summary: 'Missing Config',
                    detail: 'You need to select ' + game.numberOfPlayers + ' players!',
                    life: 3000
                }
            );
        } else {
            let playerIds = game.players.map((item) => item.id);
            game.isSoloGame = playerIds.length === 1;
            game['players'] = playerIds;
            game.currentPlayerTurn = game.players[0];

            game.players.forEach(player => {
                let cricketPlayerModel = { ...CricketModels.CricketPlayerModel };
                cricketPlayerModel.score = Number(game.startingScore);
                game.playerModels[player] = cricketPlayerModel;
            })

            let newGame = await CricketService.createCricketGame(game)
            navigate('/cricket/' + newGame.id);
        }
    }

    const validate = () => {
        return Number(game.numberOfPlayers) === game.players.length;
    }

    return (
        <>
            <Panel header="Cricket" className="w-100 w-md-75 w-xxl-50 mx-auto" >
                <div className="container">
                    <PlayerConfig
                        numberOfPlayersOption={game.numberOfPlayers}
                        selectedPlayers={game.players}
                        onNumberOfPlayersChange={handleConfigChange}
                        onSelectedPlayersChange={handleConfigChange}
                    />
                    <div className="container text-center">
                        <Button variant="primary" size="small" className="m-0" onClick={handleSubmit}>
                            Start Game
                        </Button>
                    </div>
                </div>
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
}

export default CricketConfig;
