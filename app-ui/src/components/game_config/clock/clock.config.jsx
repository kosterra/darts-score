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
import { clearSetup, loadSetup, saveSetup } from '../../../utils/setup.memory';

const MODES = ATCConfigOptions.modeOptions.values;
const DEFAULT_MODE = 'All';

/**
 * The setup of an Around the Clock game: two to four players, the ring that
 * counts and, when every ring counts, whether doubles and trebles move on.
 */
const ClockConfig = () => {
    // the page starts set up like the last game
    const [remembered, setRemembered] = useState(() => loadSetup('clock'));
    const [mode, setMode] = useState(remembered?.settings?.mode ?? DEFAULT_MODE);
    const [skipAhead, setSkipAhead] = useState(remembered?.settings?.skipAhead ?? false);
    const [players, setPlayers] = useState([]);
    const [starting, setStarting] = useState(false);
    const toast = useRef(null);
    const navigate = useNavigate();

    const missing = missingPlayers(players);
    const skips = skipAhead && mode === 'All';
    const summary = `${mode}${skips ? ' · doubles and trebles move on' : ''} · ${playersSummary(players)}`;

    const startFresh = () => {
        clearSetup('clock');
        setRemembered(null);
        setMode(DEFAULT_MODE);
        setSkipAhead(false);
        setPlayers([]);
    };

    const handleSubmit = async () => {
        if (missing) return;
        setStarting(true);
        saveSetup('clock', { settings: { mode, skipAhead }, players });
        try {
            const created = await ClockService.createClockGame(newClockGame({ players: players.map(player => player.id), mode, skipAhead }));
            navigate(`/clock/${created.id}`);
        } catch (err) {
            toast.current.show({ severity: 'error', summary: 'Start game', detail: `Failed to create the game. ${err.message}`, life: 4000 });
            setStarting(false);
        }
    };

    return (
        <>
            <Panel header="Around the Clock" className="w-100 w-md-75 w-xxl-50 mx-auto">
                <div className="container">
                    {remembered && <GameSetupMemory onReset={startFresh} />}
                    <p className="game-setup-section-title">Players</p>
                    <PlayerPicker selected={players} onChange={setPlayers} initialIds={remembered?.playerIds} key={remembered ? 'remembered' : 'fresh'} />

                    <p className="game-setup-section-title mt-4">Game</p>
                    <div className="setting-box">
                        <p className="setting-title">Mode</p>
                        <div className="d-flex flex-column align-items-center gap-2">
                        <SelectButton
                            value={mode}
                            onChange={(e) => e.value && setMode(e.value)}
                            optionLabel="value"
                            options={MODES}
                            className="p-selectbutton-pills flex-wrap justify-content-center"
                            aria-label="Mode"
                        />
                        <span className="text-faint fs-8 text-center">{MODES.find(option => option.value === mode)?.description}</span>
                        </div>
                    </div>
                    {mode === 'All' &&
                        <label className="clock-skip-switch">
                            <InputSwitch checked={skipAhead} onChange={(e) => setSkipAhead(e.value)} />
                            <span>
                                <span className="d-block text-default fw-semibold fs-7">Doubles and trebles move on</span>
                                <span className="d-block text-faint fs-8">A double moves on two numbers, a treble three. The bull still has to be hit.</span>
                            </span>
                        </label>
                    }
                    <p className="text-faint fs-8 text-center mb-0">
                        1 to 20, then the bull. The first to finish wins once the round is complete; finished in the same round, fewer darts win.
                    </p>
                    <GameSetupStart summary={summary} missing={missing} loading={starting} onStart={handleSubmit} />
                </div>
            </Panel>
            <Toast ref={toast} position="bottom-right" />
        </>
    );
};

export default ClockConfig;
