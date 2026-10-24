import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';

import StatsService from '../../../services/stats.service';
import PlayerService from '../../../services/player.service';
import X01Models from '../../../models/x01.models';
import X01Service from '../../../services/x01.service';
import X01TrainingService from '../../../services/x01.training.service';
import { QuickX01Service, quickPlayersOf } from '../../../services/quick.game.service';
import QuickGameInvite from '../../quick/quick.game.invite';
import { BOT_ID, botPlayer } from '../../../utils/x01.bot';
import { shufflePlayers as shuffle } from '../../../utils/game.utils';
import GameResultHeader from '../common/game.result.header';
import GameResultActions from '../common/game.result.actions';
import MatchMoments from '../common/match.moments';
import { plural, whenPlayed } from '../common/game.text';
import X01LegsPanel from './x01.legs.panel';
import X01StatsComparisonBars from './x01.stats.comparison.bars';
import { legsOf, playerFigures, matchMoments } from '../../../utils/x01.game.summary';
import AverageTrendChart from '../charts/average.trend.chart';
import HitsHeatmapChart from '../charts/hits.heatmap.chart';
import DoublesChart from '../charts/doubles.chart';
import { ScoreRangesChart, ScoringFinishingChart, DartsPerLegChart } from '../charts/simple.bar.charts';
import { gameDartsPerLeg, gameScoring } from '../charts/game.chart.data';
import { sectionHitsOf } from '../charts/chart.theme';
import { GameStatsSkeleton } from '../../elements/skeletons';
import GameBadges from '../../badges/game.badges';
import UpLink from '../../elements/up.link';
import { describeRules, hasHandicap, rulesOf } from '../../../utils/x01.rules';
import { t } from '../../../utils/i18n';
import CompareLink from '../compare/compare.link';
import { ACCENT } from '../../../utils/palette';

// the key figures of every player in the header; for the best leg less wins
const FIGURES = [
    { key: 'average', label: t('3-dart average') },
    { key: 'firstNine', label: t('First 9 average') },
    { key: 'checkoutRate', label: t('Checkout'), format: (value) => `${value} %`, detail: (figures) => figures.checkoutDetail },
    { key: 'highestCheckout', label: t('Highest checkout') },
    { key: 'bestLeg', label: t('Best leg'), format: (value) => t('{{value}} darts', { value: value }), lowerIsBetter: true },
    { key: 'highestVisit', label: t('Highest visit') },
    { key: 'oneEighties', label: t('180s') },
    { key: 'dartsThrown', label: t('Darts thrown'), neutral: true },
];

// a heading above a group of charts
const SectionTitle = ({ children }) => <h2 className="stats-section-title">{children}</h2>;


// the colour of the game type, as on the dashboard and the profile
const GAME_COLOR = ACCENT.green;
/**
 * The statistics of one X01 game: the result with each player's key figures,
 * the moments of the match, every leg with its race to zero, the players side
 * by side for the game or a set, and the charts grouped by scoring, finishing
 * and the board.
 */
const X01GameStats = ({ training = false, quick = false }) => {
    // a training against the bot: its own service, the bot made up, no badges;
    // a quick game of the start page: the players only names, no badges either
    const Service = quick ? QuickX01Service : training ? X01TrainingService : X01Service;
    const { id } = useParams();
    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState(null);
    const [gameStats, setGameStats] = useState({});
    // the whole game or one set in the side-by-side bars
    const [barsScope, setBarsScope] = useState('game');
    // set by the game page when this game was won a moment ago
    const [justFinished] = useState(Boolean(useLocation().state?.justFinished));

    useEffect(() => {
        // forget the marker, so reloading the page does not celebrate again
        if (justFinished) window.history.replaceState({ ...window.history.state, usr: null }, '');
    }, [justFinished]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const gameData = await Service.loadX01GameById(id);
                if (!gameData) return;

                const people = gameData.players.filter(playerId => playerId !== BOT_ID);
                const playerData = quick ? quickPlayersOf(gameData) : [...(await PlayerService.findPlayersByIds(people)), ...(gameData.players.includes(BOT_ID) ? [botPlayer(gameData.bot)] : [])]
                    .filter(p => gameData.players.includes(p.id))
                    .sort((a, b) => gameData.players.indexOf(a.id) - gameData.players.indexOf(b.id));

                const statsData = quick || training ? await Service.loadX01GameStats(gameData.id) : await StatsService.loadX01GameStats(gameData.id);

                setGame(gameData);
                setPlayers(playerData);
                setGameStats(statsData);
            } catch (err) {
                console.error('Failed to load game data', err);
            }
        };

        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const legs = useMemo(() => game ? legsOf(game) : [], [game]);
    const figures = useMemo(() => game && players
        ? Object.fromEntries(players.map(player => [player.id, playerFigures(game, player.id, legs)]))
        : {}, [game, players, legs]);
    const moments = useMemo(() => game ? matchMoments(game, legs) : [], [game, legs]);

    const onNewGame = () => navigate(quick ? '/quick' : training ? '/training/x01' : '/x01', { replace: true });

    const onRestartGame = async (switchPlayers = false, shufflePlayers = false) => {
        if (!game) return;

        const newMatchSetup = {
            ...X01Models.X01GameModel,
            isSoloGame: game.players.length === 1,
            startingScore: game.startingScore,
            setMode: game.setMode,
            legMode: game.legMode,
            legInMode: game.legInMode,
            legOutMode: game.legOutMode,
            numberOfSets: game.numberOfSets,
            numberOfLegs: game.numberOfLegs,
            numberOfPlayers: game.players.length,
            flyingDarts: game.flyingDarts ?? 'players'
        };

        let newPlayers = [...game.players];
        if (switchPlayers) newPlayers.reverse();
        else if (shufflePlayers) newPlayers = shuffle(newPlayers);
        newMatchSetup.players = newPlayers;

        const startingPlayer = newPlayers[0];
        newMatchSetup.startingPlayerLeg = startingPlayer;
        newMatchSetup.startingPlayerSet = startingPlayer;
        newMatchSetup.currentPlayerTurn = startingPlayer;

        newMatchSetup.playerModels = newPlayers.reduce((acc, player) => {
            // a rematch keeps each player's handicap
            const rules = rulesOf(game, player);
            acc[player] = hasHandicap(game)
                ? { ...X01Models.X01PlayerModel, ...rules, score: rules.startingScore }
                : { ...X01Models.X01PlayerModel, score: Number(game.startingScore) };
            return acc;
        }, {});

        if (quick) {
            const newGame = await QuickX01Service.createX01Game({ ...newMatchSetup, quickPlayers: game.quickPlayers, flyingDarts: 'off' });
            navigate(`/quick/x01/${newGame.id}`);
            return;
        }
        // a training again: against the same bot
        const newGame = training
            ? await X01TrainingService.createX01Game({ ...newMatchSetup, bot: game.bot })
            : await X01Service.createX01Game(newMatchSetup);
        navigate(training ? `/training/x01/${newGame.id}` : `/x01/${newGame.id}`);
    };

    if (!game || !players) return <GameStatsSkeleton players={game?.players?.length ?? 2} />;

    const bySets = game.numberOfSets > 1;
    const barsScopes = [
        { label: t('All sets'), value: 'game' },
        ...Array.from({ length: game.setsPlayed ?? 0 }, (_, i) => ({ label: t('Set {{value}}', { value: i + 1 }), value: `set-${i + 1}` })),
    ];

    // a tournament match: on to its bracket, no rematch
    const tournamentId = game.tournament?.id;
    const actions = tournamentId
        ? <div className="d-flex justify-content-center"><Link to={`/tournaments/${tournamentId}`} className="p-button p-button-sm text-decoration-none"><i className="pi pi-sitemap me-2" />{t('To the bracket')}</Link></div>
        : <GameResultActions playerCount={game.players.length} onRestart={onRestartGame} onNewGame={onNewGame} />;

    return (
        <div className="container-fluid p-4 border-0">
            <div className="game-stats-page">
                {!quick && (tournamentId
                    ? <UpLink to={`/tournaments/${tournamentId}`} label={t('Tournament')} />
                    : <UpLink to={training ? '/trainings' : '/games'} label={training ? t('Trainings') : t('Games')} />)}
                <GameResultHeader
                    celebrate={justFinished && game.hasWinner}
                    game={game}
                    players={players}
                    // the way to the comparison of these players, in this game
                    footer={!quick && !training && players.length > 1 ? <div className="text-center mt-3"><CompareLink players={players} type="x01" /></div> : null}
                    title={`${hasHandicap(game) ? t('Handicap') : game.startingScore} · ${game.setMode} ${plural(game.numberOfSets, 'set')} · ${game.legMode} ${plural(game.numberOfLegs, 'leg')}`}
                    subtitle={hasHandicap(game)
                        ? `${players.map(player => `${player.nickname} ${describeRules(rulesOf(game, player.id))}`).join(' · ')} · ${whenPlayed(game)}`
                        : `${game.legInMode} / ${game.legOutMode} · ${whenPlayed(game)}`}
                    // sets decide when more than one could be played, otherwise legs
                    scoreOf={(player) => bySets ? game.playerModels[player.id]?.setsWon ?? 0 : figures[player.id]?.legsWon ?? 0}
                    scoreDetailOf={(player) => bySets
                        ? `${plural(game.playerModels[player.id]?.setsWon ?? 0, 'set')} · ${plural(figures[player.id]?.legsWon ?? 0, 'leg')}`
                        : plural(figures[player.id]?.legsWon ?? 0, 'leg')}
                    rows={FIGURES}
                    figures={figures}
                    actions={actions}
                />

                {/* trainings and quick games earn no badges */}
                {quick && <QuickGameInvite />}
                {!training && !quick &&
                    <GameBadges
                        gameType="x01"
                        gameId={game.id}
                        players={players}
                        winner={players.find(player => game.playerModels[player.id]?.hasWonGame)}
                        celebrate={justFinished && game.hasWinner}
                        className="mb-4"
                    />
                }

                <MatchMoments moments={moments} players={players} color={GAME_COLOR} />

                <X01LegsPanel game={game} players={players} legs={legs} />

                {players.length > 1 &&
                    <Panel header={t('Side by side')} className="mb-4">
                        {barsScopes.length > 2 &&
                            <div className="d-flex justify-content-start mb-3">
                                <SelectButton value={barsScope} options={barsScopes} onChange={(e) => e.value && setBarsScope(e.value)} className="p-selectbutton-pills pills-inline" aria-label={t('Whole game or set')} />
                            </div>
                        }
                        <X01StatsComparisonBars game={game} valueKey={barsScope} players={players} />
                    </Panel>
                }

                <SectionTitle>{t('Scoring')}</SectionTitle>
                <div className="row g-4 mb-4">
                    <div className="col-12 col-xl-6">
                        <AverageTrendChart
                            title={t('Average per leg')}
                            description={t('Every player\'s average in each leg of this game.')}
                            data={gameStats?.avg ?? []}
                            players={players}
                        />
                    </div>
                    <div className="col-12 col-xl-6"><ScoreRangesChart data={gameStats?.scoreRanges ?? []} players={players} /></div>
                </div>

                <SectionTitle>{t('Finishing')}</SectionTitle>
                <div className="row g-4 mb-4">
                    <div className="col-12 col-xl-6"><ScoringFinishingChart scoring={gameScoring(game, players)} players={players} /></div>
                    <div className="col-12 col-xl-6">
                        <DartsPerLegChart data={gameDartsPerLeg(game, players)} players={players} description={t('Darts each player needed for the legs they won in this game.')} />
                    </div>
                    <div className="col-12"><DoublesChart ratesByPlayer={players.map((_, i) => gameStats?.checkouts?.[`player${i + 1}`] ?? [])} players={players} /></div>
                </div>

                <SectionTitle>{t('On the board')}</SectionTitle>
                <div className="row g-4">
                    <div className="col-12"><HitsHeatmapChart hitsByPlayer={players.map((_, i) => sectionHitsOf(gameStats?.sectionHits ?? [], i))} players={players} gameName={t('this game')} /></div>
                </div>
            </div>
        </div>
    );
};

export default X01GameStats;
