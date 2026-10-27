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
import { gameOf } from '../../rules/games';
import { progressOf, replayGame, withGameState } from '../../rules/engine';
import { t } from '../../utils/i18n';

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

    const actions = <GameResultActions compare={players.length > 1 ? { players, type: game.kind } : null} playerCount={game.players.length} onRestart={onRestartGame} onNewGame={() => navigate(`/play/${kind}`, { replace: true })} />;
    const winners = players.filter(player => game.playerModels?.[player.id]?.hasWonGame);
    const options = (definition.options ?? []).map(option => option.values.find(value => value.value === replay.settings[option.key])?.label).filter(Boolean);

    // the visits round by round, every player's darts side by side
    const rounds = [];
    replay.visits.forEach(visit => {
        rounds[visit.round - 1] = rounds[visit.round - 1] ?? {};
        rounds[visit.round - 1][visit.player] = visit.darts;
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
                        <Panel header={t('Visits')} className="h-100">
                            <div className="overflow-auto">
                                <table className="rules-scoreboard">
                                    <thead>
                                        <tr>
                                            <th>{t('Round')}</th>
                                            {players.map(player => <th key={player.id} title={player.nickname}>{player.nickname.slice(0, 10)}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rounds.map((round, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                {players.map(player => <td key={player.id}>{round?.[player.id]?.join(' ') ?? '–'}</td>)}
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
