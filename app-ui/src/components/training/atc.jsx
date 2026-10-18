import { useState, useEffect, useMemo, useRef } from 'react';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';

import PlayerPicker from '../game_config/config_components/player.picker';
import GameSetupMemory from '../game_config/config_components/game.setup.memory';
import ATCScoreboard from './atc.scoreboard';
import ATCModeConfig from './atc.mode.config';
import ATCStopwatch from './atc.stopwatch';
import ATCService from "../../services/atc.service";
import ClubService from '../../services/club.service';
import { useAuth } from '../../utils/auth.context';
import ATCConfigOptions from './atc.config.options';
import Celebration from '../badges/celebration';
import useStopwatch from '../../utils/use.stopwatch';
import useWakeLock from '../../utils/use.wake.lock';
import useCountdown from '../../utils/use.countdown';
import { resultLine, scoreboardRows } from '../../utils/atc.scoreboard';
import { clearSetup, loadSetup, saveSetup } from '../../utils/setup.memory';

const ATC = () => {
    const { user, activeClub } = useAuth();
    // the player the logged-in user plays as in this club, for "Mine" on the scoreboard
    const [myPlayerId, setMyPlayerId] = useState(null);
    // the page starts set up like the last training
    const [remembered, setRemembered] = useState(() => loadSetup('atc'));
    const [players, setPlayers] = useState([]);
    const [mode, setMode] = useState(remembered?.settings?.mode ?? ATCConfigOptions.modeOptions.default);
    const [atcEntries, setATCEntries] = useState([]);
    const [saving, setSaving] = useState(false);
    // what to celebrate after a training: { title, subtitle, player, badgeGroups }
    const [celebration, setCelebration] = useState(null);
    // shown once the new time has reached its place on the scoreboard
    const pendingCelebration = useRef(null);
    const [scoreboardView, setScoreboardView] = useState({ period: 'all', list: 'best' });
    // the time just saved: it moves up the scoreboard, and a line says where it ended up
    const [arrival, setArrival] = useState(null);
    const toast = useRef(null);

    const [withCountdown, setWithCountdown] = useState(remembered?.settings?.countdown ?? true);
    const watch = useStopwatch();
    const countdown = useCountdown(watch.start);
    // player and mode stay as they are from the start until the time is saved or discarded
    const inProgress = watch.running || watch.elapsedMs > 0 || countdown.count !== null;
    useWakeLock(inProgress);

    const player = players[0];

    useEffect(() => {
        setArrival(null);
        loadATCEntries();
    }, [mode]);

    useEffect(() => {
        if (!user || !activeClub) return;
        ClubService.findPlayerOfUser(activeClub.id, user.id).then(player => setMyPlayerId(player?.id ?? null)).catch(() => setMyPlayerId(null));
    }, [user?.id, activeClub?.id]);

    const result = useMemo(() => {
        if (!arrival) return null;
        const line = resultLine(scoreboardRows(atcEntries, { ...scoreboardView, myPlayerId }), arrival);
        return arrival.isRecord ? ['New personal best', line].filter(Boolean).join(' · ') : line;
    }, [arrival, atcEntries, scoreboardView, myPlayerId]);

    const onArrived = (row) => {
        const waiting = pendingCelebration.current;
        pendingCelebration.current = null;
        // after the podium moment, if there was one
        if (waiting) setTimeout(() => setCelebration(waiting), row?.rank <= 3 ? 2200 : 400);
    };

    const loadATCEntries = async () => {
        setATCEntries(await ATCService.loadATCEntries(mode));
    };

    const startFresh = () => {
        clearSetup('atc');
        setRemembered(null);
        setMode(ATCConfigOptions.modeOptions.default);
        setWithCountdown(true);
        setPlayers([]);
    };

    const saveChallenge = async (timeMs) => {
        setSaving(true);
        saveSetup('atc', { settings: { mode, countdown: withCountdown }, players });
        try {
            const saved = await ATCService.createATCEntry({ timeMs, mode, player: { id: player.id } });
            watch.reset();
            pendingCelebration.current = saved.isRecord || saved.newBadges?.length > 0
                ? {
                    title: saved.isRecord ? 'New record!' : 'New badge!',
                    subtitle: saved.isRecord ? `A new personal best in ${mode}` : 'Training complete',
                    player,
                    badgeGroups: saved.newBadges?.length > 0 ? [{ player, badges: saved.newBadges }] : []
                }
                : null;
            await loadATCEntries();
            setArrival({ id: saved.id, player: saved.player, timeMs: saved.timeMs, isRecord: saved.isRecord });
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
                            <ATCStopwatch
                                watch={watch}
                                countdown={countdown}
                                withCountdown={withCountdown}
                                onWithCountdownChange={setWithCountdown}
                                canStart={Boolean(player)}
                                onStart={() => setArrival(null)}
                                saving={saving}
                                onSave={saveChallenge}
                            />
                            {result && !inProgress && <div className="atc-result" role="status">{result}</div>}
                        </div>
                    </Panel>
                </div>
                <div className="col-12 col-xl-6">
                    <ATCScoreboard
                        entries={atcEntries}
                        mode={mode}
                        arrival={arrival}
                        view={scoreboardView}
                        onViewChange={setScoreboardView}
                        myPlayerId={myPlayerId}
                        onArrived={onArrived}
                    />
                </div>
            </div>
            {celebration && <Celebration {...celebration} onClose={() => setCelebration(null)} />}
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ATC;
