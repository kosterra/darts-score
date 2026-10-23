import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';

import PlayerPicker from '../game_config/config_components/player.picker';
import GameSetupStart from '../game_config/config_components/game.setup.start';
import DartBoard from '../games/common/dartboard';
import DartKeypad from '../games/common/dart.keypad';
import useInputMode, { INPUTS } from '../games/common/use.input.mode';
import Celebration from '../badges/celebration';
import NewBadges from '../badges/new.badges';
import UpLink from '../elements/up.link';
import RulesList from './rules.list';
import RulesTrainingBoard from './rules.training.board';
import LiveHero from '../games/common/live.hero';
import RulesService from '../../services/rules.service';
import { trainingOf } from '../../rules/trainings';
import { replayTraining, settingsOf } from '../../rules/engine';
import { parseDart } from '../../rules/darts';
import { clearSetup, loadSetup, saveSetup } from '../../utils/setup.memory';
import { t } from '../../utils/i18n';

// a training under way survives a reload of the page
const runningKey = (kind) => `oche.rulesTraining.${kind}`;
const readRunning = (kind) => {
    try {
        const saved = JSON.parse(localStorage.getItem(runningKey(kind)));
        return saved && Array.isArray(saved.darts) && saved.player ? saved : null;
    } catch {
        return null;
    }
};
const writeRunning = (kind, running) => {
    try {
        if (running) localStorage.setItem(runningKey(kind), JSON.stringify(running));
        else localStorage.removeItem(runningKey(kind));
    } catch {
        // storage unavailable: a reload starts again
    }
};

const Status = ({ items }) => (
    <div className="rules-status">
        {items.map(([label, value]) => (
            <div key={label} className="rules-status-item">
                <span className="rules-status-value">{value}</span>
                <span className="rules-status-label">{label}</span>
            </div>
        ))}
    </div>
);

/**
 * A training of the rules engine: set up (the player and the options), then
 * every dart (hit or miss, or the field on the board), and once it is over the
 * result, saved for the scoreboard of the club.
 */
const RulesTraining = () => {
    const { kind } = useParams();
    const definition = trainingOf(kind);
    const memoryKey = `rules.${kind}`;
    const [remembered] = useState(() => loadSetup(memoryKey));
    // { player, settings, darts } while training
    const [running, setRunning] = useState(() => readRunning(kind));
    const [players, setPlayers] = useState([]);
    const [settings, setSettings] = useState(() => ({ ...(definition ? settingsOf(definition, {}) : {}), ...(remembered?.settings ?? {}) }));
    const [input, chooseInput] = useInputMode();
    // the training just finished: { saved, error, saving }
    const [finished, setFinished] = useState(null);
    const [celebration, setCelebration] = useState(null);
    // the scoreboard reloads after a training is saved
    const [boardVersion, setBoardVersion] = useState(0);
    const toast = useRef(null);

    useEffect(() => writeRunning(kind, running), [kind, running]);

    const replay = useMemo(() => running && definition ? replayTraining(definition, running) : null, [running, definition]);

    const saveResult = useCallback(async (done, attempt) => {
        setFinished({ saving: true, result: done.result });
        try {
            const saved = await RulesService.createTraining({
                kind,
                player: { id: attempt.player.id },
                score: done.result.score,
                result: done.result,
                settings: attempt.settings,
                darts: attempt.darts.map(String),
            });
            setFinished({ saved, result: done.result });
            setBoardVersion(version => version + 1);
            const badgeGroups = saved.newBadges?.length ? [{ player: attempt.player, badges: saved.newBadges }] : [];
            if (saved.isRecord || badgeGroups.length) {
                setCelebration({
                    title: saved.isRecord ? t('New personal best!') : t('New badge!'),
                    subtitle: saved.isRecord ? `${definition.title} · ${definition.format(done.result.score)}` : definition.title,
                    player: attempt.player,
                    badgeGroups,
                });
            }
        } catch {
            setFinished({ error: true, result: done.result });
        }
    }, [kind, definition]);

    // over: saved once, and the page shows the result
    useEffect(() => {
        if (!replay?.done || !running) return;
        const attempt = running;
        setRunning(null);
        saveResult(replay, attempt);
    }, [replay, running, saveResult]);

    if (!definition) return <Navigate replace to="/training/more" />;

    const start = (player = players[0]) => {
        if (!player) return;
        const options = Object.fromEntries((definition.options ?? []).map(option => [option.key, settings[option.key]]));
        saveSetup(memoryKey, { settings: options, players: [player] });
        const prepared = definition.prepare ? definition.prepare(options) : options;
        setFinished(null);
        setRunning({ player, settings: prepared, darts: [] });
    };

    const throwDart = (value) => {
        if (!running || replay?.done) return;
        const dart = definition.input === 'hitmiss' ? value : parseDart(String(value)).field;
        setRunning({ ...running, darts: [...running.darts, dart] });
    };
    const undoDart = () => running?.darts.length && setRunning({ ...running, darts: running.darts.slice(0, -1) });
    const quit = () => {
        setRunning(null);
        setFinished(null);
    };

    const header = <UpLink to="/training/more" label={t('More trainings')} />;

    // the training under way
    if (running && replay && !replay.done) {
        const ctx = { settings: replay.settings };
        const lastDarts = running.darts.slice(-3);
        return (
            <div className="container-fluid bg-transparent border-0 x01-game-page">
                <LiveHero
                    rulesId={kind}
                    title={[definition.title, ...(definition.options ?? []).map(option => option.values.find(value => value.value === replay.settings[option.key])?.label).filter(Boolean)].join(' · ')}
                    subtitle={definition.target(replay.state, ctx)}
                    rows={[{
                        player: running.player,
                        isTurn: true,
                        line: definition.status(replay.state, ctx).map(([label, value], index) => <span key={label}>{index > 0 && ' · '}{label}{' '}<strong>{value}</strong></span>),
                        score: definition.hero ? definition.hero(replay.state, ctx) : definition.target(replay.state, ctx),
                        below: <span className="x01-live-route">{definition.target(replay.state, ctx)}</span>,
                    }]}
                />
                <div className="row g-4 justify-content-center">
                    <div className="col-12 col-lg-7">
                        {definition.input === 'hitmiss'
                            ? <div className="rules-hitmiss">
                                <Button label={t('Hit')} icon="pi pi-check" onClick={() => throwDart('H')} />
                                <Button label={t('Miss')} icon="pi pi-times" severity="secondary" onClick={() => throwDart('M')} />
                            </div>
                            : <>
                                <div className="d-flex justify-content-end mb-2">
                                    <SelectButton
                                        value={input}
                                        options={INPUTS}
                                        onChange={(e) => chooseInput(e.value)}
                                        itemTemplate={(option) => <span className="d-inline-flex align-items-center gap-1"><i className={option.icon} aria-hidden="true" />{option.label}</span>}
                                        className="p-selectbutton-pills pills-inline x01-input-switch"
                                        aria-label={t('Enter the darts with')}
                                    />
                                </div>
                                {input === 'keypad'
                                    ? <DartKeypad canThrow onDart={throwDart} onClearLast={undoDart} entered={running.darts.length % 3} />
                                    : <div className="x01-board-plain"><div className="x01-board-col"><DartBoard handleClick={(value) => throwDart(value)} markers={[]} /></div></div>}
                            </>}
                    </div>
                    <div className="col-12 col-lg-5 d-flex flex-column gap-4">
                        <Panel header={t('Training')}>
                            <Status items={definition.status(replay.state, ctx)} />
                            <div className="rules-darts-row mt-3" aria-label={t('Last darts')}>
                                {[0, 1, 2].map(index => <span key={index} className={lastDarts[index] ? '' : 'is-empty'}>{lastDarts[index] === 'H' ? t('Hit') : lastDarts[index] === 'M' ? t('Miss') : lastDarts[index] ?? '–'}</span>)}
                            </div>
                            <div className="d-flex gap-2 justify-content-center mt-3">
                                <Button label={t('Undo dart')} icon="pi pi-undo" severity="secondary" outlined disabled={!running.darts.length} onClick={undoDart} />
                                <Button label={t('Stop')} icon="pi pi-stop" severity="danger" outlined onClick={quit} />
                            </div>
                        </Panel>
                    </div>
                </div>
                <Toast ref={toast} position="bottom-right" />
            </div>
        );
    }

    const missing = players.length ? null : t('Choose a player');
    const chosen = (definition.options ?? []).map(option => option.values.find(value => value.value === settings[option.key])?.label).filter(Boolean);

    return (
        <div className="container-fluid p-4 border-0">
            {header}
            <div className="row g-4 justify-content-center">
                {finished &&
                    <div className="col-12 col-xl-10">
                        <Panel header={t('Result · {{title}}', { title: definition.title })}>
                            <div className="d-flex flex-column align-items-center gap-3">
                                <span className="display-6 fw-semibold text-default">{definition.format(finished.result.score)}</span>
                                <Status items={definition.figures(finished.result)} />
                                {finished.saved?.newBadges?.length > 0 && <NewBadges groups={[{ player: finished.saved.player, badges: finished.saved.newBadges }]} />}
                                <span className="text-faint fs-8">
                                    {finished.saving ? t('Saving…')
                                        : finished.error ? t('The training could not be saved.')
                                            : finished.saved?.isRecord ? t('A new personal best!')
                                                : finished.saved?.previousBest != null ? t('Your best: {{best}}', { best: definition.format(finished.saved.previousBest) })
                                                    : t('Your first {{title}}: this is your best now.', { title: definition.title })}
                                </span>
                                <div className="d-flex gap-2">
                                    <Button label={t('Again')} icon="pi pi-replay" onClick={() => start(finished.saved?.player ?? players[0])} disabled={!players[0] && !finished.saved} />
                                    <Button label={t('Change the setup')} icon="pi pi-sliders-h" severity="secondary" outlined onClick={() => setFinished(null)} />
                                </div>
                            </div>
                        </Panel>
                    </div>
                }
                <div className="col-12 col-xl-6">
                    <Panel header={definition.title}>
                        <p className="text-subtle fs-7 mt-0">{definition.description}</p>
                        <p className="game-setup-section-title">{t('Player')}</p>
                        <PlayerPicker selected={players} onChange={setPlayers} initialIds={remembered?.playerIds} single minPlayers={1} />
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
                        <p className="game-setup-section-title mt-4">{t('Rules')}</p>
                        <RulesList rules={definition.rules} />
                        <GameSetupStart
                            summary={[definition.title, ...chosen, players[0]?.nickname].filter(Boolean).join(' · ')}
                            missing={missing}
                            onStart={() => start()}
                            label={t('Start training')}
                        />
                        {remembered && <Button link className="p-0 fs-8 mt-2" label={t('Forget this setup')} onClick={() => { clearSetup(memoryKey); setSettings(settingsOf(definition, {})); }} />}
                    </Panel>
                </div>
                <div className="col-12 col-xl-4">
                    <RulesTrainingBoard definition={definition} version={boardVersion} highlight={finished?.saved?.id} />
                </div>
            </div>
            {celebration && <Celebration {...celebration} onClose={() => setCelebration(null)} />}
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default RulesTraining;
