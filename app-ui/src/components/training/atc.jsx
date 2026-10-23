import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import NewBadges from '../badges/new.badges';
import { ClubBadgeNews } from '../badges/club.badges';
import useStopwatch from '../../utils/use.stopwatch';
import useClockMoment from '../../utils/use.clock.moment';
import ClockMoment from '../games/common/clock.moments';
import useWakeLock from '../../utils/use.wake.lock';
import useCountdown from '../../utils/use.countdown';
import useAtcRound from '../../utils/use.atc.round';
import { roundResults } from '../../utils/atc.darts';
import { resultLine, scoreboardRows } from '../../utils/atc.scoreboard';
import { clearSetup, loadSetup, saveSetup } from '../../utils/setup.memory';
import { t } from '../../utils/i18n';
import useGameRules from '../games/common/game.rules';

const SCORINGS = [
    { label: t('Against the clock'), value: 'Time', description: t('Stop the clock with your last hit; the fastest time wins.') },
    { label: t('Fewest darts'), value: 'Darts', description: t('Tap Hit or Miss for every dart; 21 is perfect. Against others: an Around the Clock game.') },
];

const names = (players) => players.length > 1
    ? t('{{join}} and {{nickname}}', { join: players.slice(0, -1).map(player => player.nickname).join(', '), nickname: players.at(-1).nickname })
    : players[0]?.nickname ?? '';

const ATC = () => {
    // the rules, opened from the title of the panel
    const [rulesButton, rules] = useGameRules('clock');
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
    // the badges the last training earned, shown under it
    const [earned, setEarned] = useState([]);
    // the club badges the last training tipped
    const [clubEarned, setClubEarned] = useState([]);
    // shown once the new trainings have reached their places on the scoreboard
    const pendingCelebration = useRef(null);
    // the scoreboard has its own mode and scoring; it follows the setup and the training just saved
    const [scoreboardView, setScoreboardView] = useState(() => ({ period: 'all', list: 'best', mode, scoring }));
    // reloads the scoreboard, e.g. after a training was saved
    const [entriesVersion, setEntriesVersion] = useState(0);
    // the trainings just saved, shown moving up once the scoreboard has loaded them
    const pendingArrival = useRef(null);
    const entriesRequest = useRef(0);
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
    // the setup, then the training: it stays after a time is saved or a round is
    // over, for the next attempt, until "Settings" goes back
    const [stage, setStage] = useState(() => active ? 'training' : 'setup');
    const playing = stage === 'training' || inProgress || Boolean(finished);
    const panelRef = useRef(null);

    // the play area moves up when the setup folds: bring it into view
    useEffect(() => {
        if (!playing) return;
        const top = panelRef.current?.getBoundingClientRect().top ?? 0;
        if (top < 0) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [playing]);

    // a new mode or scoring in the setup: the scoreboard shows it too
    useEffect(() => {
        setScoreboardView(view => ({ ...view, mode, scoring }));
    }, [mode, scoring]);

    useEffect(() => {
        const request = ++entriesRequest.current;
        if (!pendingArrival.current) setArrival(null);
        ATCService.loadATCEntries(scoreboardView.mode, scoreboardView.scoring).then(entries => {
            // only the answer to the latest request counts
            if (request !== entriesRequest.current) return;
            setATCEntries(entries);
            if (pendingArrival.current) {
                const coming = pendingArrival.current;
                // "best per player" only lists personal bests: a training that is not
                // one would not be seen moving up, so the scoreboard shows all attempts
                setScoreboardView(view => {
                    if (view.list !== 'best') return view;
                    const listed = new Set(scoreboardRows(entries, view).map(row => row.entry.id));
                    return coming.ids.every(id => listed.has(id)) ? view : { ...view, list: 'all' };
                });
                setArrival(coming);
                pendingArrival.current = null;
            }
        }).catch(() => {});
    }, [scoreboardView.mode, scoreboardView.scoring, entriesVersion]);

    // shows the trainings just saved on the scoreboard of their mode and scoring
    const showOnScoreboard = (savedMode, savedScoring, entries) => {
        pendingArrival.current = { ids: entries.map(entry => entry.id), entries };
        setScoreboardView(view => ({ ...view, mode: savedMode, scoring: savedScoring }));
        setEntriesVersion(version => version + 1);
    };

    const userId = user?.id;
    const clubId = activeClub?.id;
    useEffect(() => {
        if (!userId || !clubId) return;
        ClubService.findPlayerOfUser(clubId, userId).then(found => setMyPlayerId(found?.id ?? null)).catch(() => setMyPlayerId(null));
    }, [userId, clubId]);

    const rows = useMemo(() => scoreboardRows(atcEntries, { ...scoreboardView, myPlayerId }), [atcEntries, scoreboardView, myPlayerId]);

    // the big moments of a round with the fewest darts: the clock strikes twelve, on a roll
    const [clockMoment, endClockMoment] = useClockMoment(active?.round ?? null, {
        nameOf: (playerId) => active?.players.find(entry => entry.id === playerId)?.nickname ?? '',
        indexOf: (playerId) => active?.round.order.indexOf(playerId) ?? 0,
    });

    // every player's personal best in the mode and scoring being played, from the
    // scoreboard (which follows the setup): the time in hundredths, or the fewest darts
    const bestOf = useCallback((wanted, playerId) => {
        if (scoreboardView.mode !== mode || scoreboardView.scoring !== wanted) return null;
        const values = atcEntries
            .filter(entry => entry.player?.id === playerId && (entry.mode ?? mode) === mode)
            .map(entry => wanted === 'Time' ? entry.timeMs : entry.darts)
            .filter(value => Number.isFinite(value) && value > 0);
        return values.length ? Math.min(...values) : null;
    }, [atcEntries, scoreboardView.mode, scoreboardView.scoring, mode]);

    // against the clock: where the time just saved ended up
    const timeResult = useMemo(() => {
        const saved = !darts && arrival?.entries?.[0];
        if (!saved) return null;
        const line = resultLine(rows, saved);
        return saved.isRecord ? [t('New personal best'), line].filter(Boolean).join(' · ') : line;
    }, [darts, arrival, rows]);

    const onArrived = (arrivedRows) => {
        const waiting = pendingCelebration.current;
        pendingCelebration.current = null;
        // after the podium moment, if there was one
        if (waiting) setTimeout(() => setCelebration(waiting), arrivedRows.some(row => row.rank <= 3) ? 2200 : 400);
    };

    // records first, then new badges; nothing to celebrate gives null
    const celebrationFor = (savedTrainings) => {
        const records = savedTrainings.filter(({ saved }) => saved.isRecord);
        const badgeGroups = savedTrainings.filter(({ saved }) => saved.newBadges?.length > 0).map(({ player: who, saved }) => ({ player: who, badges: saved.newBadges }));
        setEarned(badgeGroups);
        setClubEarned(savedTrainings.flatMap(({ saved }) => saved.clubBadges ?? []));
        if (!records.length && !badgeGroups.length) return null;
        const what = `${mode}${darts ? t(' with the fewest darts') : ''}`;
        return {
            title: records.length ? t('New record!') : t('New badge!'),
            subtitle: records.length
                ? t('A new personal best in {{what}}{{value}}', { what: what, value: savedTrainings.length > 1 ? ` for ${names(records.map(({ player: who }) => who))}` : '' })
                : t('Training complete'),
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
    };

    const saveChallenge = async (timeMs) => {
        setSaving(true);
        rememberSetup();
        try {
            const saved = await ATCService.createATCEntry({ scoring: 'Time', timeMs, mode, player: { id: player.id } });
            watch.reset();
            pendingCelebration.current = celebrationFor([{ player, saved }]);
            showOnScoreboard(mode, 'Time', [saved]);
        } catch {
            toast.current.show({ severity: 'error', summary: t('Training not saved'), detail: t('The time is still here: try saving again.'), life: 4000 });
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
        showOnScoreboard(result.mode, 'Darts', result.order.map(id => saved[id]));
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
        // only the moment the round is done counts; finishing guards against a second save
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    <Panel header={t('Around the Clock')} icons={rulesButton}>
                        {rules}
                        <div className="container">
                            {playing &&
                                <ATCTrainingSummary
                                    players={active?.players ?? finished?.players ?? players}
                                    mode={active?.mode ?? finished?.mode ?? mode}
                                    scoring={scoring}
                                    onSettings={inProgress || finished?.saving ? undefined : () => { setFinished(null); setArrival(null); setEarned([]); setClubEarned([]); setStage('setup'); }}
                                />
                            }
                            {!inProgress && <NewBadges groups={earned} className="mt-3" />}
                            {!inProgress && clubEarned.length > 0 && <div className="mt-3"><ClubBadgeNews badges={clubEarned} training /></div>}
                            {!playing && <>
                            {remembered && <GameSetupMemory training onReset={startFresh} />}
                            <p className="game-setup-section-title">{t('Player')}</p>
                            {/* a fieldset locks every card while a training runs */}
                            <fieldset disabled={inProgress} className="atc-setup-lock">
                                <PlayerPicker
                                    single
                                    minPlayers={1}
                                    selected={players}
                                    onChange={setPlayers}
                                    initialIds={active ? [] : remembered?.playerIds}
                                    key={`${remembered ? 'remembered' : 'fresh'}-${darts ? 'darts' : 'time'}`}
                                />
                            </fieldset>

                            <p className="game-setup-section-title mt-4">{t('Training')}</p>
                            <div className="setting-box d-flex flex-column align-items-center gap-2">
                                <p className="setting-title align-self-stretch">{t('Scoring')}</p>
                                <SelectButton
                                    value={scoring}
                                    options={SCORINGS}
                                    onChange={(e) => e.value && changeScoring(e.value)}
                                    disabled={inProgress}
                                    className="p-selectbutton-pills flex-wrap justify-content-center"
                                    aria-label={t('Scoring')}
                                />
                                <span className="text-faint fs-8 text-center">{SCORINGS.find(option => option.value === scoring).description}</span>
                            </div>
                            <ATCModeConfig atcModeOption={mode} onATCModeChange={setMode} disabled={inProgress} />
                            {/* the setup only: the stopwatch or the round come once the training starts */}
                            <div className="atc-stopwatch mt-4">
                                <div className="atc-stopwatch-actions">
                                    <Button type="button" label={t('Start training')} icon="pi pi-play" className="atc-stopwatch-main" disabled={!players.length} onClick={() => { rememberSetup(); setEarned([]); setClubEarned([]); setStage('training'); }} />
                                </div>
                                {!players.length && <div className="text-faint fs-8 text-center mt-2">{t('Choose a player to start.')}</div>}
                            </div>
                            </>}

                            {playing && <>
                            <p className="game-setup-section-title">{darts ? (finished ? t('Result') : t('Round')) : t('Stopwatch')}</p>
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
                                            bests={Object.fromEntries(active.players.map(entry => [entry.id, bestOf('Darts', entry.id)]).filter(([, best]) => best))}
                                        />
                                        : <div className="atc-stopwatch">
                                            <div className="atc-stopwatch-actions">
                                                <Button type="button" label={t('Start round')} icon="pi pi-play" className="atc-stopwatch-main" disabled={!players.length} onClick={() => startRound()} />
                                            </div>
                                            <div className="text-faint fs-8 text-center mt-2">
                                                {players.length ? t('Tap Hit or Miss for every dart; H and M work on a keyboard.') : t('Choose a player to start.')}
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
                                        best={player ? bestOf('Time', player.id) : null}
                                    />
                                    {timeResult && !inProgress && <div className="atc-result" role="status">{timeResult}</div>}
                                </>
                            }
                            </>}
                        </div>
                    </Panel>
                    </div>
                </div>
                <div className="col-12 col-xl-6">
                    <ATCScoreboard
                        entries={atcEntries}
                        noun={scoreboardView.scoring === 'Darts' ? t('rounds') : t('times')}
                        arrival={arrival}
                        view={scoreboardView}
                        onViewChange={setScoreboardView}
                        defaults={{ mode, scoring }}
                        myPlayerId={myPlayerId}
                        onArrived={onArrived}
                    />
                </div>
            </div>
            {celebration && <Celebration {...celebration} onClose={() => setCelebration(null)} />}
            <ClockMoment moment={clockMoment} onDone={endClockMoment} mode={active?.mode ?? mode} />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ATC;
