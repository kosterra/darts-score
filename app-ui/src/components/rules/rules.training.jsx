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
import Celebration from '../badges/celebration';
import NewBadges from '../badges/new.badges';
import { ClubBadgeNews } from '../badges/club.badges';
import PracticeGoalNews from '../goals/practice.goal.news';
import UpLink from '../elements/up.link';
import RulesTrainingBoard from './rules.training.board';
import RulesDoubles from './rules.doubles';
import LiveHero from '../games/common/live.hero';
import RulesService from '../../services/rules.service';
import { trainingOf } from '../../rules/trainings';
import { replayTraining, settingsOf } from '../../rules/engine';
import { parseDart } from '../../rules/darts';
import { clearSetup, loadSetup, saveSetup } from '../../utils/setup.memory';
import { t } from '../../utils/i18n';
import useGameRules from '../games/common/game.rules';
import GameResultHeader from '../stats/common/game.result.header';
import PlayerService from '../../services/player.service';
import { checkoutRoutes, formatRoute, setupSuggestions } from '../../utils/checkout.routes';
import useGamePreferences from '../../utils/use.game.preferences';

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
// short figures as big numbers; a long one (e.g. the hardest doubles) gets a line of its own
const SHORT = 9;

/**
 * The result of a training in the header of a finished game: what was
 * trained, the player with the result as the score (a new personal best
 * glows gold, as a winner), the other figures beside it, and the next
 * attempt or the setup as the game's actions. The long figures (e.g. the
 * hardest doubles) and how it stands against the best are lines below.
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
                // the number alone, as a game's score; the unit is in the label below
                scoreOf={() => own?.[1] ?? definition.format(score)}
                scoreDetailOf={() => own?.[0] ?? t('Result')}
                rows={short.map(([label], index) => ({ key: `figure-${index}`, label, neutral: true }))}
                figures={{ [id]: Object.fromEntries(short.map(([, value], index) => [`figure-${index}`, value])) }}
                actions={actions}
                // the long figures in the header too, under the player, and what every double took
                footer={<>
                    {long.map(([label, value]) => (
                        <p key={label} className="text-center text-subtle fs-7 mt-3 mb-0"><span className="text-faint">{label}:</span>{' '}<strong className="text-default">{value}</strong></p>
                    ))}
                    {doubles && <RulesDoubles cells={doubles} label={definition.doublesLabel} className="mt-3" />}
                </>}
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
            {routes.length > 0 && profile?.doubleSource === 'set' && <span className="x01-ways-note">{t('Your favourite double first:')}{' '}{profile.favouriteDouble}{' '}{t('(set in the profile).')}</span>}
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
    // { player, settings, darts } while training
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

    const replay = useMemo(() => running && definition ? replayTraining(definition, running) : null, [running, definition]);
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
        const { left, dartsLeft } = definition.checkout(replay.state, { settings: replay.settings });
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
        // when it started, for fair play (darts faster than they can be thrown)
        setRunning({ player, settings: prepared, darts: [], startedAt: new Date().toISOString() });
    };

    const throwDart = (value) => {
        if (!running || replay?.done) return;
        const dart = definition.input === 'hitmiss' ? value : parseDart(String(value)).field;
        setUndone(null);
        setRunning({ ...running, darts: [...running.darts, dart] });
    };
    const undoDart = () => {
        if (!running?.darts.length) return;
        setUndone(last => ({ count: (last?.count ?? 0) + 1, status: definition.status(replay.state, { settings: replay.settings }) }));
        setRunning({ ...running, darts: running.darts.slice(0, -1) });
    };
    const quit = () => {
        setUndone(null);
        setRunning(null);
        setFinished(null);
    };

    const header = <UpLink to="/training/more" label={t('More trainings')} />;

    // the training under way
    if (running && replay && !replay.done) {
        const ctx = { settings: replay.settings };
        // the darts of this visit: an attempt of a checkout training may end before its third
        const inVisit = definition.inVisit ? definition.inVisit(replay.state, ctx) : running.darts.length % 3;
        const visitDarts = inVisit ? running.darts.slice(-inVisit) : [];
        const status = definition.status(replay.state, ctx);
        const changed = undone ? status.filter(([, value], index) => String(undone.status[index]?.[1]) !== String(value)).map(([label]) => label) : [];
        const target = definition.target(replay.state, ctx);
        const doubles = definition.doubles ? definition.doubles(replay.state, ctx) : null;
        return (
            // x01-live: the gutters of a game, so nothing is wider than a phone
            <div className="container-fluid bg-transparent border-0 x01-game-page x01-live">
                <LiveHero
                    rulesId={kind}
                    title={[definition.title, ...(definition.options ?? []).map(option => option.values.find(value => value.value === replay.settings[option.key])?.label).filter(Boolean)].join(' · ')}
                    subtitle={target}
                    rows={[{
                        player: running.player,
                        isTurn: true,
                        line: status.map(([label, value], index) => <span key={label}>{index > 0 && ' · '}{label}{' '}<strong>{value}</strong></span>),
                        score: definition.hero ? definition.hero(replay.state, ctx) : target,
                        // the double to throw at in the accent, played again when it changes (also by an undo)
                        scoreClass: definition.heroTarget ? 'rules-hero-target' : '',
                        scoreKey: definition.heroTarget ? `${target}-${undone?.count ?? 0}` : undefined,
                        // the way out to throw, as in X01; without one the target (or what the training stands at)
                        below: ways?.routes[0] ? <span className="x01-live-route">{formatRoute(ways.routes[0])}</span>
                            : ways?.setup ? <span className="x01-live-route is-setup">{formatRoute(ways.setup.darts)}</span>
                                : <span className="x01-live-route">{definition.heroNote ? definition.heroNote(replay.state, ctx) : target}</span>,
                    }]}
                />
                <div className="row g-4 justify-content-center x01-play">
                    <div className="col-12 col-lg-7">
                        {/* every double in turn: done in the colour of what it took, the one now in the accent */}
                        {doubles && <RulesDoubles cells={doubles} label={definition.doublesLabel} live className="mb-3" />}
                        {definition.input === 'hitmiss'
                            ? <div className="rules-hitmiss">
                                <Button label={t('Hit')} icon="pi pi-check" onClick={() => throwDart('H')} />
                                <Button label={t('Miss')} icon="pi pi-times" severity="secondary" onClick={() => throwDart('M')} />
                            </div>
                            : input === 'keypad'
                                ? <DartKeypad canThrow onDart={throwDart} onClearLast={undoDart} entered={running.darts.length % 3} />
                                : <div className="x01-board-plain"><div className="x01-board-col"><DartBoard handleClick={(value) => throwDart(value)} markers={[]} /></div></div>}
                    </div>
                    <div className="col-12 col-lg-5 d-flex flex-column gap-4">
                        {/* the board or the keypad in the panel's header, as in the games */}
                        <Panel header={t('Training')} icons={definition.input === 'hitmiss' ? null : (
                            <SelectButton
                                value={input}
                                options={INPUTS}
                                onChange={(e) => chooseInput(e.value)}
                                itemTemplate={(option) => <span className="d-inline-flex align-items-center gap-1"><i className={option.icon} aria-hidden="true" />{option.label}</span>}
                                className="p-selectbutton-pills pills-inline x01-input-switch"
                                aria-label={t('Enter the darts with')}
                            />
                        )}>
                            <Status items={status} changed={changed} flash={undone?.count} />
                            {/* the three darts of the visit: hit or miss (or the field), the next one framed */}
                            <ol className="rules-visit mt-3" aria-label={t('Darts of this visit')}>
                                {[0, 1, 2].map(index => {
                                    const dart = visitDarts[index];
                                    const kind = dart === 'H' ? 'is-hit' : dart === 'M' ? 'is-miss' : dart ? 'is-thrown' : index === visitDarts.length ? 'is-next' : 'is-empty';
                                    const flash = undone && index === visitDarts.length;
                                    return (
                                        <li key={flash ? `${index}-${undone.count}` : index} className={`rules-visit-dart ${kind} ${flash ? 'is-undone' : ''}`} aria-current={kind === 'is-next' ? 'step' : undefined}>
                                            <span className="rules-visit-number">{t('Dart {{number}}', { number: index + 1 })}</span>
                                            <span className="rules-visit-mark">
                                                {dart === 'H' ? <><i className="pi pi-check" aria-hidden="true" />{t('Hit')}</>
                                                    : dart === 'M' ? <><i className="pi pi-times" aria-hidden="true" />{t('Miss')}</>
                                                        : dart ?? '–'}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                            {/* after an undo: where it stands again */}
                            {undone && <p key={undone.count} className="rules-undone" role="status"><i className="pi pi-undo" aria-hidden="true" />{t('Dart {{dart}} undone: {{target}} again', { dart: visitDarts.length + 1, target })}</p>}
                            {ways && <div className="mt-3"><TrainingWaysOut ways={ways} /></div>}
                            <div className="d-flex gap-2 justify-content-center mt-3">
                                <Button label={t('Undo dart')} icon="pi pi-undo" severity="secondary" outlined disabled={!running.darts.length} onClick={undoDart} />
                                <Button label={t('Stop')} icon="pi pi-stop" severity="danger" outlined onClick={quit} />
                            </div>
                        </Panel>
                    </div>
                </div>
                {/* on a phone the panel is below the board or the keypad: the darts of the visit,
                    where the training stands and Undo float above the menu bar, as in X01 */}
                {definition.input !== 'hitmiss' &&
                    <div className="x01-visit-bar is-floating rules-visit-bar d-md-none">
                        <div className="x01-visit-bar-darts" aria-hidden="true">
                            {[0, 1, 2].map(index => <span key={index} className={visitDarts[index] ? '' : 'is-empty'}>{visitDarts[index] ?? '–'}</span>)}
                        </div>
                        <div className="x01-visit-total" aria-live="polite">
                            {status.map(([label, value], index) => <span key={label}>{index > 0 && ' · '}{label}{' '}<strong>{value}</strong></span>)}
                        </div>
                        <div className="x01-visit-actions">
                            <Button icon="pi pi-undo" severity="secondary" className="x01-undo" aria-label={t('Undo dart')} disabled={!running.darts.length} onClick={undoDart} />
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
                    <RulesTrainingBoard definition={definition} version={boardVersion} highlight={finished?.saved?.id} />
                </div>
            </div>
            {celebration && <Celebration {...celebration} onClose={() => setCelebration(null)} />}
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default RulesTraining;
