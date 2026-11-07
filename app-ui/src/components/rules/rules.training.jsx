import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';

import PlayerPicker from '../game_config/config_components/player.picker';
import GameSetupStart from '../game_config/config_components/game.setup.start';
import GameSetupMemory from '../game_config/config_components/game.setup.memory';
import DartBoard from '../games/common/dartboard';
import DartKeypad from '../games/common/dart.keypad';
import useInputMode, { INPUTS } from '../games/common/use.input.mode';
import useAutoSend from '../games/common/use.auto.send';
import Celebration from '../badges/celebration';
import NewBadges from '../badges/new.badges';
import { ClubBadgeNews } from '../badges/club.badges';
import PracticeGoalNews from '../goals/practice.goal.news';
import UpLink from '../elements/up.link';
import RulesTrainingBoard from './rules.training.board';
import RulesDoubles from './rules.doubles';
import RulesProgress from './rules.progress';
import LiveHero from '../games/common/live.hero';
import RulesService from '../../services/rules.service';
import { trainingOf } from '../../rules/trainings';
import { replayTraining, settingsOf } from '../../rules/engine';
import { parseDart } from '../../rules/darts';
import { clearSetup, loadSetup, saveSetup } from '../../utils/setup.memory';
import { t } from '../../utils/i18n';
import useGameRules from '../games/common/game.rules';
import GameResultHeader from '../stats/common/game.result.header';
import { judgeLevel } from '../../rules/levels.play';
import PlayerService from '../../services/player.service';
import { checkoutRoutes, formatRoute, setupSuggestions } from '../../utils/checkout.routes';
import useGamePreferences from '../../utils/use.game.preferences';

// a training under way survives a reload of the page (also once over, until its result is saved)
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

// changed: the labels whose values an undo just changed, flashing once (again with every undo: flash)
const Status = ({ items, changed = [], flash = 0 }) => (
    <div className="rules-status">
        {items.map(([label, value]) => (
            <div key={changed.includes(label) ? `${label}-${flash}` : label} className={`rules-status-item ${changed.includes(label) ? 'is-undone' : ''}`}>
                <span className="rules-status-value">{value}</span>
                <span className="rules-status-label">{label}</span>
            </div>
        ))}
    </div>
);

// a figure equal to the result itself (e.g. Points next to "697 points") is the result's label, not a second figure
const sameAsScore = (definition, score, value) => String(value) === String(score) || String(value) === definition.format(score);
// short figures as big numbers; a long one is smaller beside them
const SHORT = 9;

/**
 * The result of a training in the header of a finished game: what was
 * trained, the player with the result as the score (a new personal best
 * glows gold, as a winner; with scoreTile on the first tile instead), the
 * other figures on tiles beside it (long ones smaller), and the next attempt
 * or the setup as the game's actions; how it stands against the best is the
 * line under the title.
 */
const TrainingResult = ({ definition, finished, actions }) => {
    const { score } = finished.result;
    const player = finished.saved?.player?.firstname ? finished.saved.player : finished.player ?? finished.saved?.player ?? {};
    const figures = definition.figures(finished.result);
    const own = figures.find(([, value]) => sameAsScore(definition, score, value));
    const others = figures.filter(entry => entry !== own);
    const short = others.filter(([, value]) => String(value).length <= SHORT);
    const long = others.filter(([, value]) => String(value).length > SHORT);
    const saved = finished.saved;
    const best = finished.saving ? t('Saving…')
        : finished.error ? t('The training could not be saved.')
            : saved?.isRecord ? t('A new personal best!')
                : saved?.previousBest != null ? t('Your best: {{best}}', { best: definition.format(saved.previousBest) })
                    : t('Your first {{title}}: this is your best now.', { title: definition.title });
    const options = (definition.options ?? []).map(option => option.values.find(value => value.value === finished.settings?.[option.key])?.label).filter(Boolean);
    const id = player.id ?? 'player';
    const doubles = definition.doubles && finished.darts ? definition.doubles(replayTraining(definition, finished).state) : null;

    return (
        <>
            <GameResultHeader
                // in a row with the panels: the row's gap is the space, as between the panels
                className="m-0"
                celebrate={Boolean(saved?.isRecord)}
                // a new personal best is the "winner": the gold of a won game
                game={{ playerModels: { [id]: { hasWonGame: Boolean(saved?.isRecord) } } }}
                players={[{ ...player, id }]}
                title={[definition.title, ...options].join(' · ')}
                subtitle={best}
                // no number under the name: the result itself is the first tile, gold for a new best;
                // the long figures beside the others, smaller
                scoreOf={() => null}
                levelOf={() => judgeLevel(definition.level, finished.result, finished.settings)}
                rows={[
                    { key: 'score', label: own?.[0] ?? t('Result'), neutral: true, record: Boolean(saved?.isRecord) },
                    ...short.map(([label], index) => ({ key: `figure-${index}`, label, neutral: true })),
                    ...long.map(([label], index) => ({ key: `long-${index}`, label, neutral: true, long: true })),
                ]}
                figures={{ [id]: Object.fromEntries([
                    ['score', own?.[1] ?? definition.format(score)],
                    ...short.map(([, value], index) => [`figure-${index}`, value]),
                    ...long.map(([, value], index) => [`long-${index}`, value]),
                ]) }}
                actions={actions}
                // what every double took
                footer={doubles && <RulesDoubles cells={doubles} label={definition.doublesLabel} className="mt-3" />}
            />
        </>
    );
};

/**
 * A training of the rules engine: set up (the player and the options), then
 * every dart (hit or miss, or the field on the board), and once it is over the
 * result, saved for the scoreboard of the club.
 */
// the usual way and this many others, as in X01
const OTHER_WAYS = 4;

/**
 * The ways out of a checkout training, as in X01: the usual way with the
 * darts left in the visit (the player's own doubles first) and a few others;
 * without a finish what to set up. ways: { routes, setup, profile }
 */
const TrainingWaysOut = ({ ways }) => {
    const { routes, setup, profile } = ways;
    const others = routes.slice(1, 1 + OTHER_WAYS);
    return (
        <div className="x01-ways">
            {routes.length > 0 &&
                <div className="x01-ways-group">
                    <span className="x01-ways-label">{t('Usual way')}</span>
                    <div className="x01-ways-setup"><span className="x01-ways-route is-preferred">{formatRoute(routes[0])}</span></div>
                </div>
            }
            {others.length > 0 &&
                <div className="x01-ways-group">
                    <span className="x01-ways-label">{t('Other ways')}</span>
                    <div className="x01-ways-list">
                        {others.map(route => <span key={route.join()} className="x01-ways-route">{formatRoute(route)}</span>)}
                    </div>
                </div>
            }
            {setup &&
                <div className="x01-ways-group">
                    <span className="x01-ways-label">{t('Set up instead')}</span>
                    <div className="x01-ways-setup">
                        <span className="x01-ways-route is-preferred">{formatRoute(setup.darts)}</span>
                        <span className="x01-route-leaves text-subtle fs-8"><i className="pi pi-arrow-right" aria-hidden="true" />{t('leaves')}{' '}<strong className="text-default">{setup.leaves}</strong></span>
                    </div>
                </div>
            }
            {routes.length > 0 && profile?.doubleSource === 'set' &&
                <span className="x01-ways-note">
                    {(profile.favouriteDoubles?.length ?? 0) > 1
                    ? t('Your favourite doubles first: {{doubles}} (set in the profile).', { doubles: profile.favouriteDoubles.join(', ') })
                    : <>{t('Your favourite double first:')}{' '}{profile.favouriteDouble}{' '}{t('(set in the profile).')}</>}
                </span>}
            {routes.length > 0 && profile?.doubleSource === 'history' && profile.doubles?.[0] &&
                <span className="x01-ways-note">{t('Your best doubles first: {{double}} hit {{rate}} % of {{total}} darts in your games.', { double: profile.doubles[0].double, rate: profile.doubles[0].rate, total: profile.doubles[0].total })}</span>}
        </div>
    );
};

const RulesTraining = () => {
    const { kind } = useParams();
    const definition = trainingOf(kind);
    const memoryKey = `rules.${kind}`;
    const [remembered, setRemembered] = useState(() => loadSetup(memoryKey));
    // { player, settings, darts, pending } while training; pending: the darts of the visit
    // tapped on the board or the keypad, not entered yet (as in a game)
    const [running, setRunning] = useState(() => readRunning(kind));
    const [players, setPlayers] = useState([]);
    const [settings, setSettings] = useState(() => ({ ...(definition ? settingsOf(definition, {}) : {}), ...(remembered?.settings ?? {}) }));
    const [input, chooseInput] = useInputMode();
    // the training just finished: { saved, error, saving }
    const [finished, setFinished] = useState(null);
    const [celebration, setCelebration] = useState(null);
    // the last undo, so the restored state shows what changed: { count, status (before it) }
    const [undone, setUndone] = useState(null);
    // the scoreboard reloads after a training is saved
    const [boardVersion, setBoardVersion] = useState(0);
    const toast = useRef(null);
    // the rules of the training: open from the start in the setup
    const [rulesButton, rules] = useGameRules(kind);

    useEffect(() => writeRunning(kind, running), [kind, running]);

    // with the board or the keypad a visit is entered as a whole ("Enter score"); Hit and Miss (or the
    // training's own buttons) count at once
    const quick = definition?.input === 'hitmiss' || definition?.input === 'buttons';
    const staged = !quick;
    const pending = useMemo(() => running?.pending ?? [], [running]);
    // where the training stands with the darts of the visit already counted, so the figures and
    // the ways out follow every dart tapped
    const replay = useMemo(() => running && definition ? replayTraining(definition, { ...running, darts: [...running.darts, ...pending] }) : null, [running, pending, definition]);
    // the visit goes by itself after its third dart, when the player wants it (as in a game)
    useAutoSend(staged ? pending : []);
    // Enter enters the visit, also after darts were tapped on the board
    useEffect(() => {
        if (!staged) return undefined;
        const enter = (e) => {
            if (e.key !== 'Enter' || e.target.closest?.('form, button, input, [role="dialog"]')) return;
            document.getElementById('submitThrows')?.click();
        };
        document.addEventListener('keyup', enter);
        return () => document.removeEventListener('keyup', enter);
    }, [staged]);
    // the ways out of a checkout training, as the player wants them in X01, with their own doubles
    const [preferences] = useGamePreferences();
    const [checkoutProfile, setCheckoutProfile] = useState(null);
    const playerId = running?.player?.id;
    const checksOut = Boolean(definition?.checkout);
    useEffect(() => {
        setCheckoutProfile(null);
        if (!checksOut || !playerId) return;
        PlayerService.loadCheckoutProfiles([playerId]).then(profiles => setCheckoutProfile(profiles?.[playerId] ?? null)).catch(() => {});
    }, [checksOut, playerId]);
    const ways = useMemo(() => {
        if (!replay || replay.done || !definition?.checkout || preferences.waysOut === 'off') return null;
        // nothing to check out yet (a leg from 501)
        const out = definition.checkout(replay.state, { settings: replay.settings });
        if (!out) return null;
        const { left, dartsLeft } = out;
        const throwing = { dartsLeft, outMode: 'Double Out', doubles: checkoutProfile?.doubleOrder ?? [] };
        const routes = checkoutRoutes(left, throwing);
        return { routes, setup: routes.length ? null : setupSuggestions(left, throwing)[0] ?? null, profile: checkoutProfile };
    }, [replay, definition, preferences.waysOut, checkoutProfile]);

    const saveResult = useCallback(async (done, attempt) => {
        setFinished({ saving: true, result: done.result, player: attempt.player, settings: attempt.settings, darts: attempt.darts });
        try {
            const saved = await RulesService.createTraining({
                kind,
                player: { id: attempt.player.id },
                score: done.result.score,
                result: done.result,
                settings: attempt.settings,
                darts: attempt.darts.map(String),
                startedAt: attempt.startedAt,
            });
            setFinished({ saved, result: done.result, player: attempt.player, settings: attempt.settings, darts: attempt.darts });
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
            setFinished({ error: true, result: done.result, player: attempt.player, settings: attempt.settings, darts: attempt.darts });
        }
    }, [kind, definition]);

    if (!definition) return <Navigate replace to="/training/more" />;

    // over: saved only once the player confirms it (a dart entered wrong can still be undone), with
    // the darts of the visit that ended it
    const over = Boolean(running && replay?.done);
    const saveFinished = () => {
        if (!over) return;
        const attempt = { ...running, darts: [...running.darts, ...pending], pending: [] };
        setUndone(null);
        setRunning(null);
        saveResult(replay, attempt);
    };

    const start = (player = players[0]) => {
        if (!player) return;
        const options = Object.fromEntries((definition.options ?? []).map(option => [option.key, settings[option.key]]));
        saveSetup(memoryKey, { settings: options, players: [player] });
        const prepared = definition.prepare ? definition.prepare(options) : options;
        setFinished(null);
        // when it started, for fair play (darts faster than they can be thrown)
        setRunning({ player, settings: prepared, darts: [], startedAt: new Date().toISOString() });
    };

    // the darts of the visit so far (an attempt of a checkout training may end before its third)
    const inVisitOf = (state, count) => (definition.inVisit ? definition.inVisit(state, { settings: replay.settings }) : count % 3);
    // the visit is complete: three darts, or the attempt (or the training) ended with fewer
    const visitFull = staged && pending.length > 0 && (replay.done || inVisitOf(replay.state, running.darts.length + pending.length) === 0);

    const throwDart = (value) => {
        if (!running || replay?.done || visitFull) return;
        const dart = definition.input === 'hitmiss' ? value : parseDart(String(value)).field;
        setUndone(null);
        if (staged) setRunning({ ...running, pending: [...pending, dart] });
        else setRunning({ ...running, darts: [...running.darts, dart] });
    };
    // Enter score: the darts of the visit count; the ones not tapped are misses
    const enterVisit = () => {
        if (!running || !pending.length) return;
        const darts = [...running.darts, ...pending];
        while (!visitFull && darts.length - running.darts.length < 3) {
            const after = replayTraining(definition, { ...running, darts });
            if (after.done || inVisitOf(after.state, darts.length) === 0) break;
            darts.push('0');
        }
        setUndone(null);
        setRunning({ ...running, darts, pending: [] });
    };
    const undoDart = () => {
        if (!running?.darts.length && !pending.length) return;
        setUndone(last => ({ count: (last?.count ?? 0) + 1, status: definition.status(replay.state, { settings: replay.settings }) }));
        if (pending.length) setRunning({ ...running, pending: pending.slice(0, -1) });
        else setRunning({ ...running, darts: running.darts.slice(0, -1) });
    };
    const quit = () => {
        setUndone(null);
        setRunning(null);
        setFinished(null);
    };

    const header = <UpLink to="/training/more" label={t('More trainings')} />;

    // the training under way; once over it stays until the result is saved (or the last dart undone)
    if (running && replay) {
        const ctx = { settings: replay.settings };
        // the darts of this visit: an attempt of a checkout training may end before its third
        const inVisit = definition.inVisit ? definition.inVisit(replay.state, ctx) : running.darts.length % 3;
        // with the board or the keypad: the darts tapped, not entered yet
        const visitDarts = staged ? pending : inVisit ? running.darts.slice(-inVisit) : [];
        // the last darts before this visit, to check a dart entered a moment ago (the tiles are empty again)
        const lastDarts = running.darts.slice(0, running.darts.length - (staged ? 0 : inVisit)).slice(-3);
        const canUndo = running.darts.length > 0 || pending.length > 0;
        const status = definition.status(replay.state, ctx);
        const changed = undone ? status.filter(([, value], index) => String(undone.status[index]?.[1]) !== String(value)).map(([label]) => label) : [];
        const target = definition.target(replay.state, ctx);
        const doubles = definition.doubles ? definition.doubles(replay.state, ctx) : null;
        const danger = definition.danger && !over ? definition.danger(replay.state, ctx) : null;
        // the danger zone: Bob's 27 over, or a checkout attempt lost, without a hit in the darts left
        const dangerStrip = (className = '') => danger && (
            <div key={`${danger.double ?? danger.left}`} className={`rules-danger is-left-${danger.dartsLeft} ${className}`} role="status">
                <i className="pi pi-exclamation-triangle" aria-hidden="true" />
                <span>
                    <strong>{t('Danger zone')}</strong>
                    {' '}
                    {danger.text}
                </span>
                <span key={danger.dartsLeft} className="rules-danger-count tabular-nums" aria-hidden="true">{danger.dartsLeft}</span>
            </div>
        );
        // the training's own buttons (Treble, Single, …), and the name of a dart entered with one
        const buttons = definition.input === 'buttons' ? definition.buttons(replay.settings) : null;
        const buttonLabel = (dart) => buttons?.find(button => button.value === dart)?.label ?? dart;
        // the figures of the training big in the header, each on a tile over its name
        const heroFigures = definition.heroFigures &&
            <span className="rules-hero-figures">
                {definition.heroFigures(replay.state, ctx).map(([label, value]) => (
                    <span key={label} className="rules-hero-figure">
                        <span className="tabular-nums">{value}</span>
                        <span className="rules-hero-figure-label">{label}</span>
                    </span>
                ))}
            </span>;
        // once over: the result big, its figures on the tiles (not where the next dart would go)
        // the figure that is the result itself is the big one, not a tile again (only that one: Best visit 180 beside an average of 180.0 stays)
        const overFigures = over ? definition.figures(replay.result) : [];
        const ownFigure = overFigures.find(([, value]) => sameAsScore(definition, replay.result.score, value));
        const overRow = over && {
            player: running.player,
            isTurn: true,
            score: definition.format(replay.result.score),
            below: <span className="rules-hero-figures">
                {overFigures.filter(entry => entry !== ownFigure).map(([label, value]) => (
                    <span key={label} className="rules-hero-figure">
                        <span className="tabular-nums">{value}</span>
                        <span className="rules-hero-figure-label">{label}</span>
                    </span>
                ))}
            </span>,
        };
        return (
            // x01-live: the gutters of a game, so nothing is wider than a phone
            <div className="container-fluid bg-transparent border-0 x01-game-page x01-live rules-training-live">
                <LiveHero
                    rulesId={kind}
                    title={[definition.title, ...(definition.options ?? []).map(option => option.values.find(value => value.value === replay.settings[option.key])?.label).filter(Boolean)].join(' · ')}
                    // the double to throw at is the big figure already: not again under the title
                    subtitle={over ? t('Result') : definition.heroTarget || definition.noteTarget ? undefined : target}
                    rows={overRow ? [overRow] : [{
                        player: running.player,
                        isTurn: true,
                        // the big figures say it all already
                        line: definition.heroFigures ? null : status.map(([label, value], index) => <span key={label}>{index > 0 && ' · '}{label}{' '}<strong>{value}</strong></span>),
                        // the big figure, with its unit smaller beside it (Bob's 27: "441 points"); without
                        // one the figures on their tiles are the big part (Scoring)
                        score: definition.hero
                            ? definition.heroUnit
                                ? <>{definition.hero(replay.state, ctx)}<span className="rules-hero-unit">{definition.heroUnit(replay.state, ctx)}</span></>
                                : definition.hero(replay.state, ctx)
                            : heroFigures || target,
                        // the double to throw at in the accent, played again when it changes (also by an undo)
                        scoreClass: definition.heroTarget ? 'rules-hero-target' : '',
                        scoreKey: definition.heroTarget ? `${target}-${undone?.count ?? 0}` : undefined,
                        // the way out to throw, as in X01; without one the target (or what the training stands at);
                        // then the figures on their tiles, when the big figure is something else
                        below: <>
                            {ways?.routes[0] ? <span className="x01-live-route">{formatRoute(ways.routes[0])}</span>
                                : ways?.setup ? <span className="x01-live-route is-setup">{formatRoute(ways.setup.darts)}</span>
                                    : definition.noteTarget
                                        // the double to throw at under the points, in the accent (played again when it
                                        // changes, also by an undo), and the curve of the points so far
                                        ? <span className="rules-hero-below">
                                            <span key={`${target}-${undone?.count ?? 0}`} className="rules-hero-double">{definition.heroNote(replay.state, ctx)}</span>
                                            {definition.progress && <RulesProgress points={definition.progress(replay.state, ctx)} length={definition.progressLength} />}
                                        </span>
                                        : definition.heroNote
                                            // the score of the training (e.g. the darts so far): big and white, not a small way out
                                            ? <span className="x01-live-route rules-hero-note tabular-nums">{definition.heroNote(replay.state, ctx)}</span>
                                            // nothing more when tiles or the double to throw at are the big part
                                            : !heroFigures && !definition.heroTarget && <span className="x01-live-route">{target}</span>}
                            {definition.hero && heroFigures}
                        </>,
                    }]}
                />
                <div className="row g-4 justify-content-center x01-play">
                    <div className="col-12 col-lg-7">
                        {/* every double in turn: done in the colour of what it took, the one now in the accent */}
                        {doubles && <RulesDoubles cells={doubles} label={definition.doublesLabel} live className="mb-3" />}
                        {/* the danger zone above the input; on a phone it floats at the bottom instead (below) */}
                        {dangerStrip('d-none d-md-flex')}
                        {over
                            // the end, where the darts were entered: the result, saved once confirmed, or the last dart back
                            ? <div className="rules-over" role="status">
                                <i className="pi pi-flag rules-over-icon" aria-hidden="true" />
                                <span className="rules-over-title">{t('Training over')}</span>
                                <span className="rules-over-hint">{t('Save the result, or undo the last dart if it was entered wrong.')}</span>
                                <div className="rules-over-actions">
                                    <Button label={t('Save the result')} icon="pi pi-check" onClick={saveFinished} autoFocus />
                                    <Button label={t('Undo dart')} icon="pi pi-undo" severity="secondary" onClick={undoDart} />
                                </div>
                            </div>
                        : definition.input === 'hitmiss'
                            ? <div className="rules-hitmiss">
                                <Button label={t('Hit')} icon="pi pi-check" onClick={() => throwDart('H')} />
                                <Button label={t('Miss')} icon="pi pi-times" severity="secondary" onClick={() => throwDart('M')} />
                            </div>
                            : buttons
                                ? <div className={`rules-hitmiss is-${buttons.length}`}>
                                    {buttons.map(button => <Button key={button.value} label={button.label} icon={button.icon} severity={button.severity} onClick={() => throwDart(button.value)} />)}
                                </div>
                            : input === 'keypad'
                                ? <DartKeypad canThrow={!visitFull} onDart={throwDart} onClearLast={undoDart} entered={pending.length} />
                                : <div className="x01-board-plain"><div className="x01-board-col"><DartBoard handleClick={(value) => throwDart(value)} markers={[]} /></div></div>}
                    </div>
                    <div className="col-12 col-lg-5 d-flex flex-column gap-4">
                        {/* the board or the keypad in the panel's header, as in the games */}
                        <Panel header={t('Training')} icons={quick ? null : (
                            <SelectButton
                                value={input}
                                options={INPUTS}
                                onChange={(e) => chooseInput(e.value)}
                                itemTemplate={(option) => <span className="d-inline-flex align-items-center gap-1"><i className={option.icon} aria-hidden="true" />{option.label}</span>}
                                className="p-selectbutton-pills pills-inline x01-input-switch"
                                aria-label={t('Enter the darts with')}
                            />
                        )}>
                            {/* the figures of the header again, unless they are all big there */}
                            {!definition.heroFigures && <Status items={status} changed={changed} flash={undone?.count} />}
                            {/* the three darts of the visit: hit or miss (or the field), the next one framed */}
                            <ol className={`rules-visit ${definition.heroFigures ? '' : 'mt-3'}`} aria-label={t('Darts of this visit')}>
                                {[0, 1, 2].map(index => {
                                    const dart = visitDarts[index];
                                    const kind = dart === 'H' ? 'is-hit' : dart === 'M' ? 'is-miss' : dart ? 'is-thrown' : index === visitDarts.length && !visitFull ? 'is-next' : 'is-empty';
                                    const flash = undone && index === visitDarts.length;
                                    return (
                                        <li key={flash ? `${index}-${undone.count}` : index} className={`rules-visit-dart ${kind} ${flash ? 'is-undone' : ''}`} aria-current={kind === 'is-next' ? 'step' : undefined}>
                                            <span className="rules-visit-number">{t('Dart {{number}}', { number: index + 1 })}</span>
                                            <span className="rules-visit-mark">
                                                {dart === 'H' ? <><i className="pi pi-check" aria-hidden="true" />{t('Hit')}</>
                                                    : dart === 'M' ? <><i className="pi pi-times" aria-hidden="true" />{t('Miss')}</>
                                                        : dart ? buttonLabel(dart) : '–'}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                            {lastDarts.length > 0 && !over &&
                                <p className="rules-last-darts" aria-label={t('Last darts')}>
                                    <span className="text-faint">{t('Last darts')}</span>
                                    {lastDarts.map((dart, index) => (
                                        <span key={`${running.darts.length}-${index}`} className={`rules-last-dart ${dart === 'H' ? 'is-hit' : dart === 'M' ? 'is-miss' : ''}`}>
                                            {dart === 'H' ? t('Hit') : dart === 'M' ? t('Miss') : buttonLabel(dart)}
                                        </span>
                                    ))}
                                </p>}
                            {/* after an undo: where it stands again */}
                            {undone && <p key={undone.count} className="rules-undone" role="status"><i className="pi pi-undo" aria-hidden="true" />{t('Dart {{dart}} undone: {{target}} again', { dart: visitDarts.length + 1, target })}</p>}
                            {ways && <div className="mt-3"><TrainingWaysOut ways={ways} /></div>}
                            <div className="d-flex flex-wrap gap-2 justify-content-center mt-3">
                                {staged && !over && <Button id="submitThrows" label={t('Enter score')} icon="pi pi-check" disabled={!pending.length} onClick={enterVisit} />}
                                {/* once over, Undo is beside Save the result */}
                                {!over && <Button label={t('Undo dart')} icon="pi pi-undo" severity="secondary" outlined disabled={!canUndo} onClick={undoDart} />}
                                <Button label={t('Stop')} icon="pi pi-stop" severity="danger" outlined onClick={quit} />
                            </div>
                        </Panel>
                    </div>
                </div>
                {/* on a phone the panel is below the board or the keypad: the darts of the visit,
                    where the training stands and Undo float above the menu bar, as in X01 */}
                {/* with Hit and Miss the danger zone floats on its own above the menu bar */}
                {quick && danger && <div className="rules-danger-dock d-md-none">{dangerStrip()}</div>}
                {/* once over, the result's buttons are where the board was: no bar */}
                {!quick && !over &&
                    // the danger zone on top of the bar, one piece with it
                    <div className={`x01-visit-bar is-floating rules-visit-bar d-md-none ${danger ? 'has-danger' : ''}`}>
                        {dangerStrip()}
                        <div className="x01-visit-bar-darts" aria-hidden="true">
                            {[0, 1, 2].map(index => <span key={index} className={visitDarts[index] ? '' : 'is-empty'}>{visitDarts[index] ?? '–'}</span>)}
                        </div>
                        <div className="x01-visit-total" aria-live="polite">
                            {status.map(([label, value], index) => <span key={label}>{index > 0 && ' · '}{label}{' '}<strong>{value}</strong></span>)}
                        </div>
                        <div className="x01-visit-actions">
                            <Button label={t('Enter score')} icon="pi pi-check" className="justify-content-center x01-enter" disabled={!pending.length} onClick={enterVisit} />
                            <Button icon="pi pi-undo" severity="danger" className="x01-undo" aria-label={t('Undo dart')} disabled={!canUndo} onClick={undoDart} />
                        </div>
                    </div>
                }
                <Toast ref={toast} position="bottom-right" />
            </div>
        );
    }

    const missing = players.length ? null : t('Choose a player');
    const chosen = (definition.options ?? []).map(option => option.values.find(value => value.value === settings[option.key])?.label).filter(Boolean);

    return (
        <div className="container-fluid p-4 border-0">
            {/* the way up above the setup, in line with the panels below */}
            <div className="row justify-content-center">
                <div className="col-12 col-xl-10">{header}</div>
            </div>
            <div className="row g-4 justify-content-center">
                {finished &&
                    // as wide as the setup and the scoreboard below together
                    <div className="col-12 col-xl-10">
                        <TrainingResult
                            definition={definition}
                            finished={finished}
                            // as after a game: again on the left, the setup behind the divider
                            actions={<>
                                <div className="result-hero-again">
                                    <Button label={t('Again')} icon="pi pi-replay" size="small" onClick={() => start(finished.saved?.player ?? players[0])} disabled={!players[0] && !finished.saved} />
                                </div>
                                <span className="result-hero-actions-divider" aria-hidden="true" />
                                <Button label={t('Change the setup')} icon="pi pi-sliders-h" size="small" severity="secondary" text onClick={() => setFinished(null)} />
                            </>}
                        />
                    </div>
                }
                {/* what it did for one's own weekly goals, as wide as the result */}
                {(finished?.saved?.goalsReached?.length > 0 || finished?.saved?.practiceGoals?.some(goal => !goal.reached)) &&
                    <div className="col-12 col-xl-10">
                        <PracticeGoalNews goals={finished.saved.practiceGoals} reached={finished.saved.goalsReached ?? []} />
                    </div>
                }
                {(finished?.saved?.newBadges?.length > 0 || finished?.saved?.clubBadges?.length > 0) &&
                    // on a panel of their own, as wide as the result; the club's below the player's
                    <div className="col-12 col-xl-10">
                        <Panel header={t('New badges')}>
                            <div className="d-flex flex-column gap-4">
                                <NewBadges groups={[{ player: finished.saved.player, badges: finished.saved.newBadges ?? [] }]} heading={false} />
                                <ClubBadgeNews badges={finished.saved.clubBadges ?? []} training />
                            </div>
                        </Panel>
                    </div>
                }
                {/* after a training the scoreboard comes first on a narrow screen, where the new entry is seen */}
                <div className="col-12 col-xl-6 order-2 order-xl-1">
                    <Panel header={definition.title} icons={rulesButton}>
                        {rules}
                        {/* the open rules start with the description already */}
                        {!rules && <p className="text-subtle fs-7 mt-0">{definition.description}</p>}
                        {/* as the game setups: the last setup, with a way to start fresh */}
                        {remembered && <GameSetupMemory training onReset={() => { clearSetup(memoryKey); setRemembered(null); setSettings(settingsOf(definition, {})); setPlayers([]); }} />}
                        <p className="game-setup-section-title">{t('Player')}</p>
                        <PlayerPicker selected={players} onChange={setPlayers} initialIds={remembered?.playerIds} single minPlayers={1} key={remembered ? 'remembered' : 'fresh'} />
                        {/* as the other setups: the options under a section of their own */}
                        {(definition.options ?? []).length > 0 && <p className="game-setup-section-title mt-4">{t('Training')}</p>}
                        {/* two options side by side where there is room, as the in and out of a game's setup */}
                        <div className="row gx-3">
                            {(definition.options ?? []).map(option => (
                                <div className={definition.options.length > 1 ? 'col-12 col-md-6' : 'col-12'} key={option.key}>
                                    <div className="setting-box h-100">
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
                                </div>
                            ))}
                        </div>
                        <GameSetupStart
                            summary={[definition.title, ...chosen, players[0]?.nickname].filter(Boolean).join(' · ')}
                            missing={missing}
                            onStart={() => start()}
                            label={t('Start training')}
                        />
                    </Panel>
                </div>
                <div className={`col-12 col-xl-4 ${finished ? 'order-1' : 'order-3'} order-xl-2`}>
                    <RulesTrainingBoard definition={definition} version={boardVersion} highlight={finished?.saved?.id} settings={settings} />
                </div>
            </div>
            {celebration && <Celebration {...celebration} onClose={() => setCelebration(null)} />}
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default RulesTraining;
