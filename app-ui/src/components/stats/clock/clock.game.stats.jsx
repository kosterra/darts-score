import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Panel } from 'primereact/panel';

import ClockService from '../../../services/clock.service';
import PlayerService from '../../../services/player.service';
import { GameStatsSkeleton } from '../../elements/skeletons';
import GameBadges from '../../badges/game.badges';
import GameResultHeader from '../common/game.result.header';
import GameResultActions from '../common/game.result.actions';
import { whenPlayed } from '../common/game.text';
import RoundsLineChart from '../charts/rounds.line.chart';
import { PLAYER_COLORS } from '../charts/chart.theme';
import { TargetBars } from '../../training/atc.darts.result';
import { TARGETS, hardestTargets, targetLabel } from '../../../utils/atc.darts';
import UpLink from '../../elements/up.link';
import { clockProgress, clockRematch, clockResults, replayClock, skipsAhead } from '../../../utils/clock.game';
import CompareLink from '../compare/compare.link';
import { t } from '../../../utils/i18n';

// the key figures of every player in the header
const FIGURES = [
    { key: 'hitRate', label: t('Hit rate'), format: (value) => `${value} %` },
    { key: 'numbers', label: t('Numbers hit'), format: (value) => t('{{value}} of {{TARGETS}}', { value: value, TARGETS: TARGETS }) },
    { key: 'turns', label: t('Turns'), neutral: true },
    { key: 'darts', label: t('Darts thrown'), neutral: true },
];

/**
 * The result of one Around the Clock game: who finished first, everybody's hit
 * rate, how far each player got round by round, and where it took longest.
 */
const ClockGameStats = () => {
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
        const load = async () => {
            try {
                const loaded = await ClockService.loadClockGameById(id);
                const found = await PlayerService.findPlayersByIds(loaded.players);
                setPlayers(loaded.players.map(playerId => found.find(player => player.id === playerId) ?? { id: playerId, nickname: t('Unknown player') }));
                setGame(loaded);
            } catch {
                setFailed(true);
            }
        };
        load();
    }, [id]);

    const state = useMemo(() => game ? replayClock(game) : null, [game]);
    const results = useMemo(() => state ? clockResults(state) : [], [state]);
    const progress = useMemo(() => game ? clockProgress(game) : [], [game]);

    if (failed) return <div className="container-fluid p-4 text-subtle">{t('This game could not be found in the selected club.')}</div>;
    if (!game || !players) return <GameStatsSkeleton players={game?.players?.length ?? 2} />;

    const resultOf = (playerId) => results.find(result => result.playerId === playerId);
    const figures = Object.fromEntries(game.players.map(playerId => {
        const result = resultOf(playerId);
        return [playerId, {
            hitRate: result.hitRate,
            numbers: Math.min(result.target, TARGETS),
            turns: state.players[playerId].visits,
            darts: result.darts,
        }];
    }));

    const onRestartGame = async (switchPlayers = false, shuffle = false) => {
        const created = await ClockService.createClockGame(clockRematch(game, { switchPlayers, shuffle }));
        navigate(`/clock/${created.id}`);
    };

    const actions = <GameResultActions playerCount={game.players.length} onRestart={onRestartGame} onNewGame={() => navigate('/clock', { replace: true })} />;

    const winners = players.filter(player => game.playerModels?.[player.id]?.hasWonGame);

    return (
        <div className="container-fluid p-4 border-0">
            <div className="game-stats-page">
                <UpLink to="/games" label={t('Games')} />
                <GameResultHeader
                    celebrate={justFinished && game.hasWinner}
                    game={game}
                    players={players}
                    // the way to the comparison of these players, in this game
                    footer={players.length > 1 ? <div className="text-center mt-3"><CompareLink players={players} type={'clock'} /></div> : null}
                    title={t('Around the Clock · {{mode}}', { mode: t(game.mode) })}
                    subtitle={`${skipsAhead(game) ? t('Doubles and trebles move on · ') : ''}${whenPlayed(game)}`}
                    scoreOf={(player) => resultOf(player.id).finished ? resultOf(player.id).darts : targetLabel(resultOf(player.id).target, game.mode)}
                    scoreDetailOf={(player) => resultOf(player.id).finished ? t('darts to finish') : t('next to hit')}
                    rows={FIGURES}
                    figures={figures}
                    actions={actions}
                />

                <GameBadges
                    gameType="clock"
                    gameId={game.id}
                    players={players}
                    winner={winners[0]}
                    celebrate={justFinished && game.hasWinner}
                    className="mb-4"
                />

                <div className="row g-4">
                    <div className="col-12 col-xl-7">
                        <RoundsLineChart
                            title={t('Around the board')}
                            description={t('The numbers each player had hit after every round; 21 is done, with the bull.')}
                            data={progress}
                            players={players}
                            target={TARGETS}
                            max={TARGETS}
                            unit="numbers"
                        />
                    </div>
                    <div className="col-12 col-xl-5">
                        <Panel header={t('Darts per number')} className="h-100">
                            <ol className="atc-result-list">
                                {results.map(result => {
                                    const index = game.players.indexOf(result.playerId);
                                    const hardest = hardestTargets(result.perTarget);
                                    return (
                                        <li key={result.playerId} className="atc-result-player">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />
                                                <span className="atc-row-name flex-grow-1">{players[index].nickname}</span>
                                                <span className="text-faint fs-8">{hardest.length ? t('hardest {{join}}', { join: hardest.map(target => `${targetLabel(target.index, game.mode)} (${target.darts})`).join(', ') }) : t('every number at the first try')}</span>
                                            </div>
                                            <TargetBars perTarget={result.perTarget} hardest={hardest} />
                                        </li>
                                    );
                                })}
                            </ol>
                            <span className="d-block text-faint fs-8 mt-2">{t('One bar per number from 1 to 20 and the bull: the darts it took.')}{' '}{skipsAhead(game) ? t('Numbers skipped with a double or treble have no bar.') : ''}</span>
                        </Panel>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClockGameStats;
