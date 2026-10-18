import { useState, useEffect, useRef } from 'react';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';

import PlayerPicker from '../game_config/config_components/player.picker';
import GameSetupMemory from '../game_config/config_components/game.setup.memory';
import ATCEntryList from './atc.enty.list';
import ATCModeConfig from './atc.mode.config';
import ATCStopwatch from './atc.stopwatch';
import ATCService from "../../services/atc.service";
import ATCConfigOptions from './atc.config.options';
import Celebration from '../badges/celebration';
import useStopwatch from '../../utils/use.stopwatch';
import useWakeLock from '../../utils/use.wake.lock';
import { formatTrainingTime } from '../../utils/training.time';
import { clearSetup, loadSetup, saveSetup } from '../../utils/setup.memory';

const ATC = () => {
    // the page starts set up like the last training
    const [remembered, setRemembered] = useState(() => loadSetup('atc'));
    const [players, setPlayers] = useState([]);
    const [mode, setMode] = useState(remembered?.settings?.mode ?? ATCConfigOptions.modeOptions.default);
    const [atcEntries, setATCEntries] = useState([]);
    const [saving, setSaving] = useState(false);
    // what to celebrate after a training: { title, subtitle, player, badgeGroups }
    const [celebration, setCelebration] = useState(null);
    const toast = useRef(null);

    const watch = useStopwatch();
    // player and mode stay as they are from the start until the time is saved or discarded
    const inProgress = watch.running || watch.elapsedMs > 0;
    useWakeLock(watch.running);

    const player = players[0];

    useEffect(() => {
        loadATCEntries();
    }, [mode]);

    const loadATCEntries = async () => {
        const data = await ATCService.loadATCEntries(mode);
        setATCEntries(data.sort((a, b) => a.timeMs - b.timeMs));
    };

    const startFresh = () => {
        clearSetup('atc');
        setRemembered(null);
        setMode(ATCConfigOptions.modeOptions.default);
        setPlayers([]);
    };

    const saveChallenge = async (timeMs) => {
        setSaving(true);
        saveSetup('atc', { settings: { mode }, players });
        try {
            const saved = await ATCService.createATCEntry({ timeMs, mode, player: { id: player.id } });
            watch.reset();
            if (saved.isRecord || saved.newBadges?.length > 0) {
                setCelebration({
                    title: saved.isRecord ? 'New record!' : 'New badge!',
                    subtitle: saved.isRecord ? `A new personal best in ${mode}` : 'Training complete',
                    player,
                    badgeGroups: saved.newBadges?.length > 0 ? [{ player, badges: saved.newBadges }] : []
                });
            }
            toast.current.show({ severity: 'success', summary: 'Training saved', detail: `${player.nickname} · ${mode} · ${formatTrainingTime(timeMs)}`, life: 3000 });
            loadATCEntries();
        } catch {
            toast.current.show({ severity: 'error', summary: 'Training not saved', detail: 'The time is still here: try saving again.', life: 4000 });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="col-12">
            <div className="row g-4">
                <div className="col-12 col-xl-6">
                    <Panel header="Around the Clock">
                        <div className="container">
                            {remembered && !inProgress && <GameSetupMemory what="training" onReset={startFresh} />}
                            <p className="game-setup-section-title">Player</p>
                            {/* a fieldset locks every card while the stopwatch has a time */}
                            <fieldset disabled={inProgress} className="atc-setup-lock">
                                <PlayerPicker
                                    single
                                    selected={players}
                                    onChange={setPlayers}
                                    initialIds={remembered?.playerIds}
                                    key={remembered ? 'remembered' : 'fresh'}
                                />
                            </fieldset>

                            <p className="game-setup-section-title mt-4">Mode</p>
                            <ATCModeConfig atcModeOption={mode} onATCModeChange={setMode} disabled={inProgress} />

                            <p className="game-setup-section-title mt-4">Stopwatch</p>
                            <ATCStopwatch watch={watch} canStart={Boolean(player)} saving={saving} onSave={saveChallenge} />
                        </div>
                    </Panel>
                </div>
                <div className="col-12 col-xl-6">
                    <ATCEntryList atcEntries={atcEntries} />
                </div>
            </div>
            {celebration && <Celebration {...celebration} onClose={() => setCelebration(null)} />}
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ATC;
