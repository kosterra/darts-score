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
import { clearSetup, isFormat, loadSetup, saveSetup } from '../../../utils/setup.memory';
import useClubGameRules from '../club_rules/use.club.game.rules';
import QuickFormats from '../config_components/quick.formats';
import { FriendlyGame, HouseRules, NotPlayedHere, SettingTitle } from '../club_rules/club.rules.setup';
import { t } from '../../../utils/i18n';
import useLinkedPlayers from '../../../utils/use.linked.players';
import useGameRules from '../../games/common/game.rules';

const CricketConfig = () => {
    // the rules of the game, opened from the title of the setup
    const [rulesButton, rules] = useGameRules('cricket');
    // the page starts set up like the last game
    const club = useClubGameRules('cricket');
    const [players, setPlayers] = useState([]);
    const [remembered, setRemembered] = useState(() => loadSetup('cricket'));
    // players chosen by a link, e.g. from the player comparison
    const linkedPlayers = useLinkedPlayers();
    // the variant and the house rules, within the club's rules
    const [settings, setSettings] = useState(() => club.start(remembered?.settings));
    const { variant } = settings;
    const change = (key, value) => setSettings(current => club.withLocks({ ...current, [key]: value }));
    const [flyingDarts, setFlyingDarts] = useState(remembered?.settings?.flyingDarts ?? 'players');
    const [friendlyChosen, setFriendlyChosen] = useState(Boolean(remembered?.friendly) && club.friendlyChoice);
    const formats = club.quickFormats();
    const clubFormat = club.formats.find(format => isFormat(settings, format, players.length)) ?? null;
    const friendly = club.friendlyChoice ? friendlyChosen : Boolean(clubFormat?.friendly);
    const applyFormat = (formatSettings, format) => {
        setSettings(current => club.withLocks({ ...current, ...formatSettings }));
        if (format?.club && club.friendlyChoice) setFriendlyChosen(format.friendly);
    };
    const [starting, setStarting] = useState(false);

    const toast = useRef(null);
    const navigate = useNavigate();

    const missing = missingPlayers(players);

    const startFresh = () => {
        clearSetup('cricket');
        setRemembered(null);
        setSettings(club.start());
        setFlyingDarts('players');
        setFriendlyChosen(false);
        setPlayers([]);
    };

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        saveSetup('cricket', { settings: { ...settings, flyingDarts }, players, friendly });
        const game = CricketModels.CricketGameModel;
        const playerIds = players.map(player => player.id);
        try {
            const newGame = await CricketService.createCricketGame({
                ...game,
                ...club.withLocks(settings),
                flyingDarts,
                ...(friendly ? { friendly: true } : {}),
                ...(clubFormat ? { format: clubFormat.id } : {}),
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
            <Panel header={t('Cricket')} className="page-narrow" icons={rulesButton}>
                {rules}
                {!club.enabled ? <NotPlayedHere title={t('Cricket')} /> :
                <div className="container">
                    {remembered && <GameSetupMemory onReset={startFresh} />}
                    <p className="game-setup-section-title">{t('Players')}</p>
                    <PlayerPicker selected={players} onChange={setPlayers} initialIds={linkedPlayers ?? remembered?.playerIds} key={linkedPlayers ? `linked-${linkedPlayers.join()}` : remembered ? 'remembered' : 'fresh'} />

                    <p className="game-setup-section-title mt-4">{t('Game')}</p>
                    {formats.length > 0 && <QuickFormats game="cricket" formats={formats} settings={settings} playerCount={players.length} onApply={applyFormat} />}
                    <div>
                        <SettingTitle locked={club.locked('variant')}>{t('Variant')}</SettingTitle>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column align-items-center gap-2">
                                <SelectButton
                                    value={variant}
                                    onChange={(e) => e.value && change('variant', e.value)}
                                    optionLabel="label"
                                    options={club.locked('variant') ? CRICKET_VARIANTS.filter(option => option.value === variant) : club.options('variant', CRICKET_VARIANTS)}
                                    disabled={club.locked('variant')}
                                    className="p-selectbutton-pills flex-wrap"
                                />
                                <span className="text-faint fs-8 text-center">{CRICKET_VARIANTS.find(option => option.value === variant)?.description}</span>
                            </div>
                        </div>
                    </div>
                    <HouseRules game="cricket" club={club} settings={settings} onChange={change} />
                    <FlyingDartsConfig value={flyingDarts} onChange={setFlyingDarts} />
                    <FriendlyGame club={club} value={friendly} onChange={setFriendlyChosen} />
                    <GameSetupStart summary={[t('Cricket{{value}} · {{playersSummary}}', { value: variant === DEFAULT_VARIANT ? '' : ` ${CRICKET_VARIANTS.find(option => option.value === variant)?.label ?? variant}`, playersSummary: playersSummary(players) }), friendly ? t('Friendly') : null].filter(Boolean).join(' · ')} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>}
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default CricketConfig;
