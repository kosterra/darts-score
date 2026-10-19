import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Skeleton } from 'primereact/skeleton';
import { Toast } from 'primereact/toast';
import { FaRobot } from 'react-icons/fa6';
import dayjs from 'dayjs';

import X01Models from '../../models/x01.models';
import X01TrainingService from '../../services/x01.training.service';
import StatsService from '../../services/stats.service';
import PlayerPicker from '../game_config/config_components/player.picker';
import X01ScoreConfig from '../game_config/config_components/x01.score.config';
import X01InOutConfig from '../game_config/config_components/x01.inout.config';
import SetsLegsConfig from '../game_config/config_components/sets.legs.config';
import GameSetupStart from '../game_config/config_components/game.setup.start';
import GameSetupMemory from '../game_config/config_components/game.setup.memory';
import { clearSetup, loadSetup, saveSetup } from '../../utils/setup.memory';
import { setsLegsSummary } from '../game_config/config_components/game.setup.summary';
import { useAuth } from '../../utils/auth.context';
import { useMyPlayers, playerInClub } from '../../utils/use.my.players';
import { BOT_ID, BOT_LEVELS, BOT_PRESETS, LIKE_ME, botStrength, knowsPlayer } from '../../utils/x01.bot';
import { ageOn, strengthOf } from '../../utils/handicap';

// the starting scores of a training (a choice of the club may follow)
const TRAINING_SCORES = [101, 170, 301, 501, 701].map(value => ({ value }));
// two rows: the fixed bots, and the ones as strong as the player
const PRESET_MODES = BOT_PRESETS.map(({ value, label }) => ({ value, label }));
const PLAYER_MODES = BOT_LEVELS.map(({ value }) => ({ value: `${LIKE_ME}-${value}`, label: { easier: 'Easier than me', same: 'Like me', harder: 'Harder than me' }[value] }));

// what a training starts with, and what of it is remembered for the next one
const MEMORY = 'x01Bot';
const DEFAULT_GAME = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'First to', numberOfSets: 1, legMode: 'First to', numberOfLegs: 2 };

// the result of a training from the player's side: { won, legs, average, botAverage }
const resultOf = (training, playerId) => {
    const own = training.playerModels?.[playerId] ?? {};
    const bot = training.playerModels?.[BOT_ID] ?? {};
    return {
        won: Boolean(own.hasWonGame),
        legs: `${own.legsWon?.game ?? 0}–${bot.legsWon?.game ?? 0}`,
        average: own.averages?.game?.overall ?? null,
        botAverage: bot.averages?.game?.overall ?? null,
    };
};

/**
 * X01 against the bot: set up like an X01 game, with one player and a bot,
 * fixed (easy to pro) or as strong as the player from their statistics.
 * Trainings count for no game statistics, badges or levels.
 */
const X01BotPage = () => {
    const navigate = useNavigate();
    const toast = useRef(null);
    const { activeClub, isGlobalAdmin } = useAuth();
    const myPlayer = playerInClub(useMyPlayers(!isGlobalAdmin), activeClub?.id);

    // set up like the last training, until the player starts fresh
    const [remembered, setRemembered] = useState(() => loadSetup(MEMORY));
    const [players, setPlayers] = useState([]);
    const [game, setGame] = useState(() => ({ ...X01Models.X01GameModel, ...DEFAULT_GAME, ...remembered?.settings?.game }));
    const [botStarts, setBotStarts] = useState(() => remembered?.settings?.botStarts ?? 'player');
    // a fixed bot ('easy' … 'pro') or one like the player ('me-easier', 'me-same', 'me-harder')
    const [choice, setChoice] = useState(() => remembered?.settings?.choice ?? null);
    const [mode, level] = choice?.startsWith(`${LIKE_ME}-`) ? [LIKE_ME, choice.slice(LIKE_ME.length + 1)] : [choice, 'same'];
    const [figures, setFigures] = useState(null);
    const [trainings, setTrainings] = useState(null);
    const [starting, setStarting] = useState(false);

    const player = players[0] ?? null;

    // the player's statistics and form, for "Like me", and their trainings
    useEffect(() => {
        if (!player?.id) return;
        setFigures(null);
        setTrainings(null);
        Promise.all([
            StatsService.loadPlayerStats(player.id).catch(() => ({})),
            StatsService.loadPlayersForm([player.id]).then(forms => forms?.[player.id] ?? null).catch(() => null),
        ]).then(([stats, form]) => {
            setFigures({ stats, form });
            // like the player when the statistics know them, otherwise a bot in the middle
            setChoice(current => current ?? (knowsPlayer({ stats, form }) ? `${LIKE_ME}-same` : 'normal'));
        });
        X01TrainingService.loadTrainings(player.id).then(setTrainings).catch(() => setTrainings([]));
    }, [player?.id]);

    const strength = useMemo(() => {
        if (!figures || !mode) return null;
        const fallback = strengthOf({ age: ageOn(player?.dateOfBirth), levelId: figures.stats?.level?.level?.id });
        return botStrength({ mode, level, form: figures.form, stats: figures.stats, fallback });
    }, [figures, mode, level, player?.dateOfBirth]);
    const guessed = mode === LIKE_ME && figures && !knowsPlayer(figures);

    const handleConfigChange = (name, value) => {
        setGame(current => ({ ...current, [name]: ['setMode', 'legMode', 'legInMode', 'legOutMode'].includes(name) ? value : Number(value) }));
    };

    const missing = !player ? 'Choose who trains' : !strength ? 'Working out the bot…' : null;
    const summary = [
        `${game.startingScore} · ${game.legInMode} / ${game.legOutMode}`,
        setsLegsSummary(game),
        `${player?.nickname} vs Bot ${strength ? strength.average.toFixed(0) : ''}`.trim(),
    ].join(' · ');

    const startFresh = () => {
        clearSetup(MEMORY);
        setRemembered(null);
        setPlayers([]);
        setGame({ ...X01Models.X01GameModel, ...DEFAULT_GAME });
        setBotStarts('player');
        setChoice(null);
    };

    const start = async () => {
        if (missing) return;
        setStarting(true);
        saveSetup(MEMORY, {
            settings: { game: Object.fromEntries(Object.keys(DEFAULT_GAME).map(name => [name, game[name]])), choice, botStarts },
            players,
        });
        const order = botStarts === 'bot' ? [BOT_ID, player.id] : [player.id, BOT_ID];
        try {
            const training = await X01TrainingService.createX01Game({
                ...game,
                numberOfPlayers: 2,
                players: order,
                currentPlayerTurn: order[0],
                startingPlayerSet: order[0],
                startingPlayerLeg: order[0],
                playerModels: Object.fromEntries(order.map(id => [id, { ...X01Models.X01PlayerModel, score: Number(game.startingScore) }])),
                bot: strength,
            });
            navigate(`/training/x01/${training.id}`);
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: 'Not started', detail: error.message, life: 5000 });
            setStarting(false);
        }
    };

    if (isGlobalAdmin) {
        return <div className="container-fluid p-4 text-subtle">Global admins belong to no club and have no player to train with.</div>;
    }

    return (
        <div className="container-fluid p-4 border-0">
            <Panel header="X01 against the bot" className="w-100 w-md-75 w-xxl-50 mx-auto">
                <div className="container">
                    {remembered && <GameSetupMemory what="training" onReset={startFresh} />}
                    <p className="game-setup-section-title">Player</p>
                    {/* the player of the last training, else the own one (restarted once it is known) */}
                    <PlayerPicker
                        single
                        selected={players}
                        onChange={setPlayers}
                        initialIds={remembered?.playerIds?.length ? remembered.playerIds : myPlayer ? [myPlayer.id] : []}
                        key={remembered?.playerIds?.length ? 'remembered' : `own-${myPlayer?.id ?? 'none'}`}
                    />

                    <p className="game-setup-section-title mt-4">Bot</p>
                    <div>
                        <p className="setting-title">Strength</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column gap-3">
                                <SelectButton value={choice} options={PRESET_MODES} onChange={(e) => e.value && setChoice(e.value)} className="p-selectbutton-pills flex-wrap" aria-label="A fixed bot" />
                                <SelectButton value={choice} options={PLAYER_MODES} onChange={(e) => e.value && setChoice(e.value)} className="p-selectbutton-pills flex-wrap" aria-label="A bot like the player" />
                                {!player
                                    ? <span className="text-faint fs-8">Choose who trains first.</span>
                                    : !strength
                                        ? <Skeleton width="80%" height="0.9rem" />
                                        : (
                                            <span className="x01-bot-strength">
                                                <FaRobot aria-hidden="true" />
                                                <span>
                                                    Averages <strong>{strength.average.toFixed(1)}</strong>
                                                    {strength.checkoutRate != null && <> and hits <strong>{Math.round(strength.checkoutRate * 100)} %</strong> at the doubles</>}
                                                    <span className="text-faint"> · {mode === LIKE_ME ? `${player.nickname}: ${strength.basis}` : strength.basis}</span>
                                                    {guessed && <span className="d-block text-faint">Without X01 games of {player.nickname} this is a guess; Normal is a good start.</span>}
                                                </span>
                                            </span>
                                        )
                                }
                                <span className="x01-bot-hint">Trainings count for no game statistics, badges or levels.</span>
                            </div>
                        </div>
                    </div>

                    <p className="game-setup-section-title mt-4">Game</p>
                    <X01ScoreConfig scoreOption={game.startingScore} onScoreChange={handleConfigChange} options={TRAINING_SCORES} pillsClassName="pills-fit" />
                    <X01InOutConfig legInOption={game.legInMode} legOutOption={game.legOutMode} onInOutChange={handleConfigChange} />
                    <SetsLegsConfig
                        setModeOption={game.setMode}
                        legModeOption={game.legMode}
                        numberOfSetsOption={game.numberOfSets}
                        numberOfLegsOption={game.numberOfLegs}
                        onSetsLegsChange={handleConfigChange}
                    />
                    <div>
                        <p className="setting-title">Who starts</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col">
                                <SelectButton
                                    value={botStarts}
                                    options={[{ label: player?.nickname ?? 'The player', value: 'player' }, { label: 'The bot', value: 'bot' }]}
                                    onChange={(e) => e.value && setBotStarts(e.value)}
                                    className="p-selectbutton-pills flex-wrap"
                                    aria-label="Who starts"
                                />
                            </div>
                        </div>
                    </div>

                    <GameSetupStart label="Start training" summary={summary} missing={missing} loading={starting} onStart={start} />
                </div>
            </Panel>

            {player && trainings?.length > 0 &&
                <Panel header="Recent trainings" className="w-100 w-md-75 w-xxl-50 mx-auto mt-4">
                    <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                        {trainings.slice(0, 10).map(training => {
                            const result = resultOf(training, player.id);
                            const finished = training.hasWinner;
                            return (
                                <li key={training.id} className="x01-bot-training">
                                    <span className={`x01-bot-training-result ${finished ? (result.won ? 'is-won' : 'is-lost') : ''}`}>
                                        {finished ? (result.won ? 'Won' : 'Lost') : 'Running'}
                                    </span>
                                    <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                                        <span className="text-default fw-semibold fs-7">{training.startingScore} {training.legOutMode} · {result.legs}</span>
                                        <span className="text-faint fs-8">
                                            {dayjs(training.createdAt).format('DD.MM.YYYY HH:mm')}
                                            {result.average != null && ` · ${player.nickname} ${result.average.toFixed(1)}, bot ${result.botAverage?.toFixed(1) ?? '–'}`}
                                        </span>
                                    </div>
                                    <Link to={finished ? `/stats/training/x01/${training.id}` : `/training/x01/${training.id}`} className="p-button p-button-sm p-button-secondary ms-auto">
                                        {finished ? 'View' : 'Continue'}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </Panel>
            }
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default X01BotPage;
