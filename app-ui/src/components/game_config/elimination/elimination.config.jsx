import { useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';

import EliminationScoreConfig from '../config_components/elimination.score.config';
import EliminationInOutConfig from '../config_components/elimination.inout.config';
import PlayerPicker from '../config_components/player.picker';
import GameSetupStart from '../config_components/game.setup.start';
import { missingPlayers, playersSummary } from '../config_components/game.setup.summary';
import EliminationModels from '../../../models/elimination.models';
import EliminationService from '../../../services/elimination.service';

const EliminationConfig = () => {
    const [game, setGame] = useState({ ...EliminationModels.EliminationModel });
    const [players, setPlayers] = useState([]);
    const [starting, setStarting] = useState(false);
    const toast = useRef(null);
    const navigate = useNavigate();

    const handleConfigChange = (name, value) => {
        if (['gameInMode', 'gameOutMode'].includes(name)) {
            setGame(prev => ({ ...prev, [name]: value }));
        } else {
            setGame(prev => ({ ...prev, [name]: Number(value) }));
        }
    };

    const missing = missingPlayers(players);
    const summary = `${game.targetScore} · ${game.gameInMode} / ${game.gameOutMode} · ${playersSummary(players)}`;

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        const playerIds = players.map(p => p.id);
        const playerModels = {};
        playerIds.forEach(pid => {
            playerModels[pid] = { ...EliminationModels.EliminationPlayerModel };
        });

        try {
            const created = await EliminationService.createEliminationGame({
                ...game,
                isSoloGame: false,
                numberOfPlayers: playerIds.length,
                players: playerIds,
                currentPlayerTurn: playerIds[0],
                startingPlayer: playerIds[0],
                playerModels
            });
            navigate('/elimination/' + created.id);
        } catch (err) {
            toast.current.show({
                severity: 'error',
                summary: 'Start Game',
                detail: 'Failed to create the game. ' + err.message,
                life: 4000
            });
            setStarting(false);
        }
    };

    return (
        <>
            <Panel header="Elimination" className="w-100 w-md-75 w-xxl-50 mx-auto">
                <div className="container">
                    <p className="game-setup-section-title">Players</p>
                    <PlayerPicker selected={players} onChange={setPlayers} />

                    <p className="game-setup-section-title mt-4">Game</p>
                    <EliminationScoreConfig
                        scoreOption={game.targetScore}
                        onScoreChange={handleConfigChange}
                    />
                    <EliminationInOutConfig
                        gameInOption={game.gameInMode}
                        gameOutOption={game.gameOutMode}
                        onInOutChange={handleConfigChange}
                    />
                    <GameSetupStart summary={summary} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default EliminationConfig;
