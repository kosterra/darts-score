import { Fragment, useCallback, useEffect, useRef, useReducer, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { Toast } from 'primereact/toast';

import EliminationContext from './elimination.context';
import GameReducer from './game.reducer';
import OneEightyCelebration from '../components/games/common/one.eighty.celebration';
import KnockOut from '../components/games/common/knock.out';
import ClubEliminationService from '../services/elimination.service';
import { QuickEliminationService, quickPlayersOf } from '../services/quick.game.service';
import { eliminationInDart, eliminationVisitOutcome, replayElimination } from '../rules/elimination';
import PlayerService from '../services/player.service';
import { loadWithUnsent, useGameSaves } from './unsent.games';
import SaveStatus from '../components/games/common/save.status';
import { knockOutScene } from './elimination.moments';

import { validateDartValue } from './game.utils';
import { eliminationBust, eliminationCanThrow, eliminationDartsMissing } from './elimination.input';

import { FETCH_GAME_SUCCESS, FETCH_PLAYERS_SUCCESS, SET_GAME, SET_LOADING, UPDATE_CURRENT_THROW } from './constants';
import { t } from './i18n';

// quick: a quick game of the start page (or of a darts evening), the players only names
const EliminationState = ({ children, quick = false }) => {
    const EliminationService = quick ? QuickEliminationService : ClubEliminationService;
    const { id } = useParams();
    const toast = useRef(null);
    const navigate = useNavigate();

    const initialState = {
        game: {},
        players: [],
        loading: { initGameLoading: true, validateThrow: false }
    };
    const [state, dispatch] = useReducer(GameReducer, initialState);
    // { key, name } while the 180 celebration plays
    const [oneEighty, setOneEighty] = useState(null);
    const endOneEighty = useCallback(() => setOneEighty(null), []);
    // { key, kind, by, byIndex, victims } while players are sent back to 0
    const [knockOut, setKnockOut] = useState(null);
    const endKnockOut = useCallback(() => setKnockOut(null), []);
    const knockOutTimer = useRef(null);
    useEffect(() => () => clearTimeout(knockOutTimer.current), []);

    // a visit (or an undo) asks for a save of the game as it is afterwards;
    // the saves run one after the other, so they arrive in order
    const [saveRequest, setSaveRequest] = useState(0);
    // the winning visit is saved: the statistics page can show the finished game
    const [winnerSaved, setWinnerSaved] = useState(false);
    const requestSave = () => setSaveRequest(request => request + 1);

    // without a connection the game is kept on this device and sent once it is back
    // bumped when the server refused a save for good: its state is loaded again
    const [reload, setReload] = useState(0);
    const notSaved = (detail) => toast.current?.show({ severity: 'error', summary: t('Not saved'), detail, life: 4000 });
    const { save, unsent } = useGameSaves(`${quick ? 'quick' : 'elimination'}:${id}`, (game, options) => EliminationService.updateEliminationGame(game, options), (game) => { if (game.hasWinner) setWinnerSaved(true); }, (error) => {
        // a game gone says so when it is loaded again
        if (error.status !== 404) notSaved(error.message);
        setReload(count => count + 1);
    });

    useEffect(() => {
        if (!saveRequest) return;
        save(state.game, { players: state.players, kind: 'Elimination' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveRequest]);

    // -------------------- API Fetch --------------------
    useEffect(() => {
        const fetchGame = async () => {
            try {
                setLoading('initGameLoading', true);
                const playersOf = async (loaded) => quick ? quickPlayersOf(loaded) : Promise.all(loaded.players.map(PlayerService.getPlayer));
                const { game, players, kept, dropped } = await loadWithUnsent(`${quick ? 'quick' : 'elimination'}:${id}`, () => EliminationService.loadEliminationGameById(id), playersOf);
                if (dropped) notSaved(t('This device kept an older state of the game than the server has: the server\'s is shown.'));
                // a game already over on the server shows its result
                if (game.hasWinner && !kept) setWinnerSaved(true);
                dispatch({ type: FETCH_GAME_SUCCESS, payload: game });
                dispatch({ type: FETCH_PLAYERS_SUCCESS, payload: players });

                setLoading('initGameLoading', false);
            } catch (err) {
                toast.current?.show({
                    severity: 'error',
                    summary: t('Load Game'),
                    detail: t('Failed to load game. ') + err.message,
                    life: 3000
                });
                navigate(quick ? '/quick' : '/', { replace: true });
            }
        };
        fetchGame();
        // the service follows "quick", which a page never changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, navigate, reload]);

    // -------------------- Helper Functions --------------------
    const setLoading = (eventName, setTo) =>
        dispatch({ type: SET_LOADING, payload: { eventName, setTo } });

    /**
     * Parse a dart string like "S20", "D10", "T5" into its numeric score.
     */
    const parseDartScore = (dart) => {
        if (!dart || dart.trim() === '' || Number(dart) === 0) return 0;
        let score = Number(dart.slice(1));
        if (/^t/i.test(dart)) score *= 3;
        if (/^d/i.test(dart)) score *= 2;
        return score;
    };

    const updateCurrentThrowManual = (score, value, index) => {
        // the in mode counts from the score before this dart: the darts after the opening double count
        if (value !== '' && validateDartValue(value)) {
            value = eliminationInDart(state.game, state.game.currentThrow, index, value);
        }

        const newCurrentThrow = state.game.currentThrow.map((dart, i) =>
            i === index ? value : dart
        );

        dispatch({ type: UPDATE_CURRENT_THROW, payload: newCurrentThrow });
    };

    const updateCurrentThrowDartBoard = (score, value) => {
        const newCurrentThrow = [...state.game.currentThrow];
        const index = newCurrentThrow.indexOf('');
        if (index < 0) return;
        // the in mode counts from the score before this dart: the darts after the opening double count
        newCurrentThrow[index] = validateDartValue(value) ? eliminationInDart(state.game, newCurrentThrow, index, value) : value;

        dispatch({ type: UPDATE_CURRENT_THROW, payload: newCurrentThrow });
    };

    const getCurrentThrowScore = () =>
        state.game.currentThrow?.reduce((total, dart) => total + parseDartScore(dart), 0) ?? 0;

    /**
     * Check if a given total score (base + current throw so far) would be a bust.
     */
    const checkIfScoreIsBusted = (currentScore) => eliminationBust(state.game, currentScore);

    /**
     * Can the current player throw another dart? Not after a bust: it ends the visit.
     */
    const checkCanThrowMoreDarts = (currentScore) => eliminationCanThrow(state.game, currentScore);

    /**
     * Points the current player needs to draw level with or surpass the
     * next-highest scoring player (i.e. to be able to eliminate them).
     * Returns the gap to the player directly above, or '-' if leading.
     */
    const getPointsToNextPlayer = (playerId) => {
        if (!state.players?.length || !state.game?.playerModels) return '-';

        const liveScores = state.players.map(p => {
            let score = state.game.playerModels[p.id]?.score ?? 0;
            if (p.id === state.game.currentPlayerTurn) {
                score += getCurrentThrowScore();
            }
            return { id: p.id, score };
        });

        const sorted = [...liveScores].sort((a, b) => a.score - b.score);
        const index = sorted.findIndex(p => p.id === playerId);
        if (index === -1) return '-';

        const nextPlayer = sorted[index + 1];
        if (!nextPlayer) return '-'; // already highest scorer

        const diff = nextPlayer.score - sorted[index].score;
        return diff > 0 ? diff : '-';
    };

    // -------------------- Main Game Logic --------------------
    const onClickValidateThrow = (currentScore) => {
        setLoading('validateThrow', true);
        const currentThrow = [...state.game.currentThrow];
        const playerId = state.game.currentPlayerTurn;
        const playerModels = state.game.playerModels;

        // Validate individual dart values
        if (currentThrow.some(d => !validateDartValue(d))) {
            toast.current.show({
                severity: 'error',
                summary: t('Validate Throw'),
                detail: t('One or more darts are invalid.'),
                life: 3000
            });
            setLoading('validateThrow', false);
            return;
        }

        // Validate completeness of throw entry
        if (!validateWholeThrow(currentThrow, currentScore)) {
            setLoading('validateThrow', false);
            return;
        }

        // what the visit does, dart by dart: for its moments
        const scoresBefore = Object.fromEntries((state.game.players || []).map(pid => [pid, playerModels[pid]?.score ?? 0]));
        const outcome = eliminationVisitOutcome(state.game, currentThrow);
        const next = replayElimination({ ...state.game, visits: [...(state.game.visits ?? []), { player: playerId, darts: currentThrow.filter(dart => dart.trim() !== '') }] });

        if (outcome.busted) {
            toast.current.show({
                severity: 'warn',
                summary: t('Bust!'),
                detail: t('Throw is bust. Score stays at {{originalScore}}.', { originalScore: scoresBefore[playerId] }),
                life: 3000
            });
        } else {
            // the first one sent back is kicked out of their house
            if (outcome.eliminations.length) {
                const scene = { key: Date.now(), ...knockOutScene({ game: state.game, players: state.players, playerId, eliminations: outcome.eliminations, scoresBefore }) };
                // after a 180 the maximum has its moment first
                clearTimeout(knockOutTimer.current);
                if (outcome.roundScore === 180) knockOutTimer.current = setTimeout(() => setKnockOut(scene), 2700);
                else setKnockOut(scene);
            }
            if (outcome.roundScore === 180) {
                const player = state.players?.find(p => p.id === playerId);
                setOneEighty({ key: Date.now(), name: player?.nickname ?? '' });
            }
            if (outcome.winner) {
                const winnerPlayer = state.players?.find(p => p.id === playerId);
                toast.current.show({
                    severity: 'success',
                    summary: t('Game Won!'),
                    detail: t('{{name}} wins the game!', { name: winnerPlayer?.nickname || winnerPlayer?.name || t('A player') }),
                    life: 4000
                });
            }
        }

        dispatch({ type: SET_GAME, payload: next });
        setLoading('validateThrow', false);
        requestSave();
    };

    const validateWholeThrow = (values, currentScore) => {
        // All 3 must be filled unless the player has reached the target or bust already
        if (eliminationDartsMissing(state.game, values, currentScore)) {
            toast.current.show({
                severity: 'error',
                summary: t('Validate Throw'),
                detail: t('Please enter a value for each dart thrown.'),
                life: 3000
            });
            return false;
        }

        return true;
    };

    // undo: the game without its last visit
    const onClickReturnToPreviousPlayer = () => {
        if (!state.game.visits?.length) return;
        dispatch({ type: SET_GAME, payload: replayElimination({ ...state.game, visits: state.game.visits.slice(0, -1) }) });
        requestSave();
    };

    // -------------------- Context Provider --------------------
    return (
        <Fragment>
            <EliminationContext.Provider value={{
                game: state.game,
                players: state.players,
                loading: state.loading,
                quick,
                winnerSaved,
                unsent,
                // a moment of the winning visit plays to its end before the statistics page
                celebrating: Boolean(knockOut || oneEighty),
                updateCurrentThrowManual,
                updateCurrentThrowDartBoard,
                getCurrentThrowScore,
                checkIfScoreIsBusted,
                checkCanThrowMoreDarts,
                onClickValidateThrow,
                onClickReturnToPreviousPlayer,
                getPointsToNextPlayer
            }}>
                <SaveStatus unsent={unsent} finished={Boolean(state.game.hasWinner)} />
                {children}
            </EliminationContext.Provider>
            <OneEightyCelebration celebration={oneEighty} onDone={endOneEighty} />
            <KnockOut knockOut={knockOut} onDone={endKnockOut} />
            <Toast ref={toast} position="bottom-right" />
        </Fragment>
    );
};

export default EliminationState;
