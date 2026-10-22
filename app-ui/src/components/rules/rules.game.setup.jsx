import { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';

import PlayerPicker from '../game_config/config_components/player.picker';
import GameSetupStart from '../game_config/config_components/game.setup.start';
import GameSetupMemory from '../game_config/config_components/game.setup.memory';
import FlyingDartsConfig from '../game_config/config_components/flying.darts.config';
import { playersSummary } from '../game_config/config_components/game.setup.summary';
import RulesList from './rules.list';
import RulesService from '../../services/rules.service';
import { gameOf } from '../../rules/games';
import { settingsOf, withGameState } from '../../rules/engine';
import { clearSetup, loadSetup, saveSetup } from '../../utils/setup.memory';
import { t } from '../../utils/i18n';

const defaultsOf = (definition) => settingsOf(definition, {});

/**
 * The setup of a game of the rules engine: the players, the options of the
 * game (e.g. the rounds of Shanghai) and the rules to read before starting.
 */
const RulesGameSetup = () => {
    const { kind } = useParams();
    const definition = gameOf(kind);
    const memoryKey = `rules.${kind}`;
    const [remembered, setRemembered] = useState(() => loadSetup(memoryKey));
    const [settings, setSettings] = useState(() => ({ ...(definition ? defaultsOf(definition) : {}), ...(remembered?.settings ?? {}) }));
    const [flyingDarts, setFlyingDarts] = useState(remembered?.settings?.flyingDarts ?? 'players');
    const [players, setPlayers] = useState([]);
    const [starting, setStarting] = useState(false);
    const toast = useRef(null);
    const navigate = useNavigate();

    if (!definition) return <Navigate replace to="/play" />;

    const min = definition.minPlayers;
    const missing = players.length < min
        ? (players.length === 0 && min === 1 ? t('Choose the players') : t('Choose {{value}} more player', { value: min - players.length }))
        : null;
    const chosen = (definition.options ?? []).map(option => option.values.find(value => value.value === settings[option.key])?.label).filter(Boolean);
    const summary = [...chosen, playersSummary(players)].filter(Boolean).join(' · ');

    const startFresh = () => {
        clearSetup(memoryKey);
        setRemembered(null);
        setSettings(defaultsOf(definition));
        setFlyingDarts('players');
        setPlayers([]);
    };

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        const options = Object.fromEntries((definition.options ?? []).map(option => [option.key, settings[option.key]]));
        saveSetup(memoryKey, { settings: { ...options, flyingDarts }, players });
        const ids = players.map(player => player.id);
        const prepared = definition.prepare ? definition.prepare(options, ids) : options;
        try {
            const created = await RulesService.createGame(withGameState(definition, { kind, players: ids, settings: prepared, visits: [], flyingDarts }));
            navigate(`/play/${kind}/${created.id}`);
        } catch (err) {
            toast.current.show({ severity: 'error', summary: t('Start game'), detail: t('Failed to create the game. {{message}}', { message: err.message }), life: 4000 });
            setStarting(false);
        }
    };

    return (
        <div className="container-fluid p-4 border-0">
            <Panel header={definition.title} className="w-100 w-md-75 w-xxl-50 mx-auto">
                <div className="container">
                    {remembered && <GameSetupMemory onReset={startFresh} />}
                    <p className="game-setup-section-title">{t('Players')}</p>
                    <PlayerPicker selected={players} onChange={setPlayers} initialIds={remembered?.playerIds} minPlayers={min} key={remembered ? 'remembered' : 'fresh'} />

                    <p className="game-setup-section-title mt-4">{t('Game')}</p>
                    {(definition.options ?? []).map(option => (
                        <div className="setting-box" key={option.key}>
                            <p className="setting-title">{option.label}</p>
                            <div className="d-flex justify-content-center">
                                <SelectButton
                                    value={settings[option.key]}
                                    onChange={(e) => e.value !== null && e.value !== undefined && setSettings({ ...settings, [option.key]: e.value })}
                                    options={option.values}
                                    className="p-selectbutton-pills flex-wrap justify-content-center"
                                    aria-label={option.label}
                                />
                            </div>
                        </div>
                    ))}
                    <div className="setting-box">
                        <FlyingDartsConfig value={flyingDarts} onChange={setFlyingDarts} />
                    </div>

                    <p className="game-setup-section-title mt-4">{t('Rules')}</p>
                    <RulesList rules={definition.rules} />
                    <GameSetupStart summary={summary} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default RulesGameSetup;
