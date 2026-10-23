import { useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';

import PlayerPicker from '../config_components/player.picker';
import GameSetupStart from '../config_components/game.setup.start';
import FlyingDartsConfig from '../config_components/flying.darts.config';
import GameSetupMemory from '../config_components/game.setup.memory';
import { missingPlayers, playersSummary } from '../config_components/game.setup.summary';
import CricketModels from '../../../models/cricket.models';
import CricketService from '../../../services/cricket.service';
import { CRICKET_VARIANTS, DEFAULT_VARIANT } from '../../../utils/cricket.variants';
import { clearSetup, loadSetup, saveSetup } from '../../../utils/setup.memory';
import { t } from '../../../utils/i18n';
import useGameRules from '../../games/common/game.rules';

const CricketConfig = () => {
    // the rules of the game, opened from the title of the setup
    const [rulesButton, rules] = useGameRules('cricket');
    // the page starts set up like the last game
    const [remembered, setRemembered] = useState(() => loadSetup('cricket'));
    const [variant, setVariant] = useState(remembered?.settings?.variant ?? DEFAULT_VARIANT);
    const [flyingDarts, setFlyingDarts] = useState(remembered?.settings?.flyingDarts ?? 'players');
    const [players, setPlayers] = useState([]);
    const [starting, setStarting] = useState(false);

    const toast = useRef(null);
    const navigate = useNavigate();

    const missing = missingPlayers(players);

    const startFresh = () => {
        clearSetup('cricket');
        setRemembered(null);
        setVariant(DEFAULT_VARIANT);
        setFlyingDarts('players');
        setPlayers([]);
    };

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        saveSetup('cricket', { settings: { variant, flyingDarts }, players });
        const game = CricketModels.CricketGameModel;
        const playerIds = players.map(player => player.id);
        try {
            const newGame = await CricketService.createCricketGame({
                ...game,
                variant,
                flyingDarts,
                isSoloGame: false,
                numberOfPlayers: playerIds.length,
                players: playerIds,
                currentPlayerTurn: playerIds[0],
                playerModels: Object.fromEntries(playerIds.map(playerId => [playerId, { ...CricketModels.CricketPlayerModel, score: Number(game.startingScore) }])),
            });
            navigate('/cricket/' + newGame.id);
        } catch (error) {
            toast.current.show({ severity: 'error', summary: t('Start Game'), detail: t('Failed to create the game. ') + error.message, life: 4000 });
            setStarting(false);
        }
    };

    return (
        <>
            <Panel header={t('Cricket')} className="w-100 w-md-75 w-xxl-50 mx-auto" icons={rulesButton}>
                {rules}
                <div className="container">
                    {remembered && <GameSetupMemory onReset={startFresh} />}
                    <p className="game-setup-section-title">{t('Players')}</p>
                    <PlayerPicker selected={players} onChange={setPlayers} initialIds={remembered?.playerIds} key={remembered ? 'remembered' : 'fresh'} />

                    <p className="game-setup-section-title mt-4">{t('Game')}</p>
                    <div>
                        <p className="setting-title">{t('Variant')}</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column align-items-center gap-2">
                                <SelectButton
                                    value={variant}
                                    onChange={(e) => e.value && setVariant(e.value)}
                                    optionLabel="value"
                                    options={CRICKET_VARIANTS}
                                    className="p-selectbutton-pills flex-wrap"
                                />
                                <span className="text-faint fs-8 text-center">{CRICKET_VARIANTS.find(option => option.value === variant)?.description}</span>
                            </div>
                        </div>
                    </div>
                    <FlyingDartsConfig value={flyingDarts} onChange={setFlyingDarts} />
                    <GameSetupStart summary={t('Cricket{{value}} · {{playersSummary}}', { value: variant === DEFAULT_VARIANT ? '' : ` ${variant}`, playersSummary: playersSummary(players) })} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default CricketConfig;
