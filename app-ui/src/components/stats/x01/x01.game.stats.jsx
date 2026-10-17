import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { SplitButton } from 'primereact/splitbutton';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { PiShuffle } from "react-icons/pi";
import { PiUserSwitch } from "react-icons/pi";
import { MdReplay } from "react-icons/md";

import StatsService from '../../../services/stats.service';
import PlayerService from '../../../services/player.service';
import X01Models from '../../../models/x01.models';
import X01Service from '../../../services/x01.service';
import { shufflePlayers as shuffle } from '../../../utils/game.utils';
import GameResultHeader from '../common/game.result.header';
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
import PageLoader from '../../elements/page.loader';
import GameBadges from '../../badges/game.badges';
import { describeRules, hasHandicap, rulesOf } from '../../../utils/x01.rules';

// the key figures of every player in the header; for the best leg less wins
const FIGURES = [
    { key: 'average', label: '3-dart average' },
    { key: 'firstNine', label: 'First 9 average' },
    { key: 'checkoutRate', label: 'Checkout', format: (value) => `${value} %`, detail: (figures) => figures.checkoutDetail },
    { key: 'highestCheckout', label: 'Highest checkout' },
    { key: 'bestLeg', label: 'Best leg', format: (value) => `${value} darts`, lowerIsBetter: true },
    { key: 'highestVisit', label: 'Highest visit' },
    { key: 'oneEighties', label: '180s' },
    { key: 'dartsThrown', label: 'Darts thrown', neutral: true },
];

// a heading above a group of charts
const SectionTitle = ({ children }) => <h2 className="stats-section-title">{children}</h2>;


// the colour of the game type, as on the dashboard and the profile
const GAME_COLOR = '#7ecca5';
/**
 * The statistics of one X01 game: the result with each player's key figures,
 * the moments of the match, every leg with its race to zero, the players side
 * by side for the game or a set, and the charts grouped by scoring, finishing
 * and the board.
 */
const X01GameStats = () => {
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
                const gameData = await X01Service.loadX01GameById(id);
                if (!gameData) return;

                const playerData = (await PlayerService.findPlayersByIds(gameData.players))
                    .filter(p => gameData.players.includes(p.id))
                    .sort((a, b) => gameData.players.indexOf(a.id) - gameData.players.indexOf(b.id));

                const statsData = await StatsService.loadX01GameStats(gameData.id);

                setGame(gameData);
                setPlayers(playerData);
                setGameStats(statsData);
            } catch (err) {
                console.error('Failed to load game data', err);
            }
        };

        loadData();
    }, [id]);

    const legs = useMemo(() => game ? legsOf(game) : [], [game]);
    const figures = useMemo(() => game && players
        ? Object.fromEntries(players.map(player => [player.id, playerFigures(game, player.id, legs)]))
        : {}, [game, players, legs]);
    const moments = useMemo(() => game ? matchMoments(game, legs) : [], [game, legs]);

    const onNewGame = () => navigate("/x01", { replace: true });
    const onFinishGame = () => navigate("/", { replace: true });

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
            numberOfPlayers: game.players.length
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

        const newGame = await X01Service.createX01Game(newMatchSetup);
        navigate(`/x01/${newGame.id}`);
    };

    if (!game || !players) return <PageLoader />;

    const bySets = game.numberOfSets > 1;
    const barsScopes = [
        { label: 'All sets', value: 'game' },
        ...Array.from({ length: game.setsPlayed ?? 0 }, (_, i) => ({ label: `Set ${i + 1}`, value: `set-${i + 1}` })),
    ];

    const actions = (
        <>
            <SplitButton
                label="Play again"
                icon={<MdReplay className="me-2 fs-5" />}
                onClick={() => onRestartGame()}
                size="small"
                severity="primary"
                menuClassName="p-splitbutton-menu-primary"
                model={[
                    { label: 'Switch players', icon: <PiUserSwitch className="me-2 mb-1 fs-5" />, visible: game.players.length === 2, command: () => onRestartGame(true) },
                    { label: 'Shuffle players', icon: <PiShuffle className="me-2 mb-1 fs-5" />, visible: game.players.length > 2, command: () => onRestartGame(false, true) }
                ]}
            />
            <Button label="New game" icon="pi pi-plus" onClick={onNewGame} size="small" outlined severity="primary" />
            <Button label="Home" icon="pi pi-home" onClick={onFinishGame} size="small" outlined />
        </>
    );

    return (
        <div className="container-fluid p-4 border-0">
            <div className="game-stats-page">
                <GameResultHeader
                    game={game}
                    players={players}
                    title={`${hasHandicap(game) ? 'Handicap' : game.startingScore} · ${game.setMode} ${plural(game.numberOfSets, 'set')} · ${game.legMode} ${plural(game.numberOfLegs, 'leg')}`}
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

                <GameBadges
                    gameType="x01"
                    gameId={game.id}
                    players={players}
                    winner={players.find(player => game.playerModels[player.id]?.hasWonGame)}
                    celebrate={justFinished && game.hasWinner}
                    className="mb-4"
                />

                <MatchMoments moments={moments} players={players} color={GAME_COLOR} />

                <X01LegsPanel game={game} players={players} legs={legs} />

                {players.length > 1 &&
                    <Panel header="Side by side" className="mb-4">
                        {barsScopes.length > 2 &&
                            <div className="d-flex justify-content-start mb-3">
                                <SelectButton value={barsScope} options={barsScopes} onChange={(e) => e.value && setBarsScope(e.value)} className="p-selectbutton-pills pills-inline" aria-label="Whole game or set" />
                            </div>
                        }
                        <X01StatsComparisonBars game={game} valueKey={barsScope} players={players} />
                    </Panel>
                }

                <SectionTitle>Scoring</SectionTitle>
                <div className="row g-4 mb-4">
                    <div className="col-12 col-xl-6">
                        <AverageTrendChart
                            title="Average per leg"
                            description="Every player's average in each leg of this game."
                            data={gameStats?.avg ?? []}
                            players={players}
                        />
                    </div>
                    <div className="col-12 col-xl-6"><ScoreRangesChart data={gameStats?.scoreRanges ?? []} players={players} /></div>
                </div>

                <SectionTitle>Finishing</SectionTitle>
                <div className="row g-4 mb-4">
                    <div className="col-12 col-xl-6"><ScoringFinishingChart scoring={gameScoring(game, players)} players={players} /></div>
                    <div className="col-12 col-xl-6">
                        <DartsPerLegChart data={gameDartsPerLeg(game, players)} players={players} description="Darts each player needed for the legs they won in this game." />
                    </div>
                    <div className="col-12"><DoublesChart ratesByPlayer={players.map((_, i) => gameStats?.checkouts?.[`player${i + 1}`] ?? [])} players={players} /></div>
                </div>

                <SectionTitle>On the board</SectionTitle>
                <div className="row g-4">
                    <div className="col-12"><HitsHeatmapChart hitsByPlayer={players.map((_, i) => sectionHitsOf(gameStats?.sectionHits ?? [], i))} players={players} gameName="this game" /></div>
                </div>
            </div>
        </div>
    );
};

export default X01GameStats;
