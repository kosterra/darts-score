import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import PlayerService from '../../../services/player.service';
import ClubCricketService from '../../../services/cricket.service';
import { QuickCricketService, quickPlayersOf } from '../../../services/quick.game.service';
import QuickGameInvite from '../../quick/quick.game.invite';
import { GameStatsSkeleton } from '../../elements/skeletons';
import GameBadges from '../../badges/game.badges';
import GameResultHeader from '../common/game.result.header';
import GameResultActions from '../common/game.result.actions';
import MatchMoments from '../common/match.moments';
import { whenPlayed } from '../common/game.text';
import HitsHeatmapChart from '../charts/hits.heatmap.chart';
import CricketBoardPanel from './cricket.board.panel';
import RoundsLineChart from '../charts/rounds.line.chart';
import { CRICKET_NUMBERS, replayCricket, cricketFigures, cricketProgress, cricketMoments, hitsBySection } from '../../../utils/cricket.game.summary';
import { cricketRematch } from '../../../utils/cricket.rematch';
import UpLink from '../../elements/up.link';
import { variantOf } from '../../../utils/cricket.variants';
import { t } from '../../../utils/i18n';
import CompareLink from '../compare/compare.link';
import { GAME_COLORS } from '../../../utils/palette';

// the key figures of every player in the header
const FIGURES = [
    { key: 'marksPerRound', label: t('Marks per round'), format: (value) => value.toFixed(2) },
    { key: 'points', label: t('Points') },
    { key: 'bestRound', label: t('Best round'), format: (value) => t('{{value}} marks', { value: value }) },
    { key: 'bestPoints', label: t('Most points in a round') },
    { key: 'triples', label: t('Triples') },
    { key: 'bulls', label: t('Bull marks') },
    { key: 'closedFirst', label: t('Numbers closed first'), format: (value) => t('{{value}} of 7', { value: value }) },
    { key: 'dartsThrown', label: t('Darts thrown'), neutral: true },
];


// the colour of the game type, as on the dashboard and the profile
const GAME_COLOR = GAME_COLORS.cricket;
/**
 * The statistics of one Cricket game: the result with each player's key
 * figures, the moments of the game, the board at the end with the race to
 * close all numbers, the points over the game and where the darts landed.
 */
// quick: a quick game of the start page, the players only names and no badges
const CricketGameStats = ({ quick = false }) => {
    const CricketService = quick ? QuickCricketService : ClubCricketService;
    const { id } = useParams();
    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState(null);
    const [failed, setFailed] = useState(false);
    // straight from a game that was just won: celebrate once
    const [justFinished] = useState(Boolean(useLocation().state?.justFinished));

    useEffect(() => {
        // forget the marker, so reloading the page does not celebrate again
        if (justFinished) window.history.replaceState({ ...window.history.state, usr: null }, '');
    }, [justFinished]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const gameData = await CricketService.loadCricketGameById(id);
                if (!gameData) return setFailed(true);
                const playerData = quick ? quickPlayersOf(gameData) : (await PlayerService.findPlayersByIds(gameData.players))
                    .filter(player => gameData.players.includes(player.id))
                    .sort((a, b) => gameData.players.indexOf(a.id) - gameData.players.indexOf(b.id));
                setGame(gameData);
                setPlayers(playerData);
            } catch (err) {
                console.error('Failed to load game data', err);
                setFailed(true);
            }
        };
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const replay = useMemo(() => game ? replayCricket(game) : null, [game]);
    const figures = useMemo(() => game && players && replay
        ? Object.fromEntries(players.map(player => [player.id, cricketFigures(game, player.id, replay)]))
        : {}, [game, players, replay]);
    const progress = useMemo(() => game && replay ? cricketProgress(game, replay) : { closing: [], points: [] }, [game, replay]);
    const moments = useMemo(() => game && replay ? cricketMoments(game, replay) : [], [game, replay]);

    if (failed) return <div className="container-fluid p-4 text-subtle">{quick ? t('This quick game was not found on this device.') : t('This game could not be found in the selected club.')}</div>;
    if (!game || !players) return <GameStatsSkeleton players={game?.players?.length ?? 2} />;

    const onRestartGame = async (switchPlayers = false, shuffle = false) => {
        const rematch = cricketRematch(game, { switchPlayers, shuffle });
        const newGame = await CricketService.createCricketGame(quick ? { ...rematch, quickPlayers: game.quickPlayers, flyingDarts: 'off' } : rematch);
        navigate(quick ? `/quick/cricket/${newGame.id}` : `/cricket/${newGame.id}`);
    };

    const actions = <GameResultActions playerCount={game.players.length} onRestart={onRestartGame} onNewGame={() => navigate(quick ? '/quick' : '/cricket', { replace: true })} />;

    return (
        <div className="container-fluid p-4 border-0">
            <div className="game-stats-page">
                {!quick && <UpLink to="/games" label={t('Games')} />}
                <GameResultHeader
                    celebrate={justFinished && game.hasWinner}
                    game={game}
                    players={players}
                    // the way to the comparison of these players, in this game
                    footer={!quick && players.length > 1 ? <div className="text-center mt-3"><CompareLink players={players} type={'cricket'} /></div> : null}
                    title={variantOf(game) === 'Standard' ? t('Cricket · 15 to 20 and the bull') : t('Cricket {{variantOf}} · 15 to 20 and the bull', { variantOf: variantOf(game) })}
                    subtitle={whenPlayed(game)}
                    scoreOf={(player) => figures[player.id]?.points ?? 0}
                    // the points are the score; under them how much of the board the player closed
                    scoreDetailOf={(player) => t('{{length}} of 7 numbers closed', { length: CRICKET_NUMBERS.filter(n => replay.board[n].marks[player.id] >= 3).length })}
                    rows={FIGURES}
                    figures={figures}
                    actions={actions}
                />

                {quick && <QuickGameInvite />}
                {!quick && <GameBadges
                    gameType="cricket"
                    gameId={game.id}
                    players={players}
                    winner={players.find(player => game.playerModels[player.id]?.hasWonGame)}
                    celebrate={justFinished && game.hasWinner}
                    className="mb-4"
                />}

                <MatchMoments moments={moments} players={players} color={GAME_COLOR} />

                <CricketBoardPanel board={replay.board} players={players} closing={progress.closing} />

                <div className="row g-4">
                    {/* the points over the game follow the standard rules */}
                    {variantOf(game) === 'Standard' && <div className="col-12 col-xl-6">
                        <RoundsLineChart
                            title={t('Points over the game')}
                            description={t('Each player\'s points after every round: they come from marks on numbers the others have not closed yet.')}
                            data={progress.points}
                            players={players}
                            unit="points"
                        />
                    </div>}
                    <div className={variantOf(game) === 'Standard' ? 'col-12 col-xl-6' : 'col-12'}>
                        <HitsHeatmapChart hitsByPlayer={players.map(player => hitsBySection(game.playerModels[player.id]?.hit))} players={players} gameName={t('this game')} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CricketGameStats;
