import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { Avatar } from 'primereact/avatar';
import { Skeleton } from 'primereact/skeleton';
import { Toast } from 'primereact/toast';
import { FaRobot } from 'react-icons/fa6';
import dayjs from 'dayjs';

import X01Models from '../../models/x01.models';
import X01TrainingService from '../../services/x01.training.service';
import StatsService from '../../services/stats.service';
import { useAuth } from '../../utils/auth.context';
import { useMyPlayers, playerInClub } from '../../utils/use.my.players';
import { requestJSON } from '../../utils/service.utils';
import { BOT_ID, BOT_LEVELS, botStrengthFrom } from '../../utils/x01.bot';
import { ageOn, strengthOf } from '../../utils/handicap';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

const pills = (values, label = (value) => value) => values.map(value => ({ label: label(value), value }));
const SCORES = pills([301, 501, 701]);
const OUTS = pills(['Double Out', 'Straight Out', 'Master Out']);
const INS = pills(['Straight In', 'Double In']);
const LEGS = pills([1, 2, 3], (value) => `First to ${value} ${value === 1 ? 'leg' : 'legs'}`);

// a setting with its title, as in the game setups: the title and its row make one box
const Setting = ({ title, children }) => (
    <>
        <p className="setting-title">{title}</p>
        <div className="setting-body">{children}</div>
    </>
);

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
 * X01 against the bot: a training that plays like a game, against a bot as
 * strong as the player (or a bit easier or harder), worked out from their
 * statistics. Trainings count for no game statistics, badges or levels.
 */
const X01BotPage = () => {
    const navigate = useNavigate();
    const toast = useRef(null);
    const { activeClub, isClubAdmin, isGlobalAdmin } = useAuth();
    const myPlayer = playerInClub(useMyPlayers(!isGlobalAdmin), activeClub?.id);

    // admins may train as any player of the club, everyone else as their own
    const [clubPlayers, setClubPlayers] = useState([]);
    const [playerId, setPlayerId] = useState(null);
    const [settings, setSettings] = useState({ startingScore: 501, legOutMode: 'Double Out', legInMode: 'Straight In', numberOfLegs: 2, botStarts: false, level: 'same' });
    const [figures, setFigures] = useState(null);
    const [trainings, setTrainings] = useState(null);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        if (isClubAdmin) requestJSON('/api/players').then(list => setClubPlayers(list.filter(player => !player.guest))).catch(() => setClubPlayers([]));
    }, [isClubAdmin]);
    useEffect(() => {
        if (!playerId && myPlayer) setPlayerId(myPlayer.id);
    }, [myPlayer, playerId]);

    const player = clubPlayers.find(entry => entry.id === playerId) ?? (myPlayer?.id === playerId ? myPlayer : null);

    // the player's statistics and form, for the bot's strength, and their trainings
    useEffect(() => {
        if (!playerId) return;
        setFigures(null);
        setTrainings(null);
        Promise.all([
            StatsService.loadPlayerStats(playerId).catch(() => ({})),
            StatsService.loadPlayersForm([playerId]).then(forms => forms?.[playerId] ?? null).catch(() => null),
        ]).then(([stats, form]) => setFigures({ stats, form }));
        X01TrainingService.loadTrainings(playerId).then(setTrainings).catch(() => setTrainings([]));
    }, [playerId]);

    const strength = useMemo(() => {
        if (!figures) return null;
        const fallback = strengthOf({ age: ageOn(player?.dateOfBirth), levelId: figures.stats?.level?.level?.id });
        return botStrengthFrom({ form: figures.form, stats: figures.stats, fallback, level: settings.level });
    }, [figures, player?.dateOfBirth, settings.level]);

    const set = (changes) => setSettings(current => ({ ...current, ...changes }));

    const start = async () => {
        if (!player || !strength) return;
        setStarting(true);
        const players = settings.botStarts ? [BOT_ID, player.id] : [player.id, BOT_ID];
        try {
            const training = await X01TrainingService.createX01Game({
                ...X01Models.X01GameModel,
                startingScore: settings.startingScore,
                legInMode: settings.legInMode,
                legOutMode: settings.legOutMode,
                setMode: 'First to',
                numberOfSets: 1,
                legMode: 'First to',
                numberOfLegs: settings.numberOfLegs,
                numberOfPlayers: 2,
                players,
                currentPlayerTurn: players[0],
                startingPlayerSet: players[0],
                startingPlayerLeg: players[0],
                playerModels: Object.fromEntries(players.map(id => [id, { ...X01Models.X01PlayerModel, score: settings.startingScore }])),
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

    const choosable = isClubAdmin && clubPlayers.length > 0;

    return (
        <div className="container-fluid p-4 border-0">
            <Toast ref={toast} position="bottom-right" />
            <Panel header="X01 against the bot" className="w-100 w-md-75 w-xxl-50 mx-auto">
                <p className="text-subtle fs-7 mt-0">
                    Play X01 against a bot as strong as you are, worked out from your statistics. It aims like a player, takes the way out and misses like one.
                    Trainings count for no game statistics, badges or levels.
                </p>

                {!player && !choosable
                    ? <p className="text-subtle fs-7 m-0">You do not play in this club, so there is no player to train with. Add yourself as a player under <Link to="/my-clubs">My clubs</Link>.</p>
                    : (
                        <div>
                            <Setting title="Player">
                                {choosable
                                    ? <Dropdown
                                        value={playerId}
                                        options={clubPlayers.map(entry => ({ label: entry.nickname, value: entry.id }))}
                                        onChange={(e) => setPlayerId(e.value)}
                                        filter={clubPlayers.length > 8}
                                        placeholder="Choose a player"
                                        className="w-100"
                                        aria-label="Player"
                                    />
                                    : player && (
                                        <span className="d-inline-flex align-items-center gap-2">
                                            <Avatar image={player.profileImg ? resolvePlayerImg(player.profileImg) : undefined} label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname, player.lastname)} shape="circle" className="avatar-sm bg-surface-high" />
                                            <span className="text-default fw-semibold">{player.nickname}</span>
                                        </span>
                                    )
                                }
                            </Setting>

                            <Setting title="The bot">
                                <div className="d-flex flex-column gap-2">
                                    <SelectButton value={settings.level} options={BOT_LEVELS} onChange={(e) => e.value && set({ level: e.value })} className="p-selectbutton-pills pills-inline" aria-label="How strong the bot plays" />
                                    {!strength
                                        ? <Skeleton width="80%" height="0.9rem" />
                                        : (
                                            <span className="x01-bot-strength">
                                                <FaRobot aria-hidden="true" />
                                                <span>
                                                    Averages <strong>{strength.average.toFixed(1)}</strong>
                                                    {strength.checkoutRate != null && <> and hits <strong>{Math.round(strength.checkoutRate * 100)} %</strong> at the doubles</>}
                                                    <span className="text-faint"> · from {strength.basis}</span>
                                                </span>
                                            </span>
                                        )
                                    }
                                </div>
                            </Setting>

                            <Setting title="Starting score">
                                <SelectButton value={settings.startingScore} options={SCORES} onChange={(e) => e.value && set({ startingScore: e.value })} className="p-selectbutton-pills pills-inline" aria-label="Starting score" />
                            </Setting>
                            <Setting title="In and out">
                                <div className="d-flex flex-column gap-2">
                                    <SelectButton value={settings.legInMode} options={INS} onChange={(e) => e.value && set({ legInMode: e.value })} className="p-selectbutton-pills pills-inline" aria-label="In" />
                                    <SelectButton value={settings.legOutMode} options={OUTS} onChange={(e) => e.value && set({ legOutMode: e.value })} className="p-selectbutton-pills pills-inline flex-wrap" aria-label="Out" />
                                </div>
                            </Setting>
                            <Setting title="Legs">
                                <SelectButton value={settings.numberOfLegs} options={LEGS} onChange={(e) => e.value && set({ numberOfLegs: e.value })} className="p-selectbutton-pills pills-inline flex-wrap" aria-label="Legs" />
                            </Setting>
                            <Setting title="Who starts">
                                <SelectButton
                                    value={settings.botStarts}
                                    options={[{ label: player?.nickname ?? 'You', value: false }, { label: 'The bot', value: true }]}
                                    onChange={(e) => e.value !== null && e.value !== undefined && set({ botStarts: e.value })}
                                    className="p-selectbutton-pills pills-inline"
                                    aria-label="Who starts"
                                />
                            </Setting>

                            <Button
                                type="button"
                                className="w-100"
                                label={`Start training · ${settings.startingScore} ${settings.legOutMode} · first to ${settings.numberOfLegs}`}
                                icon="pi pi-play"
                                loading={starting}
                                disabled={!player || !strength}
                                onClick={start}
                            />
                        </div>
                    )
                }
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
                                        <span className="text-default fw-semibold fs-7">
                                            {training.startingScore} {training.legOutMode} · {result.legs}
                                        </span>
                                        <span className="text-faint fs-8">
                                            {dayjs(training.createdAt).format('DD.MM.YYYY HH:mm')}
                                            {result.average != null && ` · you ${result.average.toFixed(1)}, bot ${result.botAverage?.toFixed(1) ?? '–'}`}
                                        </span>
                                    </div>
                                    <Link
                                        to={finished ? `/stats/training/x01/${training.id}` : `/training/x01/${training.id}`}
                                        className="p-button p-button-sm p-button-secondary ms-auto"
                                    >
                                        {finished ? 'View' : 'Continue'}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </Panel>
            }
        </div>
    );
};

export default X01BotPage;
