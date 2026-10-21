import { useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';

import X01ScoreConfig from '../config_components/x01.score.config';
import X01InOutConfig from '../config_components/x01.inout.config';
import SetsLegsConfig from '../config_components/sets.legs.config';
import PlayerPicker from '../config_components/player.picker';
import X01HandicapConfig from '../config_components/x01.handicap.config';
import FlyingDartsConfig from '../config_components/flying.darts.config';
import GameSetupStart from '../config_components/game.setup.start';
import GameSetupMemory from '../config_components/game.setup.memory';
import QuickFormats from '../config_components/quick.formats';
import X01Models from '../../../models/x01.models';
import X01Service from '../../../services/x01.service';
import { MIN_PLAYERS } from '../../../utils/player.picker';
import { clearSetup, fitToPlayers, loadSetup, saveSetup, X01_QUICK_FORMATS } from '../../../utils/setup.memory';
import { missingPlayers, playersSummary, setsLegsSummary } from '../config_components/game.setup.summary';
import { t } from '../../../utils/i18n';

const SETTINGS = ['startingScore', 'legInMode', 'legOutMode', 'setMode', 'numberOfSets', 'legMode', 'numberOfLegs', 'flyingDarts'];

const X01Config = () => {
    // the page starts set up like the last game
    const [remembered, setRemembered] = useState(() => loadSetup('x01'));
    const [game, setGame] = useState(() => ({ ...X01Models.X01GameModel, ...remembered?.settings }));
    const [players, setPlayers] = useState([]);
    // the own rules of every player, null without a handicap
    const [handicap, setHandicap] = useState(null);
    const [starting, setStarting] = useState(false);
    // the handicap of the last game comes back with its players
    const pendingHandicap = useRef(remembered?.handicap ?? null);

    const toast = useRef(null);
    const navigate = useNavigate();

    const handleConfigChange = (name, value) => {
        if (['setMode', 'legMode', 'legInMode', 'legOutMode', 'flyingDarts'].includes(name)) {
            setGame(current => ({ ...current, [name]: value }));
        } else {
            setGame(current => ({ ...current, [name]: Number(value) }));
        }
    };

    const onPlayersChange = (chosen) => {
        setPlayers(chosen);
        setGame(current => fitToPlayers(current, chosen.length));
        const restoring = pendingHandicap.current;
        pendingHandicap.current = null;
        if (chosen.length < MIN_PLAYERS) setHandicap(null);
        else if (restoring && chosen.every(player => restoring[player.id])) setHandicap(restoring);
        else if (handicap) setHandicap(Object.fromEntries(chosen.filter(player => handicap[player.id]).map(player => [player.id, handicap[player.id]])));
    };

    const applyFormat = (settings) => setGame(current => ({ ...current, ...fitToPlayers(settings, players.length) }));

    const startFresh = () => {
        clearSetup('x01');
        setRemembered(null);
        setGame({ ...X01Models.X01GameModel });
        setPlayers([]);
        setHandicap(null);
    };

    const rulesOf = (playerId) => handicap?.[playerId] ?? { startingScore: Number(game.startingScore), legInMode: game.legInMode, legOutMode: game.legOutMode };

    const missing = missingPlayers(players);
    const summary = [
        handicap ? 'Handicap' : `${game.startingScore} · ${game.legInMode} / ${game.legOutMode}`,
        setsLegsSummary(game),
        playersSummary(players),
    ].join(' · ');

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        saveSetup('x01', { settings: Object.fromEntries(SETTINGS.map(name => [name, game[name]])), players, handicap });
        const playerIds = players.map(player => player.id);
        const playerModels = Object.fromEntries(playerIds.map(playerId => {
            const rules = rulesOf(playerId);
            return [playerId, {
                ...X01Models.X01PlayerModel,
                ...(handicap && rules),
                score: Number(rules.startingScore),
            }];
        }));
        try {
            const newGame = await X01Service.createX01Game({
                ...game,
                isSoloGame: false,
                numberOfPlayers: playerIds.length,
                players: playerIds,
                currentPlayerTurn: playerIds[0],
                startingPlayerSet: playerIds[0],
                startingPlayerLeg: playerIds[0],
                playerModels,
            });
            navigate('/x01/' + newGame.id);
        } catch (error) {
            toast.current.show({ severity: 'error', summary: t('Start Game'), detail: t('Failed to create the game. ') + error.message, life: 4000 });
            setStarting(false);
        }
    };

    return (
        <>
            <Panel header={t('X01')} className="w-100 w-md-75 w-xxl-50 mx-auto">
                <div className="container">
                    {remembered && <GameSetupMemory onReset={startFresh} />}
                    <p className="game-setup-section-title">{t('Players')}</p>
                    <PlayerPicker selected={players} onChange={onPlayersChange} initialIds={remembered?.playerIds} key={remembered ? 'remembered' : 'fresh'} />

                    <p className="game-setup-section-title mt-4">{t('Game')}</p>
                    <QuickFormats formats={X01_QUICK_FORMATS} settings={game} playerCount={players.length} onApply={applyFormat} />
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
                    <X01HandicapConfig game={game} players={players} rules={handicap} onChange={setHandicap} />
                    <FlyingDartsConfig value={game.flyingDarts} onChange={(value) => handleConfigChange('flyingDarts', value)} />

                    <GameSetupStart summary={summary} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default X01Config;
