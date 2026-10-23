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
import RulesService from '../../services/rules.service';
import { gameOf } from '../../rules/games';
import { settingsOf, withGameState } from '../../rules/engine';
import { clearSetup, isFormat, loadSetup, saveSetup } from '../../utils/setup.memory';
import QuickFormats from '../game_config/config_components/quick.formats';
import useClubGameRules from '../game_config/club_rules/use.club.game.rules';
import { FriendlyGame, HouseRules, NotPlayedHere, SettingTitle } from '../game_config/club_rules/club.rules.setup';
import { HALVE_IT_CLASSIC, HALVE_IT_SHORT } from '../../rules/club.rules';
import { t } from '../../utils/i18n';
import useGameRules from '../games/common/game.rules';

const defaultsOf = (definition) => settingsOf(definition, {});

/**
 * The setup of a game of the rules engine: the players, the options of the
 * game (e.g. the rounds of Shanghai) and the rules to read before starting.
 */
const RulesGameSetup = () => {
    const { kind } = useParams();
    const definition = gameOf(kind);
    const memoryKey = `rules.${kind}`;
    const club = useClubGameRules(kind);
    const [remembered, setRemembered] = useState(() => loadSetup(memoryKey));
    // the options and house rules, within the club's rules
    const [settings, setSettings] = useState(() => club.start(definition ? defaultsOf(definition) : {}, remembered?.settings ?? {}));
    const change = (key, value) => setSettings(current => club.withLocks({ ...current, [key]: value }));
    const [friendlyChosen, setFriendlyChosen] = useState(Boolean(remembered?.friendly) && club.friendlyChoice);
    const [flyingDarts, setFlyingDarts] = useState(remembered?.settings?.flyingDarts ?? 'players');
    const [players, setPlayers] = useState([]);
    const [starting, setStarting] = useState(false);
    const toast = useRef(null);
    const navigate = useNavigate();
    // a game the players may not know yet: its rules open from the start
    const [rulesButton, rules] = useGameRules(kind, true);

    if (!definition) return <Navigate replace to="/play" />;

    const formats = club.quickFormats();
    const clubFormat = club.formats.find(format => isFormat(settings, format, players.length)) ?? null;
    const friendly = club.friendlyChoice ? friendlyChosen : Boolean(clubFormat?.friendly);
    const applyFormat = (formatSettings, format) => {
        setSettings(current => club.withLocks({ ...current, ...formatSettings }));
        if (format?.club && club.friendlyChoice) setFriendlyChosen(format.friendly);
    };

    const min = definition.minPlayers;
    const missing = players.length < min
        ? (players.length === 0 && min === 1 ? t('Choose the players') : t('Choose {{value}} more player', { value: min - players.length }))
        : null;
    const chosen = (definition.options ?? []).map(option => option.values.find(value => value.value === settings[option.key])?.label).filter(Boolean);
    const summary = [...chosen, friendly ? t('Friendly') : null, playersSummary(players)].filter(Boolean).join(' · ');

    const startFresh = () => {
        clearSetup(memoryKey);
        setRemembered(null);
        setSettings(club.start(defaultsOf(definition)));
        setFlyingDarts('players');
        setFriendlyChosen(false);
        setPlayers([]);
    };

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        // the options of the game and its house rules, with the club's locks
        const options = club.withLocks(Object.fromEntries(Object.entries(settings).filter(([key]) => key !== 'flyingDarts')));
        saveSetup(memoryKey, { settings: { ...options, flyingDarts }, players, friendly });
        const ids = players.map(player => player.id);
        // Halve-It keeps the targets of its rounds with the game, so a later change of the club's targets leaves it alone
        const withTargets = kind === 'halveit'
            ? { ...options, targetList: options.targets === 'club' ? club.rules.halveItTargets : options.targets === 'short' ? HALVE_IT_SHORT : HALVE_IT_CLASSIC }
            : options;
        const prepared = definition.prepare ? definition.prepare(withTargets, ids) : withTargets;
        try {
            const created = await RulesService.createGame({
                ...withGameState(definition, { kind, players: ids, settings: prepared, visits: [], flyingDarts }),
                ...(friendly ? { friendly: true } : {}),
                ...(clubFormat ? { format: clubFormat.id } : {}),
            });
            navigate(`/play/${kind}/${created.id}`);
        } catch (err) {
            toast.current.show({ severity: 'error', summary: t('Start game'), detail: t('Failed to create the game. {{message}}', { message: err.message }), life: 4000 });
            setStarting(false);
        }
    };

    return (
        <div className="container-fluid p-4 border-0">
            <Panel header={definition.title} className="w-100 w-md-75 w-xxl-50 mx-auto" icons={rulesButton}>
                {rules}
                {!club.enabled ? <NotPlayedHere title={definition.title} /> :
                <div className="container">
                    {remembered && <GameSetupMemory onReset={startFresh} />}
                    <p className="game-setup-section-title">{t('Players')}</p>
                    <PlayerPicker selected={players} onChange={setPlayers} initialIds={remembered?.playerIds} minPlayers={min} key={remembered ? 'remembered' : 'fresh'} />

                    <p className="game-setup-section-title mt-4">{t('Game')}</p>
                    {formats.length > 0 && <QuickFormats formats={formats} settings={settings} playerCount={players.length} onApply={applyFormat} />}
                    {(definition.options ?? []).map(option => {
                        const locked = club.locked(option.key);
                        return (
                            <div className="setting-box" key={option.key}>
                                <SettingTitle locked={locked}>{option.label}</SettingTitle>
                                <div className="d-flex justify-content-center">
                                    <SelectButton
                                        value={settings[option.key]}
                                        onChange={(e) => e.value !== null && e.value !== undefined && change(option.key, e.value)}
                                        options={locked ? option.values.filter(value => value.value === settings[option.key]) : club.options(option.key, option.values)}
                                        disabled={locked}
                                        className="p-selectbutton-pills flex-wrap justify-content-center"
                                        aria-label={option.label}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    <HouseRules game={kind} club={club} settings={settings} onChange={change} />
                    <div className="setting-box">
                        <FlyingDartsConfig value={flyingDarts} onChange={setFlyingDarts} />
                    </div>

                    <FriendlyGame club={club} value={friendly} onChange={setFriendlyChosen} />
                    <GameSetupStart summary={summary} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>}
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default RulesGameSetup;
