import { useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';

import PlayerPicker from '../config_components/player.picker';
import GameSetupStart from '../config_components/game.setup.start';
import { missingPlayers, playersSummary } from '../config_components/game.setup.summary';
import CricketModels from '../../../models/cricket.models';
import CricketService from '../../../services/cricket.service';

const CricketConfig = () => {
    const [players, setPlayers] = useState([]);
    const [starting, setStarting] = useState(false);

    const toast = useRef(null);
    const navigate = useNavigate();

    const missing = missingPlayers(players);

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        const game = CricketModels.CricketGameModel;
        const playerIds = players.map(player => player.id);
        try {
            const newGame = await CricketService.createCricketGame({
                ...game,
                isSoloGame: false,
                numberOfPlayers: playerIds.length,
                players: playerIds,
                currentPlayerTurn: playerIds[0],
                playerModels: Object.fromEntries(playerIds.map(playerId => [playerId, { ...CricketModels.CricketPlayerModel, score: Number(game.startingScore) }])),
            });
            navigate('/cricket/' + newGame.id);
        } catch (error) {
            toast.current.show({ severity: 'error', summary: 'Start Game', detail: 'Failed to create the game. ' + error.message, life: 4000 });
            setStarting(false);
        }
    };

    return (
        <>
            <Panel header="Cricket" className="w-100 w-md-75 w-xxl-50 mx-auto">
                <div className="container">
                    <p className="game-setup-section-title">Players</p>
                    <PlayerPicker selected={players} onChange={setPlayers} />
                    <GameSetupStart summary={`Cricket · ${playersSummary(players)}`} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default CricketConfig;
