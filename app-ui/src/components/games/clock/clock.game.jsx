import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';

import ATCDartsRound from '../../training/atc.darts.round';
import ATCTargetBoard from '../../training/atc.target.board';
import PageLoader from '../../elements/page.loader';
import ClockService from '../../../services/clock.service';
import PlayerService from '../../../services/player.service';
import { replayClock, skipsAhead, withClockState } from '../../../utils/clock.game';
import useClockMoment from '../../../utils/use.clock.moment';
import ClockMoment from '../common/clock.moments';
import GameScreenButton from '../../screen/game.screen.button';
import LiveHero from '../common/live.hero';
import SaveStatus from '../common/save.status';
import { loadWithUnsent, useGameSaves } from '../../../utils/unsent.games';
import { TARGETS, targetLabel } from '../../../utils/atc.darts';
import { t } from '../../../utils/i18n';

/**
 * An Around the Clock game being played: whose turn it is and their target,
 * and a button for every dart. Every dart is saved; once the last round is
 * complete the result opens.
 */
const ClockGame = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState([]);
    const [failed, setFailed] = useState(false);
    const toast = useRef(null);
    // bumped when the server refused a save for good: its state is loaded again
    const [reload, setReload] = useState(0);
    const notSaved = useCallback((detail) => toast.current?.show({ severity: 'error', summary: t('Not saved'), detail, life: 4000 }), []);

    useEffect(() => {
        const load = async () => {
            try {
                // the game kept on this device (not sent yet) wins over the server's
                const playersOf = async (loaded) => {
                    const found = await PlayerService.findPlayersByIds(loaded.players);
                    return loaded.players.map(playerId => found.find(player => player.id === playerId) ?? { id: playerId, nickname: t('Unknown player') });
                };
                const { game: loaded, players: found, kept, dropped } = await loadWithUnsent(`clock:${id}`, () => ClockService.loadClockGameById(id), playersOf);
                if (dropped) notSaved(t('This device kept an older state of the game than the server has: the server\'s is shown.'));
                // a finished game shows its result
                if (loaded.hasWinner && !kept) return navigate(`/stats/games/clock/${id}`, { replace: true });
                setPlayers(found);
                setGame(loaded);
            } catch {
                setFailed(true);
            }
        };
        load();
    }, [id, navigate, reload, notSaved]);

    const state = useMemo(() => game ? replayClock(game) : null, [game]);
    const [moment, endMoment] = useClockMoment(state, {
        nameOf: (playerId) => players.find(player => player.id === playerId)?.nickname ?? '',
        indexOf: (playerId) => game?.players.indexOf(playerId) ?? 0,
        rings: game ? skipsAhead(game) : false,
    });
    // the game is over and saved: the result opens once a moment of the last dart has played
    const [savedOver, setSavedOver] = useState(null);
    useEffect(() => {
        if (savedOver && !moment) navigate(`/stats/games/clock/${savedOver}`, { replace: true, state: { justFinished: true } });
    }, [savedOver, moment, navigate]);

    // without a connection the game is kept on this device and sent once it is back
    const { save: keepAndSend, unsent } = useGameSaves(`clock:${id}`, (next, options) => ClockService.updateClockGame(next, options), (next) => {
        setSavedOver(next.hasWinner ? next.id : null);
    }, (error) => {
        // a game gone says so when it is loaded again
        if (error.status !== 404) notSaved(error.message);
        setReload(count => count + 1);
    });
    const save = useCallback((next) => keepAndSend(next, { players, kind: 'Around the Clock' }), [keepAndSend, players]);

    const change = useCallback((throws) => {
        const next = withClockState({ ...game, throws });
        setGame(next);
        save(next);
    }, [game, save]);

    const onDart = useCallback((value) => {
        if (!game || state?.done) return;
        change([...(game.throws ?? []), Number(value)]);
    }, [game, state, change]);

    // the winning dart is not taken back: the game is decided (and maybe counted by its tournament)
    const onUndo = useCallback(() => {
        if (game?.throws?.length && !state?.done) change(game.throws.slice(0, -1));
    }, [game, state, change]);

    if (failed) return <div className="container-fluid p-4 text-subtle">{t('This game could not be found in the selected club.')}</div>;
    if (!game || !state) return <PageLoader />;

    const nameOf = (playerId) => players.find(player => player.id === playerId)?.nickname ?? t('Unknown player');
    const notice = state.lastRound !== null && !state.done
        ? state.finished.length > 1
            ? t('{{names}} are done: last round, everybody gets {{lastRound}} turns.', { names: state.finished.map(nameOf).join(` ${t('and')} `), lastRound: state.lastRound })
            : t('{{name}} is done: last round, everybody gets {{lastRound}} turns.', { name: nameOf(state.finished[0]), lastRound: state.lastRound })
        : null;

    return (
        <div className="col-12 clock-game">
            <SaveStatus unsent={unsent} finished={Boolean(game?.hasWinner)} />
            <LiveHero
                rulesId="clock"
                actions={<GameScreenButton kind="clock" game={{ ...game, hasWinner: state.done }} />}
                title={t('Around the Clock ·') + ' ' + t(game.mode)}
                subtitle={`${skipsAhead(game) ? t('Doubles and trebles move on · ') : ''}${t('first to finish wins')}`}
                rows={players.map(player => {
                    const own = state.players[player.id];
                    const numbers = Math.min(own.target, TARGETS);
                    return {
                        player,
                        isTurn: !state.done && state.order[state.current] === player.id,
                        line: <>{t('Hit rate')}{' '}<strong>{own.darts ? `${Math.round(own.hits / own.darts * 100)} %` : '–'}</strong> · <strong>{own.darts}</strong>{' '}{t('darts')}</>,
                        tags: own.finished && <span className="x01-dart-for">{t('Done')}</span>,
                        score: own.finished ? '✔' : targetLabel(own.target, game.mode),
                        below: <span className="x01-live-route">{t('{{value}} of {{TARGETS}}', { value: numbers, TARGETS })}</span>,
                    };
                })}
            />
            {/* as the other games: on a wide screen the board on the left (big, the target lit), the
                turn and the buttons on the right; on a phone the round alone with its small board */}
            <div className="row g-4 clock-game-board">
                <div className="col-lg-6 d-none d-lg-flex justify-content-center align-items-start">
                    <ATCTargetBoard target={state.players[state.order[state.current]]?.target ?? 0} mode={game.mode} className="is-big" />
                </div>
                <div className="col-12 col-lg-6">
                    <ATCDartsRound
                        players={players}
                        mode={game.mode}
                        round={state}
                        onDart={onDart}
                        onUndo={onUndo}
                        canUndo={game.throws?.length > 0 && !state.done}
                        rings={skipsAhead(game)}
                        withPlayers={false}
                        notice={notice}
                    />
                </div>
            </div>
            <ClockMoment moment={moment} onDone={endMoment} mode={game.mode} />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ClockGame;
