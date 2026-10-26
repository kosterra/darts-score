import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { houseRuleLines } from '../../utils/club.rules.labels';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';

import PageLoader from '../elements/page.loader';
import VisitInput from '../games/common/visit.input';
import DartBoard from '../games/common/dartboard';
import DartKeypad from '../games/common/dart.keypad';
import useInputMode from '../games/common/use.input.mode';
import useBoardDarts from '../games/common/use.board.darts';
import useDartMarkers from '../games/common/use.dart.markers';
import { TacticsMarks } from './rules.scoreboard';
import GameScreenButton from '../screen/game.screen.button';
import LiveHero from '../games/common/live.hero';
import SaveStatus from '../games/common/save.status';
import { loadWithUnsent, useGameSaves } from '../../utils/unsent.games';
import LiveFigures from '../games/common/live.figures';
import OneEightyCelebration from '../games/common/one.eighty.celebration';
import RulesService from '../../services/rules.service';
import PlayerService from '../../services/player.service';
import { gameOf } from '../../rules/games';
import { DARTS_PER_VISIT, playerOf, replayGame, withGameState } from '../../rules/engine';
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
    // the big moment of a visit (a Shanghai, a new killer, …) while it plays
    const [moment, setMoment] = useState(null);
    const endMoment = useCallback(() => setMoment(null), []);
    const toast = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                // the game kept on this device (not sent yet) wins over the server's
                const playersOf = async (loaded) => {
                    const found = await PlayerService.findPlayersByIds(loaded.players);
                    return loaded.players.map(playerId => found.find(player => player.id === playerId) ?? { id: playerId, nickname: t('Unknown player') });
                };
                const { game: loaded, players: found, kept } = await loadWithUnsent(`rules:${id}`, () => RulesService.loadGame(id), playersOf);
                // a finished game shows its result
                if (loaded.hasWinner && !kept) return navigate(`/stats/games/${loaded.kind}/${id}`, { replace: true });
                setPlayers(found);
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

    // the game is over and saved: the result opens once the moment of the last visit has played
    const [savedOver, setSavedOver] = useState(null);
    useEffect(() => {
        if (savedOver && !moment) navigate(`/stats/games/${savedOver.kind}/${savedOver.id}`, { replace: true, state: { justFinished: true } });
    }, [savedOver, moment, navigate]);

    // without a connection the game is kept on this device and sent once it is back
    const { save: keepAndSend, unsent } = useGameSaves(`rules:${id}`, (next) => RulesService.updateGame(next), (next) => {
        if (next.hasWinner) setSavedOver(next);
    });
    const save = useCallback((next) => keepAndSend(next, { players, kind: definition?.title ?? t('Game') }), [keepAndSend, players, definition]);

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
        const visits = [...(game.visits ?? []), { player: current, darts: thrown.map(dart => parseDart(dart).field) }];
        const after = replayGame(definition, { ...game, visits }).state;
        const big = definition.moment?.(playerOf(definition, replay.state, current), playerOf(definition, after, current), current);
        if (big) setMoment({ key: Date.now(), name: nameOf(current), ...big });
        change(visits);
    };
    const undo = () => {
        if (game.visits?.length) change(game.visits.slice(0, -1));
    };

    const preview = valid ? definition.preview(replay.state, current, entered.map(parseDart), ctx) : t('Invalid dart');
    const options = (definition.options ?? []).map(option => option.values.find(value => value.value === replay.settings[option.key])?.label).filter(Boolean);
    const title = [definition.title, ...options].join(' · ');
    const subtitle = current ? `${nameOf(current)}: ${definition.target(replay.state, current, ctx)}` : '';
    const placeOf = Object.fromEntries(replay.standings.map(row => [row.id, row.place]));
    // every player as the header shows them: the big number, a line about their play, what is under the number
    const heroRows = players.map(player => {
        const own = playerOf(definition, replay.state, player.id);
        const hero = definition.hero ? definition.hero(own, replay.state, ctx) : { score: definition.score(own, replay.state) };
        const isTurn = player.id === current;
        const out = definition.active && !definition.active(replay.state, player.id);
        return {
            player,
            isTurn,
            line: (hero.line ?? []).map(([label, value], index) => <span key={label}>{index > 0 && ' · '}{label}{' '}<strong>{value}</strong></span>),
            tags: <>
                {(hero.tags ?? []).map(tag => <span key={tag} className="x01-dart-for">{tag}</span>)}
                {out && <span className="x01-live-starter">{t('Out')}</span>}
                {players.length > 1 && !out && <span className="x01-live-starter">{t('place {{place}}', { place: placeOf[player.id] })}</span>}
            </>,
            score: hero.score,
            below: <span className="x01-live-route">{isTurn && entered.length ? preview : hero.note ?? '\u00a0'}</span>,
        };
    });
    // the standings with the figures of the statistics, live: the place, the game's own columns, then the figures
    const columnRows = definition.columns.map(column => ({
        label: column.label,
        neutral: true,
        value: (id) => column.value(playerOf(definition, replay.state, id), replay.state, ctx),
    }));
    const figureRows = (definition.figures?.(playerOf(definition, replay.state, players[0]?.id), replay.state) ?? [])
        .map(([label], index) => ({ label, neutral: true, value: (id) => definition.figures(playerOf(definition, replay.state, id), replay.state)[index]?.[1] }))
        .filter(row => !columnRows.some(column => column.label === row.label));
    const tableRows = [
        ...(players.length > 1 ? [{ label: t('Place'), lower: true, value: (id) => placeOf[id] }] : []),
        ...columnRows,
        ...figureRows,
    ];
    const scoreboard = (
        <>
            <LiveFigures players={players} rows={tableRows} />
            {kind === 'tactics' && <TacticsMarks replay={replay} players={players} />}
        </>
    );

    return (
        <div className="container-fluid bg-transparent border-0 x01-game-page">
            <SaveStatus unsent={unsent} finished={Boolean(game?.hasWinner)} />
            <LiveHero rulesId={kind} title={title} subtitle={subtitle} rows={heroRows} houseRules={houseRuleLines(kind, game.settings)} actions={<GameScreenButton kind="rules" game={game} />} />
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
            <OneEightyCelebration celebration={moment} onDone={endMoment} />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default RulesGame;
