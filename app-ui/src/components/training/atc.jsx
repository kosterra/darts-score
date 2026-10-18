import { useState, useEffect, useMemo, useRef } from 'react';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';

import PlayerPicker from '../game_config/config_components/player.picker';
import GameSetupMemory from '../game_config/config_components/game.setup.memory';
import ATCScoreboard from './atc.scoreboard';
import ATCModeConfig from './atc.mode.config';
import ATCStopwatch from './atc.stopwatch';
import ATCDartsRound from './atc.darts.round';
import ATCDartsResult from './atc.darts.result';
import ATCTrainingSummary from './atc.training.summary';
import ATCService from "../../services/atc.service";
import ClubService from '../../services/club.service';
import { useAuth } from '../../utils/auth.context';
import ATCConfigOptions from './atc.config.options';
import Celebration from '../badges/celebration';
import useStopwatch from '../../utils/use.stopwatch';
import useWakeLock from '../../utils/use.wake.lock';
import useCountdown from '../../utils/use.countdown';
import useAtcRound from '../../utils/use.atc.round';
import { roundResults } from '../../utils/atc.darts';
import { resultLine, scoreboardRows } from '../../utils/atc.scoreboard';
import { clearSetup, loadSetup, saveSetup } from '../../utils/setup.memory';

const SCORINGS = [
    { label: 'Against the clock', value: 'Time', description: 'Stop the clock with your last hit; the fastest time wins.' },
    { label: 'Fewest darts', value: 'Darts', description: 'Tap Hit or Miss for every dart; the fewest darts win. Up to four players take turns.' },
];

const names = (players) => players.length > 1
    ? `${players.slice(0, -1).map(player => player.nickname).join(', ')} and ${players.at(-1).nickname}`
    : players[0]?.nickname ?? '';

const ATC = () => {
    const { user, activeClub } = useAuth();
    // the player the logged-in user plays as in this club, for "Mine" on the scoreboard
    const [myPlayerId, setMyPlayerId] = useState(null);
    // a round with the fewest darts survives a reload: the page comes back to it
    const roundState = useAtcRound();
    const active = roundState.active;
    // the page starts set up like the last training
    const [remembered, setRemembered] = useState(() => active ? null : loadSetup('atc'));
    const [players, setPlayers] = useState(() => active?.players ?? []);
    const [scoring, setScoring] = useState(() => active ? 'Darts' : remembered?.settings?.scoring ?? 'Time');
    const [mode, setMode] = useState(() => active?.mode ?? remembered?.settings?.mode ?? ATCConfigOptions.modeOptions.default);
    const [atcEntries, setATCEntries] = useState([]);
    const [saving, setSaving] = useState(false);
    // the result of the round just played: { players, mode, results, order, saved, saving, error }
    const [finished, setFinished] = useState(null);
    // what to celebrate after a training: { title, subtitle, player, badgeGroups }
    const [celebration, setCelebration] = useState(null);
    // shown once the new trainings have reached their places on the scoreboard
    const pendingCelebration = useRef(null);
    const [scoreboardView, setScoreboardView] = useState({ period: 'all', list: 'best' });
    // the trainings just saved: they move up the scoreboard; { ids, entries }
    const [arrival, setArrival] = useState(null);
    const finishing = useRef(false);
    const toast = useRef(null);

    const [withCountdown, setWithCountdown] = useState(remembered?.settings?.countdown ?? true);
    const watch = useStopwatch();
    const countdown = useCountdown(watch.start);
    // players, scoring and mode stay as they are from the start until the training is saved or dropped
    const inProgress = watch.running || watch.elapsedMs > 0 || countdown.count !== null || Boolean(active);
    useWakeLock(inProgress);

    const darts = scoring === 'Darts';
    const player = players[0];
    // while a training runs (and its result shows) the setup folds into one line
    const playing = inProgress || Boolean(finished);
    const panelRef = useRef(null);

    // the play area moves up when the setup folds: bring it into view
    useEffect(() => {
        if (!playing) return;
        const top = panelRef.current?.getBoundingClientRect().top ?? 0;
        if (top < 0) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [playing]);

    useEffect(() => {
        setArrival(null);
        loadATCEntries();
    }, [mode, scoring]);

    useEffect(() => {
        if (!user || !activeClub) return;
        ClubService.findPlayerOfUser(activeClub.id, user.id).then(found => setMyPlayerId(found?.id ?? null)).catch(() => setMyPlayerId(null));
    }, [user?.id, activeClub?.id]);

    const rows = useMemo(() => scoreboardRows(atcEntries, { ...scoreboardView, myPlayerId }), [atcEntries, scoreboardView, myPlayerId]);

    // against the clock: where the time just saved ended up
    const timeResult = useMemo(() => {
        const saved = !darts && arrival?.entries?.[0];
        if (!saved) return null;
        const line = resultLine(rows, saved);
        return saved.isRecord ? ['New personal best', line].filter(Boolean).join(' · ') : line;
    }, [darts, arrival, rows]);

    const onArrived = (arrivedRows) => {
        const waiting = pendingCelebration.current;
        pendingCelebration.current = null;
        // after the podium moment, if there was one
        if (waiting) setTimeout(() => setCelebration(waiting), arrivedRows.some(row => row.rank <= 3) ? 2200 : 400);
    };

    const loadATCEntries = async () => {
        setATCEntries(await ATCService.loadATCEntries(mode, scoring));
    };

    // records first, then new badges; nothing to celebrate gives null
    const celebrationFor = (savedTrainings) => {
        const records = savedTrainings.filter(({ saved }) => saved.isRecord);
        const badgeGroups = savedTrainings.filter(({ saved }) => saved.newBadges?.length > 0).map(({ player: who, saved }) => ({ player: who, badges: saved.newBadges }));
        if (!records.length && !badgeGroups.length) return null;
        const what = `${mode}${darts ? ' with the fewest darts' : ''}`;
        return {
            title: records.length ? 'New record!' : 'New badge!',
            subtitle: records.length
                ? `A new personal best in ${what}${savedTrainings.length > 1 ? ` for ${names(records.map(({ player: who }) => who))}` : ''}`
                : 'Training complete',
            player: (records[0] ?? savedTrainings.find(({ saved }) => saved.newBadges?.length > 0)).player,
            badgeGroups,
        };
    };

    const rememberSetup = () => saveSetup('atc', { settings: { mode, scoring, countdown: withCountdown }, players });

    const startFresh = () => {
        clearSetup('atc');
        setRemembered(null);
        setScoring('Time');
        setMode(ATCConfigOptions.modeOptions.default);
        setWithCountdown(true);
        setPlayers([]);
    };

    const changeScoring = (value) => {
        setScoring(value);
        setFinished(null);
        // against the clock is one player at a time
        if (value === 'Time' && players.length > 1) setPlayers(players.slice(0, 1));
    };

    const saveChallenge = async (timeMs) => {
        setSaving(true);
        rememberSetup();
        try {
            const saved = await ATCService.createATCEntry({ scoring: 'Time', timeMs, mode, player: { id: player.id } });
            watch.reset();
            pendingCelebration.current = celebrationFor([{ player, saved }]);
            await loadATCEntries();
            setArrival({ ids: [saved.id], entries: [saved] });
        } catch {
            toast.current.show({ severity: 'error', summary: 'Training not saved', detail: 'The time is still here: try saving again.', life: 4000 });
        } finally {
            setSaving(false);
        }
    };

    const startRound = (order = players) => {
        rememberSetup();
        setFinished(null);
        setArrival(null);
        roundState.start(order, mode);
    };

    // saves everybody's result in the order they finished; what is saved is noted
    // in the round, so trying again (or a reload) does not save anything twice
    const saveRound = async (result) => {
        setFinished({ ...result, saving: true, error: false });
        const saved = { ...result.saved };
        try {
            for (const id of result.order) {
                if (saved[id]) continue;
                const { darts: count, perTarget } = result.results.find(({ playerId }) => playerId === id);
                saved[id] = await ATCService.createATCEntry({
                    scoring: 'Darts', mode: result.mode, darts: count, dartsPerTarget: perTarget, session: result.session, player: { id },
                });
                roundState.update(() => ({ saved: { ...saved } }));
            }
        } catch {
            setFinished({ ...result, saved, saving: false, error: true });
            return;
        } finally {
            finishing.current = false;
        }
        roundState.end();
        setFinished({ ...result, saved, saving: false, error: false });
        const playerOf = (id) => result.players.find(({ id: playerId }) => playerId === id);
        pendingCelebration.current = celebrationFor(result.order.map(id => ({ player: playerOf(id), saved: saved[id] })));
        await loadATCEntries();
        setArrival({ ids: result.order.map(id => saved[id].id), entries: result.order.map(id => saved[id]) });
    };

    // the last player is done: save the round
    useEffect(() => {
        if (!active?.round.done || finishing.current) return;
        finishing.current = true;
        saveRound({
            players: active.players,
            mode: active.mode,
            session: active.session,
            results: roundResults(active.round),
            order: active.round.finished,
            saved: active.saved ?? {},
        });
    }, [active?.round.done]);

    // play again: the same players, the first one throws last this time
    const playAgain = () => {
        const order = [...finished.players.slice(1), finished.players[0]];
        setPlayers(order);
        startRound(order);
    };

    const cancelRound = () => {
        roundState.end();
        setFinished(null);
    };

    return (
        <div className="col-12">
            <div className="row g-4">
                <div className="col-12 col-xl-6">
                    <div ref={panelRef} className="atc-panel-anchor">
                    <Panel header="Around the Clock">
                        <div className="container">
                            {playing && <ATCTrainingSummary players={active?.players ?? finished?.players ?? players} mode={active?.mode ?? finished?.mode ?? mode} scoring={scoring} />}
                            {!playing && <>
                            {remembered && <GameSetupMemory what="training" onReset={startFresh} />}
                            <p className="game-setup-section-title">{darts ? 'Players' : 'Player'}</p>
                            {/* a fieldset locks every card while a training runs */}
                            <fieldset disabled={inProgress} className="atc-setup-lock">
                                <PlayerPicker
                                    single={!darts}
                                    minPlayers={1}
                                    selected={players}
                                    onChange={setPlayers}
                                    initialIds={active ? [] : remembered?.playerIds}
                                    key={`${remembered ? 'remembered' : 'fresh'}-${darts ? 'darts' : 'time'}`}
                                />
                            </fieldset>

                            <p className="game-setup-section-title mt-4">Training</p>
                            <div className="d-flex flex-column align-items-center gap-2 mb-3">
                                <SelectButton
                                    value={scoring}
                                    options={SCORINGS}
                                    onChange={(e) => e.value && changeScoring(e.value)}
                                    disabled={inProgress}
                                    className="p-selectbutton-pills flex-wrap justify-content-center"
                                    aria-label="Scoring"
                                />
                                <span className="text-faint fs-8 text-center">{SCORINGS.find(option => option.value === scoring).description}</span>
                            </div>
                            <ATCModeConfig atcModeOption={mode} onATCModeChange={setMode} disabled={inProgress} />
                            </>}

                            <p className={`game-setup-section-title ${playing ? '' : 'mt-4'}`}>{darts ? (finished ? 'Result' : 'Round') : 'Stopwatch'}</p>
                            {darts
                                ? finished
                                    ? <ATCDartsResult
                                        finished={finished}
                                        placeOf={(id) => finished.saved[id] ? resultLine(rows, finished.saved[id]) : null}
                                        onRetry={() => saveRound(finished)}
                                        onPlayAgain={playAgain}
                                        onDone={() => setFinished(null)}
                                    />
                                    : active
                                        ? <ATCDartsRound
                                            players={active.players}
                                            mode={active.mode}
                                            round={active.round}
                                            onDart={roundState.dart}
                                            onUndo={roundState.undo}
                                            canUndo={active.past.length > 0}
                                            onCancel={cancelRound}
                                        />
                                        : <div className="atc-stopwatch">
                                            <div className="atc-stopwatch-actions">
                                                <Button type="button" label="Start round" icon="pi pi-play" className="atc-stopwatch-main" disabled={!players.length} onClick={() => startRound()} />
                                            </div>
                                            <div className="text-faint fs-8 text-center mt-2">
                                                {players.length ? `${names(players)} ${players.length > 1 ? 'take turns of three darts' : 'throws'}; H and M work on a keyboard.` : 'Choose who plays to start.'}
                                            </div>
                                        </div>
                                : <>
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
                                    {timeResult && !inProgress && <div className="atc-result" role="status">{timeResult}</div>}
                                </>
                            }
                        </div>
                    </Panel>
                    </div>
                </div>
                <div className="col-12 col-xl-6">
                    <ATCScoreboard
                        entries={atcEntries}
                        subtitle={`${mode} · ${darts ? 'fewest darts' : 'against the clock'}`}
                        noun={darts ? 'rounds' : 'times'}
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
