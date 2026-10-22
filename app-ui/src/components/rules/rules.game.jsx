import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';

import PageLoader from '../elements/page.loader';
import VisitInput from '../games/common/visit.input';
import DartBoard from '../games/common/dartboard';
import DartKeypad from '../games/common/dart.keypad';
import useInputMode from '../games/common/use.input.mode';
import useBoardDarts from '../games/common/use.board.darts';
import useDartMarkers from '../games/common/use.dart.markers';
import { RulesScoreboard, TacticsMarks } from './rules.scoreboard';
import RulesService from '../../services/rules.service';
import PlayerService from '../../services/player.service';
import { gameOf } from '../../rules/games';
import { DARTS_PER_VISIT, replayGame, withGameState } from '../../rules/engine';
import { isValidDart, parseDart } from '../../rules/darts';
import { t } from '../../utils/i18n';

const EMPTY_VISIT = ['', '', ''];

/**
 * A game of the rules engine being played: what to aim at, the board or the
 * keypad for the visit and the standings next to it. Every visit is saved;
 * once the game is over its result opens.
 */
const RulesGame = () => {
    const { kind, id } = useParams();
    const definition = gameOf(kind);
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState([]);
    const [failed, setFailed] = useState(false);
    const [darts, setDarts] = useState(EMPTY_VISIT);
    const [input, chooseInput] = useInputMode();
    // the saves run one after the other, in the order of the visits
    const saving = useRef(Promise.resolve());
    const toast = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const loaded = await RulesService.loadGame(id);
                // a finished game shows its result
                if (loaded.hasWinner) return navigate(`/stats/games/${loaded.kind}/${id}`, { replace: true });
                const found = await PlayerService.findPlayersByIds(loaded.players);
                setPlayers(loaded.players.map(playerId => found.find(player => player.id === playerId) ?? { id: playerId, nickname: t('Unknown player') }));
                setGame(loaded);
            } catch {
                setFailed(true);
            }
        };
        load();
    }, [id, navigate]);

    const replay = useMemo(() => game && definition ? replayGame(definition, game) : null, [game, definition]);
    const visitKey = `${game?.visits?.length ?? 0}-${replay?.current}`;
    const { markers, remember } = useDartMarkers(darts, visitKey);
    const boardDarts = useBoardDarts(game ?? { players: [] }, players);

    const save = useCallback((next) => {
        saving.current = saving.current
            .then(() => RulesService.updateGame(next))
            .then(() => {
                if (next.hasWinner) navigate(`/stats/games/${next.kind}/${next.id}`, { replace: true, state: { justFinished: true } });
            })
            .catch(() => toast.current?.show({ severity: 'error', summary: t('Not saved'), detail: t('The last visit could not be saved. Check the connection and play on: the next visit saves everything.'), life: 5000 }));
    }, [navigate]);

    const change = useCallback((visits) => {
        const next = withGameState(definition, { ...game, visits });
        setGame(next);
        setDarts(EMPTY_VISIT);
        save(next);
    }, [definition, game, save]);

    if (!definition) return <Navigate replace to="/play" />;
    if (failed) return <div className="container-fluid p-4 text-subtle">{t('This game could not be found in the selected club.')}</div>;
    if (!game || !replay) return <PageLoader />;

    const entered = darts.filter(dart => dart !== '');
    const canThrow = entered.length < DARTS_PER_VISIT;
    const nameOf = (playerId) => players.find(player => player.id === playerId)?.nickname ?? '';
    const ctx = { settings: replay.settings, round: replay.round };
    const current = replay.current;

    const addDart = (value) => {
        if (!canThrow) {
            toast.current?.clear();
            toast.current?.show({ severity: 'error', summary: t('No more darts'), detail: t('This visit is complete: enter the score.'), life: 2500 });
            return false;
        }
        const field = parseDart(String(value)).field;
        const slot = darts.findIndex(dart => dart === '');
        setDarts(Object.assign([...darts], { [slot]: field }));
        return true;
    };

    const typeDart = (index, value) => setDarts(Object.assign([...darts], { [index]: value }));
    const clearLast = () => {
        const index = darts.map(dart => dart !== '').lastIndexOf(true);
        if (index >= 0) typeDart(index, '');
    };

    const valid = entered.every(dart => isValidDart(dart));
    const submit = () => {
        if (!current || !valid) return;
        // darts not thrown are misses, except where a visit may end early
        const thrown = definition.stopAnyTime ? entered : [...entered, ...Array(DARTS_PER_VISIT - entered.length).fill('0')];
        if (!thrown.length) return;
        change([...(game.visits ?? []), { player: current, darts: thrown.map(dart => parseDart(dart).field) }]);
    };
    const undo = () => {
        if (game.visits?.length) change(game.visits.slice(0, -1));
    };

    const preview = valid ? definition.preview(replay.state, current, entered.map(parseDart), ctx) : t('Invalid dart');
    const scoreboard = (
        <>
            <RulesScoreboard definition={definition} replay={replay} players={players} />
            {kind === 'tactics' && <TacticsMarks replay={replay} players={players} />}
        </>
    );

    return (
        <div className="container-fluid p-4 pt-0 bg-transparent border-0">
            <div className="d-flex justify-content-center mb-4">
                <div className="rules-target">
                    <span className="rules-target-sub">{definition.title}{' · '}{nameOf(current)}</span>
                    <span className="rules-target-main">{current ? definition.target(replay.state, current, ctx) : ''}</span>
                </div>
            </div>
            <VisitInput
                nickname={nameOf(current)}
                input={input}
                onChooseInput={chooseInput}
                board={<DartBoard handleClick={(value, point) => { if (canThrow) remember(value, point); addDart(value); }} markers={markers} withDarts={boardDarts.withDarts} flight={boardDarts.flight} />}
                keypad={<DartKeypad canThrow={canThrow} onDart={addDart} onClearLast={clearLast} entered={entered.length} />}
                aside={scoreboard}
                asideTitle={t('Standings')}
                asideFirstOnPhone
                darts={darts}
                shown={[true, true, true]}
                onDart={typeDart}
                onClearDart={(index) => typeDart(index, '')}
                summary={<span>{preview}{definition.stopAnyTime && entered.length > 0 && entered.length < DARTS_PER_VISIT ? ` · ${t('enter the score to stop here')}` : ''}</span>}
                busted={!valid}
                onSubmit={submit}
                onUndo={undo}
                canUndo={(game.visits?.length ?? 0) > 0}
            />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default RulesGame;
