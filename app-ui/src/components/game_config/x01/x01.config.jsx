import { useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';

import X01ScoreConfig from '../config_components/x01.score.config';
import X01InOutConfig from '../config_components/x01.inout.config';
import SetsLegsConfig from '../config_components/sets.legs.config';
import PlayerConfig from '../config_components/player.config';
import X01Models from '../../../models/x01.models';
import X01Service from '../../../services/x01.service';


const X01Config = () => {
    const initialState = X01Models.X01GameModel;

    const [game, setGame] = useState(initialState);

    const toast = useRef(null);

    const navigate = useNavigate();

    const handleConfigChange = (name, value) => {
        if (name === 'numberOfPlayers') {
            setGame({
                ...game,
                numberOfPlayers: Number(value),
                setMode: value > 2 ? 'First to' : game.setMode,
                legMode: value > 2 ? 'First to' : game.legMode
            })

            if (game.players.length > Number(value)) {
                setGame({ ...game, players: game.players.slice(0, Number(value)) });
            }
        } else if (['setMode', 'legMode', 'legInMode', 'legOutMode'].includes(name)) {
            setGame({ ...game, [name]: value });
        } else if (name === 'players') {
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
                    //life: 3000
                    sticky: true
                }
            );
        } else {
            let playerIds = game.players.map((item) => item.id);
            game.isSoloGame = playerIds.length === 1;
            game['players'] = playerIds;
            game.currentPlayerTurn = game.players[0];
            game.startingPlayerSet = game.players[0];
            game.startingPlayerLeg = game.players[0];

            game.players.forEach(player => {
                let x01PlayerModel = { ...X01Models.X01PlayerModel };
                x01PlayerModel.score = Number(game.startingScore);
                game.playerModels[player] = x01PlayerModel;
            })

            let newGame = await X01Service.createX01Game(game)
            navigate('/x01/' + newGame.id);
        }
    }

    const validate = () => {
        return Number(game.numberOfPlayers) === game.players.length;
    }

    return (
        <>
            <Panel header="X01" className="w-100 w-md-75 w-xxl-50 mx-auto" >
                <div className="container">
                    <X01ScoreConfig
                        scoreOption={game.startingScore}
                        onScoreChange={handleConfigChange}
                    />
                    <X01InOutConfig
                        legInOption={game.legInMode}
                        legOutOption={game.legOutMode}
                        onInOutChange={handleConfigChange}
                    />
                    <SetsLegsConfig
                        setModeOption={game.setMode}
                        legModeOption={game.legMode}
                        numberOfSetsOption={game.numberOfSets}
                        numberOfLegsOption={game.numberOfLegs}
                        onSetsLegsChange={handleConfigChange}
                    />
                    <PlayerConfig
                        numberOfPlayersOption={game.numberOfPlayers}
                        selectedPlayers={game.players}
                        onNumberOfPlayersChange={handleConfigChange}
                        onSelectedPlayersChange={handleConfigChange}
                    />
                    <div className="container text-center">
                        <Button severity="primary" size="small" className="m-0" onClick={handleSubmit}>
                            Start Game
                        </Button>
                    </div>
                </div>
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
}

export default X01Config;
