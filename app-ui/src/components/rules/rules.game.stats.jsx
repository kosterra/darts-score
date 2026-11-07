import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Panel } from 'primereact/panel';

import RulesService from '../../services/rules.service';
import PlayerService from '../../services/player.service';
import { GameStatsSkeleton } from '../elements/skeletons';
import GameBadges from '../badges/game.badges';
import GameResultHeader from '../stats/common/game.result.header';
import GameResultActions from '../stats/common/game.result.actions';
import { whenPlayed } from '../stats/common/game.text';
import RoundsLineChart from '../stats/charts/rounds.line.chart';
import UpLink from '../elements/up.link';
import RulesList from './rules.list';
import { PLAYER_COLORS } from '../stats/charts/chart.theme';
import { gameOf } from '../../rules/games';
import { progressOf, replayGame, withGameState } from '../../rules/engine';
import { t } from '../../utils/i18n';
import { judgeLevel } from '../../rules/levels.play';

const shuffled = (list) => {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[other]] = [copy[other], copy[index]];
    }
    return copy;
};

/**
 * The result of a game of the rules engine: the places, every player's
 * figures, how the game went visit by visit and the visits themselves.
 */
const RulesGameStats = () => {
    const { kind, id } = useParams();
    const definition = gameOf(kind);
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
                const loaded = await RulesService.loadGame(id);
                const found = await PlayerService.findPlayersByIds(loaded.players);
                setPlayers(loaded.players.map(playerId => found.find(player => player.id === playerId) ?? { id: playerId, nickname: t('Unknown player') }));
                setGame(loaded);
            } catch {
                setFailed(true);
            }
        };
        load();
    }, [id]);

    const replay = useMemo(() => game && definition ? replayGame(definition, game) : null, [game, definition]);
    const progress = useMemo(() => game && definition?.progress ? progressOf(definition, game) : [], [game, definition]);

    if (!definition) return <Navigate replace to="/games" />;
    if (failed) return <div className="container-fluid p-4 text-subtle">{t('This game could not be found in the selected club.')}</div>;
    if (!game || !players || !replay) return <GameStatsSkeleton players={game?.players?.length ?? 2} />;

    // the figures of the definition, by their place in its list
    const figureRows = (definition.figures(replay.state.players[game.players[0]], replay.state) ?? [])
        .map(([label], index) => ({ key: String(index), label, neutral: true }));
    const figures = Object.fromEntries(game.players.map(playerId => [playerId,
        Object.fromEntries(definition.figures(replay.state.players[playerId], replay.state).map(([, value], index) => [String(index), value]))]));
    const placeOf = Object.fromEntries(replay.standings.map(row => [row.id, row.place]));
    const main = definition.columns[0];

    const onRestartGame = async (switchPlayers = false, shuffle = false) => {
        let order = [...game.players];
        if (switchPlayers) order.reverse();
        else if (shuffle) order = shuffled(order);
        const base = Object.fromEntries((definition.options ?? []).map(option => [option.key, game.settings?.[option.key] ?? option.default]));
        const settings = definition.prepare ? definition.prepare(base, order) : base;
        const created = await RulesService.createGame(withGameState(definition, { kind, players: order, settings, visits: [], flyingDarts: game.flyingDarts }));
        navigate(`/play/${kind}/${created.id}`);
    };

    const actions = <GameResultActions goOnTo={game.hasWinner ? null : `/play/${kind}/${game.id}`} compare={players.length > 1 ? { players, type: game.kind } : null} playerCount={game.players.length} onRestart={onRestartGame} onNewGame={() => navigate(`/play/${kind}`, { replace: true })} />;
    const winners = players.filter(player => game.playerModels?.[player.id]?.hasWonGame);
    const options = (definition.options ?? []).map(option => option.values.find(value => value.value === replay.settings[option.key])?.label).filter(Boolean);

    // the visits round by round, every player's darts side by side, with what they had after it
    // (the value of the chart after their nth visit)
    const rounds = [];
    const visitsOf = {};
    replay.visits.forEach(visit => {
        visitsOf[visit.player] = (visitsOf[visit.player] ?? 0) + 1;
        rounds[visit.round - 1] = rounds[visit.round - 1] ?? {};
        rounds[visit.round - 1][visit.player] = { darts: visit.darts, after: definition.progress ? progress[visitsOf[visit.player]]?.[visit.player] : null };
    });

    return (
        <div className="container-fluid p-4 border-0">
            <div className="game-stats-page">
                <UpLink to="/games" label={t('Games')} />
                <GameResultHeader
                    celebrate={justFinished && game.hasWinner}
                    game={game}
                    players={players}
                    title={[definition.title, ...options].join(' · ')}
                    subtitle={`${game.hasWinner ? '' : `${t('Not finished')} · `}${whenPlayed(game)}`}
                    scoreOf={(player) => main.value(replay.state.players[player.id], replay.state, { settings: replay.settings, round: replay.round })}
                    scoreDetailOf={(player) => `${main.label} · ${t('place {{place}}', { place: placeOf[player.id] })}`}
                    rows={figureRows}
                    levelOf={(player) => judgeLevel(definition.level, replay.state.players[player.id], replay.state, replay.settings)}
                    figures={figures}
                    actions={actions}
                />

                <GameBadges
                    gameType={kind}
                    gameId={game.id}
                    players={players}
                    winner={winners[0]}
                    celebrate={justFinished && game.hasWinner}
                    className="mb-4"
                />

                <div className="row g-4">
                    {definition.progress && progress.length > 1 &&
                        <div className="col-12 col-xl-7">
                            <RoundsLineChart
                                title={definition.progress.label}
                                description={t('Every player\'s {{what}} after each of their visits.', { what: definition.progress.label })}
                                data={progress}
                                players={players}
                                step={t('Visit')}
                            />
                        </div>
                    }
                    <div className="col-12 col-xl-5">
                        {/* as the visits of Cricket: the darts as small tags, the newest round on top */}
                        <Panel header={t('Visits')} className="h-100">
                            <div className="x01-legs-wrap x01-visits">
                                <table className="x01-legs">
                                    <thead>
                                        <tr>
                                            <th scope="col" className="text-center">{t('Round')}</th>
                                            {players.map((player, index) => (
                                                <th key={player.id} scope="col">
                                                    <span className="d-inline-flex align-items-center text-nowrap">
                                                        <span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />{player.nickname}
                                                    </span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="is-static">
                                        {rounds.map((round, index) => ({ round, index })).reverse().map(({ round, index }) => (
                                            <tr key={index}>
                                                <td className="fw-semibold text-center">{index + 1}</td>
                                                {/* the points right after the darts; the room left over goes before the next player */}
                                                {players.map(player => {
                                                    const visit = round?.[player.id];
                                                    return (
                                                        <td key={player.id} className="text-nowrap">
                                                            {visit &&
                                                                <span className="rules-result-visit">
                                                                    <span className="x01-visit-darts">{visit.darts.map((dart, d) => <span key={d}>{dart === '0' ? t('Miss') : dart}</span>)}</span>
                                                                    {visit.after != null && <span className="x01-visit-left">{visit.after}</span>}
                                                                </span>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                    </div>
                    <div className="col-12">
                        <Panel header={t('Rules')}>
                            <RulesList rules={definition.rules} />
                        </Panel>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RulesGameStats;
