import { useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';

import EliminationScoreConfig from '../config_components/elimination.score.config';
import EliminationInOutConfig from '../config_components/elimination.inout.config';
import PlayerPicker from '../config_components/player.picker';
import GameSetupStart from '../config_components/game.setup.start';
import FlyingDartsConfig from '../config_components/flying.darts.config';
import GameSetupMemory from '../config_components/game.setup.memory';
import { missingPlayers, playersSummary } from '../config_components/game.setup.summary';
import EliminationModels from '../../../models/elimination.models';
import EliminationService from '../../../services/elimination.service';
import { clearSetup, isFormat, loadSetup, saveSetup } from '../../../utils/setup.memory';
import ScoreConfigOptions from '../config_options/score.config.options';
import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';
import QuickFormats from '../config_components/quick.formats';
import useClubGameRules from '../club_rules/use.club.game.rules';
import { FriendlyGame, NotPlayedHere } from '../club_rules/club.rules.setup';
import { t } from '../../../utils/i18n';
import useLinkedPlayers from '../../../utils/use.linked.players';
import useGameRules from '../../games/common/game.rules';

const EliminationConfig = () => {
    // the rules of the game, opened from the title of the setup
    const [rulesButton, rules] = useGameRules('elimination');
    // the page starts set up like the last game
    const club = useClubGameRules('elimination');
    const [remembered, setRemembered] = useState(() => loadSetup('elimination'));
    // players chosen by a link, e.g. from the player comparison
    const linkedPlayers = useLinkedPlayers();
    const [game, setGame] = useState(() => ({ ...EliminationModels.EliminationModel, ...club.start(remembered?.settings) }));
    const [players, setPlayers] = useState([]);
    const [friendlyChosen, setFriendlyChosen] = useState(Boolean(remembered?.friendly) && club.friendlyChoice);
    const formats = club.quickFormats();
    const clubFormat = club.formats.find(format => isFormat(game, format, players.length)) ?? null;
    const friendly = club.friendlyChoice ? friendlyChosen : Boolean(clubFormat?.friendly);
    const applyFormat = (settings, format) => {
        setGame(current => club.withLocks({ ...current, ...settings }));
        if (format?.club && club.friendlyChoice) setFriendlyChosen(format.friendly);
    };
    const [starting, setStarting] = useState(false);
    const toast = useRef(null);
    const navigate = useNavigate();

    const handleConfigChange = (name, value) => {
        const next = ['gameInMode', 'gameOutMode', 'flyingDarts'].includes(name) ? value : Number(value);
        setGame(prev => club.withLocks({ ...prev, [name]: next }));
    };

    const missing = missingPlayers(players);

    const startFresh = () => {
        clearSetup('elimination');
        setRemembered(null);
        setGame({ ...EliminationModels.EliminationModel, ...club.start() });
        setPlayers([]);
        setFriendlyChosen(false);
    };
    const summary = [`${game.targetScore} · ${game.gameInMode} / ${game.gameOutMode}`, friendly ? t('Friendly') : null, playersSummary(players)].filter(Boolean).join(' · ');

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        saveSetup('elimination', { settings: { targetScore: game.targetScore, gameInMode: game.gameInMode, gameOutMode: game.gameOutMode, flyingDarts: game.flyingDarts }, players, friendly });
        const playerIds = players.map(p => p.id);
        const playerModels = {};
        playerIds.forEach(pid => {
            playerModels[pid] = { ...EliminationModels.EliminationPlayerModel };
        });

        try {
            const created = await EliminationService.createEliminationGame({
                ...club.withLocks(game),
                ...(friendly ? { friendly: true } : {}),
                ...(clubFormat ? { format: clubFormat.id } : {}),
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
                summary: t('Start Game'),
                detail: t('Failed to create the game. ') + err.message,
                life: 4000
            });
            setStarting(false);
        }
    };

    return (
        <>
            <Panel header={t('Elimination')} className="page-narrow" icons={rulesButton}>
                {rules}
                {!club.enabled ? <NotPlayedHere title={t('Elimination')} /> :
                <div className="container">
                    {remembered && <GameSetupMemory onReset={startFresh} />}
                    <p className="game-setup-section-title">{t('Players')}</p>
                    <PlayerPicker selected={players} onChange={setPlayers} initialIds={linkedPlayers ?? remembered?.playerIds} key={linkedPlayers ? `linked-${linkedPlayers.join()}` : remembered ? 'remembered' : 'fresh'} />

                    <p className="game-setup-section-title mt-4">{t('Game')}</p>
                    {formats.length > 0 && <QuickFormats game="elimination" formats={formats} settings={game} playerCount={players.length} onApply={applyFormat} />}
                    <EliminationScoreConfig
                        scoreOption={game.targetScore}
                        onScoreChange={handleConfigChange}
                        options={club.options('targetScore', ScoreConfigOptions.gameScoreOptions.values)}
                        locked={club.locked('targetScore')}
                    />
                    <EliminationInOutConfig
                        gameInOption={game.gameInMode}
                        gameOutOption={game.gameOutMode}
                        onInOutChange={handleConfigChange}
                        inOptions={club.options('gameInMode', SetsLegsConfigOptions.legInOptions.values)}
                        outOptions={club.options('gameOutMode', SetsLegsConfigOptions.legOutOptions.values)}
                        inLocked={club.locked('gameInMode')}
                        outLocked={club.locked('gameOutMode')}
                    />
                    <FlyingDartsConfig value={game.flyingDarts} onChange={(value) => handleConfigChange('flyingDarts', value)} />
                    <FriendlyGame club={club} value={friendly} onChange={setFriendlyChosen} />
                    <GameSetupStart summary={summary} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>}
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default EliminationConfig;
