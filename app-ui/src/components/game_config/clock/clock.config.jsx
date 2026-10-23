import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { InputSwitch } from 'primereact/inputswitch';

import PlayerPicker from '../config_components/player.picker';
import GameSetupStart from '../config_components/game.setup.start';
import GameSetupMemory from '../config_components/game.setup.memory';
import { missingPlayers, playersSummary } from '../config_components/game.setup.summary';
import ATCConfigOptions from '../../training/atc.config.options';
import ClockService from '../../../services/clock.service';
import { newClockGame } from '../../../utils/clock.game';
import { clearSetup, isFormat, loadSetup, saveSetup } from '../../../utils/setup.memory';
import QuickFormats from '../config_components/quick.formats';
import useClubGameRules from '../club_rules/use.club.game.rules';
import { ClubRuleMark, FriendlyGame, NotPlayedHere, SettingTitle } from '../club_rules/club.rules.setup';
import { t } from '../../../utils/i18n';
import useGameRules from '../../games/common/game.rules';

const MODES = ATCConfigOptions.modeOptions.values;

/**
 * The setup of an Around the Clock game: two to four players, the ring that
 * counts and, when every ring counts, whether doubles and trebles move on.
 */
const ClockConfig = () => {
    // the rules of the game, opened from the title of the setup
    const [rulesButton, rules] = useGameRules('clock');
    // the page starts set up like the last game
    const club = useClubGameRules('clock');
    const [remembered, setRemembered] = useState(() => loadSetup('clock'));
    // the ring that counts and whether doubles and trebles move on, within the club's rules
    const [settings, setSettings] = useState(() => club.start(remembered?.settings));
    const { mode, skipAhead } = settings;
    const change = (key, value) => setSettings(current => club.withLocks({ ...current, [key]: value }));
    const [players, setPlayers] = useState([]);
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
    const skips = skipAhead && mode === 'All';
    const summary = `${mode}${skips ? t(' · doubles and trebles move on') : ''}${friendly ? ` · ${t('Friendly')}` : ''} · ${playersSummary(players)}`;

    const startFresh = () => {
        clearSetup('clock');
        setRemembered(null);
        setSettings(club.start());
        setPlayers([]);
        setFriendlyChosen(false);
    };

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        saveSetup('clock', { settings: { mode, skipAhead }, players, friendly });
        try {
            const created = await ClockService.createClockGame({
                ...newClockGame({ players: players.map(player => player.id), ...club.withLocks({ mode, skipAhead }) }),
                ...(friendly ? { friendly: true } : {}),
                ...(clubFormat ? { format: clubFormat.id } : {}),
            });
            navigate(`/clock/${created.id}`);
        } catch (err) {
            toast.current.show({ severity: 'error', summary: t('Start game'), detail: t('Failed to create the game. {{message}}', { message: err.message }), life: 4000 });
            setStarting(false);
        }
    };

    return (
        <>
            <Panel header={t('Around the Clock')} className="w-100 w-md-75 w-xxl-50 mx-auto" icons={rulesButton}>
                {rules}
                {!club.enabled ? <NotPlayedHere title={t('Around the Clock')} /> :
                <div className="container">
                    {remembered && <GameSetupMemory onReset={startFresh} />}
                    <p className="game-setup-section-title">{t('Players')}</p>
                    <PlayerPicker selected={players} onChange={setPlayers} initialIds={remembered?.playerIds} key={remembered ? 'remembered' : 'fresh'} />

                    <p className="game-setup-section-title mt-4">{t('Game')}</p>
                    {formats.length > 0 && <QuickFormats formats={formats} settings={settings} playerCount={players.length} onApply={applyFormat} />}
                    <div className="setting-box">
                        <SettingTitle locked={club.locked('mode')}>{t('Mode')}</SettingTitle>
                        <div className="d-flex flex-column align-items-center gap-2">
                        <SelectButton
                            value={mode}
                            onChange={(e) => e.value && change('mode', e.value)}
                            optionLabel="value"
                            options={club.locked('mode') ? MODES.filter(option => option.value === mode) : club.options('mode', MODES)}
                            disabled={club.locked('mode')}
                            className="p-selectbutton-pills flex-wrap justify-content-center"
                            aria-label={t('Mode')}
                        />
                        <span className="text-faint fs-8 text-center">{MODES.find(option => option.value === mode)?.description}</span>
                        </div>
                    </div>
                    {mode === 'All' &&
                        <label className="clock-skip-switch">
                            <InputSwitch checked={skipAhead} onChange={(e) => change('skipAhead', e.value)} disabled={club.locked('skipAhead')} />
                            <span>
                                <span className="d-block text-default fw-semibold fs-7">{t('Doubles and trebles move on')}{club.locked('skipAhead') && <> <ClubRuleMark /></>}</span>
                                <span className="d-block text-faint fs-8">{t('A double moves on two numbers, a treble three. The bull still has to be hit.')}</span>
                            </span>
                        </label>
                    }
                    <p className="text-faint fs-8 text-center mb-0">
                        {t('1 to 20, then the bull. The first to finish wins once the round is complete; finished in the same round, fewer darts win.')}
                    </p>
                    <FriendlyGame club={club} value={friendly} onChange={setFriendlyChosen} />
                    <GameSetupStart summary={summary} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>}
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default ClockConfig;
