import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Panel } from 'primereact/panel';

import PlayerService from '../../../services/player.service';
import EliminationService from '../../../services/elimination.service';
import { GameStatsSkeleton } from '../../elements/skeletons';
import GameBadges from '../../badges/game.badges';
import GameResultHeader from '../common/game.result.header';
import GameResultActions from '../common/game.result.actions';
import MatchMoments from '../common/match.moments';
import { whenPlayed } from '../common/game.text';
import RoundsLineChart from '../charts/rounds.line.chart';
import HitsHeatmapChart from '../charts/hits.heatmap.chart';
import { ScoreRangesChart } from '../charts/simple.bar.charts';
import { PLAYER_COLORS } from '../charts/chart.theme';
import {
    replayElimination, eliminationFigures, eliminationRace, eliminationScoreRanges, eliminationHits, eliminationMoments,
} from '../../../utils/elimination.game.summary';
import UpLink from '../../elements/up.link';
import { eliminationRematch } from '../../../utils/elimination.rematch';
import { t } from '../../../utils/i18n';

// the key figures of every player in the header; for knock-outs suffered less is better
const FIGURES = [
    { key: 'average', label: t('Average per visit') },
    { key: 'highestVisit', label: t('Highest visit') },
    { key: 'tonPlus', label: t('100+ visits') },
    { key: 'eliminationsMade', label: t('Knock-outs made') },
    { key: 'timesEliminated', label: t('Knocked out'), lowerIsBetter: true },
    { key: 'pointsLost', label: t('Points lost to knock-outs'), lowerIsBetter: true },
    { key: 'dartsThrown', label: t('Darts thrown'), neutral: true },
];


// the colour of the game type, as on the dashboard and the profile
const GAME_COLOR = '#c3a9e6';
/**
 * The statistics of one Elimination game: the result with each player's key
 * figures, the moments of the game, the race to the target with every
 * knock-out, how the visits scored and where the darts landed.
 */
const EliminationGameStats = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState(null);
    const [failed, setFailed] = useState(false);
    // set by the game page when this game was won a moment ago
    const [justFinished] = useState(Boolean(useLocation().state?.justFinished));

    useEffect(() => {
        // forget the marker, so reloading the page does not celebrate again
        if (justFinished) window.history.replaceState({ ...window.history.state, usr: null }, '');
    }, [justFinished]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const gameData = await EliminationService.loadEliminationGameById(id);
                if (!gameData) return setFailed(true);
                const playerData = (await PlayerService.findPlayersByIds(gameData.players))
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
    }, [id]);

    const replay = useMemo(() => game ? replayElimination(game) : null, [game]);
    const figures = useMemo(() => game && players && replay
        ? Object.fromEntries(players.map(player => [player.id, eliminationFigures(game, player.id, replay)]))
        : {}, [game, players, replay]);
    const race = useMemo(() => game && replay ? eliminationRace(game, replay) : [], [game, replay]);

    if (failed) return <div className="container-fluid p-4 text-subtle">{t('This game could not be found in the selected club.')}</div>;
    if (!game || !players) return <GameStatsSkeleton players={game?.players?.length ?? 2} />;

    const indexOf = new Map(players.map((player, index) => [player.id, index]));
    const nameOf = (playerId) => players[indexOf.get(playerId)]?.nickname ?? '–';
    // the biggest knock-out names who was hit
    const moments = eliminationMoments(game, replay).map(moment => moment.victim
        ? { ...moment, detail: t('knocked out {{nameOf}} · {{detail}}', { nameOf: nameOf(moment.victim), detail: moment.detail }) }
        : moment);
    const target = Number(game.targetScore);

    const onRestartGame = async (switchPlayers = false, shuffle = false) => {
        const newGame = await EliminationService.createEliminationGame(eliminationRematch(game, { switchPlayers, shuffle }));
        navigate(`/elimination/${newGame.id}`);
    };

    const actions = <GameResultActions playerCount={game.players.length} onRestart={onRestartGame} onNewGame={() => navigate('/elimination', { replace: true })} />;

    const Who = ({ playerId }) => (
        <span className="d-inline-flex align-items-center text-nowrap">
            <span className="result-hero-dot" style={{ background: PLAYER_COLORS[indexOf.get(playerId)] }} aria-hidden="true" />
            {nameOf(playerId)}
        </span>
    );

    return (
        <div className="container-fluid p-4 border-0">
            <div className="game-stats-page">
                <UpLink to="/games" label={t('Games')} />
                <GameResultHeader
                    game={game}
                    players={players}
                    title={t('Elimination · first to {{target}}', { target: target })}
                    subtitle={`${game.gameInMode ?? 'Straight In'} / ${game.gameOutMode ?? 'Straight Out'} · ${whenPlayed(game)}`}
                    scoreOf={(player) => figures[player.id]?.score ?? 0}
                    scoreDetailOf={(player) => (figures[player.id]?.score ?? 0) >= target ? t('reached {{target}}', { target: target }) : t('{{value}} to go', { value: target - (figures[player.id]?.score ?? 0) })}
                    rows={FIGURES}
                    figures={figures}
                    actions={actions}
                />

                <GameBadges
                    gameType="elimination"
                    gameId={game.id}
                    players={players}
                    winner={players.find(player => game.playerModels[player.id]?.hasWonGame)}
                    celebrate={justFinished && game.hasWinner}
                    className="mb-4"
                />

                <MatchMoments moments={moments} players={players} color={GAME_COLOR} />

                <div className="row g-4 mb-4">
                    <div className="col-12 col-xl-7">
                        <RoundsLineChart
                            title={t('Race to the target')}
                            description={t('Every player\'s score after each visit of the game. A drop to 0 is a knock-out: an opponent landed exactly on that score.')}
                            data={race}
                            players={players}
                            target={target}
                            unit="points"
                            step="Visit"
                        />
                    </div>
                    <div className="col-12 col-xl-5">
                        <Panel header={t('Knock-outs')} className="h-100">
                            {replay.eliminations.length
                                ? (
                                    <div className="x01-legs-wrap">
                                        <table className="x01-legs">
                                            <thead>
                                                <tr>
                                                    <th scope="col">{t('Round')}</th>
                                                    <th scope="col">{t('By')}</th>
                                                    <th scope="col">{t('Knocked out')}</th>
                                                    <th scope="col" className="text-end">{t('Lost')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="is-static">
                                                {replay.eliminations.map(event => (
                                                    <tr key={`${event.visit}-${event.victim}`}>
                                                        <td className="fw-semibold">{event.turn}</td>
                                                        <td><Who playerId={event.by} /></td>
                                                        <td><Who playerId={event.victim} /></td>
                                                        <td className="text-end">{event.at}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                                : <p className="text-subtle m-0">{t('Nobody was knocked out in this game.')}</p>
                            }
                            <span className="d-block text-faint fs-8 mt-2">{t('Landing exactly on an opponent\'s score sends them back to 0; "Lost" is the score they had.')}</span>
                        </Panel>
                    </div>
                </div>

                <div className="row g-4">
                    <div className="col-12 col-xl-6">
                        <ScoreRangesChart data={eliminationScoreRanges(game.players, replay)} players={players} />
                    </div>
                    <div className="col-12 col-xl-6">
                        <HitsHeatmapChart hitsByPlayer={players.map(player => eliminationHits(player.id, replay))} players={players} gameName={t('this game')} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EliminationGameStats;
