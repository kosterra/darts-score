import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';

import ATCDartsRound from '../../training/atc.darts.round';
import PageLoader from '../../elements/page.loader';
import ClockService from '../../../services/clock.service';
import PlayerService from '../../../services/player.service';
import { replayClock, skipsAhead, withClockState } from '../../../utils/clock.game';
import useClockMoment from '../../../utils/use.clock.moment';
import ClockMoment from '../common/clock.moments';
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
    // the saves run one after the other, in the order of the darts
    const saving = useRef(Promise.resolve());
    const toast = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const loaded = await ClockService.loadClockGameById(id);
                // a finished game shows its result
                if (loaded.hasWinner) return navigate(`/stats/games/clock/${id}`, { replace: true });
                const found = await PlayerService.findPlayersByIds(loaded.players);
                setPlayers(loaded.players.map(playerId => found.find(player => player.id === playerId) ?? { id: playerId, nickname: t('Unknown player') }));
                setGame(loaded);
            } catch {
                setFailed(true);
            }
        };
        load();
    }, [id, navigate]);

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

    const save = useCallback((next) => {
        saving.current = saving.current
            .then(() => ClockService.updateClockGame(next))
            .then(() => {
                if (next.hasWinner) setSavedOver(next.id);
            })
            .catch(() => toast.current?.show({ severity: 'error', summary: t('Not saved'), detail: t('The last dart could not be saved. Check the connection and throw on: the next dart saves everything.'), life: 5000 }));
    }, []);

    const change = useCallback((throws) => {
        const next = withClockState({ ...game, throws });
        setGame(next);
        save(next);
    }, [game, save]);

    const onDart = useCallback((value) => {
        if (!game || state?.done) return;
        change([...(game.throws ?? []), Number(value)]);
    }, [game, state, change]);

    const onUndo = useCallback(() => {
        if (game?.throws?.length) change(game.throws.slice(0, -1));
    }, [game, change]);

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
            <div className="d-flex justify-content-center mb-4">
                <div className="d-flex flex-column align-items-center rounded-bottom-4 bg-surface-translucent p-2 px-4">
                    <div className="text-default fw-semibold fs-7">{t('Around the Clock ·')}{' '}{t(game.mode)}</div>
                    <div className="text-faint fs-8">{skipsAhead(game) ? t('Doubles and trebles move on · ') : ''}{t('first to finish wins')}</div>
                </div>
            </div>
            <div className="clock-game-board">
                <ATCDartsRound
                    players={players}
                    mode={game.mode}
                    round={state}
                    onDart={onDart}
                    onUndo={onUndo}
                    canUndo={game.throws?.length > 0}
                    rings={skipsAhead(game)}
                    notice={notice}
                />
            </div>
            <ClockMoment moment={moment} onDone={endMoment} mode={game.mode} />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default ClockGame;
