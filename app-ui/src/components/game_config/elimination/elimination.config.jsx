import { useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';

import EliminationScoreConfig from '../config_components/elimination.score.config';
import EliminationInOutConfig from '../config_components/elimination.inout.config';
import PlayerConfig from '../config_components/player.config';
import EliminationModels from '../../../models/elimination.models';
import EliminationService from '../../../services/elimination.service';

const EliminationConfig = () => {
    const [game, setGame] = useState({ ...EliminationModels.EliminationModel });
    const toast = useRef(null);
    const navigate = useNavigate();

    const handleConfigChange = (name, value) => {
        if (name === 'numberOfPlayers') {
            const count = Number(value);
            setGame(prev => ({
                ...prev,
                numberOfPlayers: count,
                // Trim selected players if count is reduced
                players: prev.players.length > count ? prev.players.slice(0, count) : prev.players
            }));
        } else if (name === 'players') {
            setGame(prev => ({ ...prev, players: value }));
        } else if (['gameInMode', 'gameOutMode'].includes(name)) {
            setGame(prev => ({ ...prev, [name]: value }));
        } else {
            setGame(prev => ({ ...prev, [name]: Number(value) }));
        }
    };

    const validate = (currentGame) => {
        return Number(currentGame.numberOfPlayers) === currentGame.players.length;
    };

    const handleSubmit = async () => {
        if (!validate(game)) {
            toast.current.show({
                severity: 'error',
                summary: 'Missing Config',
                detail: `Please select exactly ${game.numberOfPlayers} player${game.numberOfPlayers !== 1 ? 's' : ''}.`,
                sticky: true
            });
            return;
        }

        const playerIds = game.players.map(p => p.id);
        const playerModels = {};
        playerIds.forEach(pid => {
            playerModels[pid] = { ...EliminationModels.EliminationPlayerModel };
        });

        const newGame = {
            ...game,
            isSoloGame: playerIds.length === 1,
            players: playerIds,
            currentPlayerTurn: playerIds[0],
            startingPlayer: playerIds[0],
            playerModels
        };

        try {
            const created = await EliminationService.createEliminationGame(newGame);
            navigate('/elimination/' + created.id);
        } catch (err) {
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to create game: ' + err.message,
                life: 4000
            });
        }
    };

    return (
        <>
            <Panel header="Elimination" className="w-100 w-md-75 w-xxl-50 mx-auto">
                <div className="container">
                    <EliminationScoreConfig
                        scoreOption={game.targetScore}
                        onScoreChange={handleConfigChange}
                    />
                    <EliminationInOutConfig
                        gameInOption={game.gameInMode}
                        gameOutOption={game.gameOutMode}
                        onInOutChange={handleConfigChange}
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
};

export default EliminationConfig;
