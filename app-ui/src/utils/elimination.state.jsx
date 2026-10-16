import { Fragment, useCallback, useEffect, useRef, useReducer, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { Toast } from 'primereact/toast';

import EliminationContext from './elimination.context';
import EliminationReducer from './elimination.reducer';
import OneEightyCelebration from '../components/games/common/one.eighty.celebration';
import EliminationService from '../services/elimination.service';
import EliminationReturnToPreviousPlayer, { getScoreRangeLabel } from './elimination.return.to.previous.player';
import PlayerService from '../services/player.service';

import {
    validateDartValue,
    dartIsDouble,
    dartIsTriple,
    lastDartIsDouble,
    lastDartIsTriple
} from './game.utils';

import {
    SET_LOADING,
    UPDATE_CURRENT_THROW,
    SAVE_ALL_GAME_THROWS,
    RESET_CURRENT_THROW,
    UPDATE_PLAYER_SCORE,
    CHANGE_CURRENT_PLAYER,
    GAME_HAS_WINNER,
    RETURN_PREV_PLAYER,
    FETCH_GAME_SUCCESS,
    FETCH_PLAYERS_SUCCESS
} from './constants';

const EliminationState = ({ children }) => {
    const { id } = useParams();
    const toast = useRef(null);
    const navigate = useNavigate();

    const initialState = {
        game: {},
        players: [],
        loading: { initGameLoading: true, validateThrow: false }
    };
    const [state, dispatch] = useReducer(EliminationReducer, initialState);
    // { key, name } while the 180 celebration plays
    const [oneEighty, setOneEighty] = useState(null);
    const endOneEighty = useCallback(() => setOneEighty(null), []);

    // -------------------- API Fetch --------------------
    useEffect(() => {
        const fetchGame = async () => {
            try {
                setLoading('initGameLoading', true);
                const game = await EliminationService.loadEliminationGameById(id);
                dispatch({ type: FETCH_GAME_SUCCESS, payload: game });

                const players = await Promise.all(game.players.map(PlayerService.getPlayer));
                dispatch({ type: FETCH_PLAYERS_SUCCESS, payload: players });

                setLoading('initGameLoading', false);
            } catch (err) {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Load Game',
                    detail: 'Failed to load game. ' + err.message,
                    life: 3000
                });
                navigate('/', { replace: true });
            }
        };
        fetchGame();
    }, [id, navigate]);

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
        if (value !== '' && validateDartValue(value)) {
            const gameInMode = state.game.gameInMode;
            const playerScore = state.game.playerModels[state.game.currentPlayerTurn]?.score ?? 0;
            // Only apply in-mode restriction if the player hasn't started yet (score === 0)
            if (playerScore === 0) {
                if (gameInMode === 'Double In' && !dartIsDouble(value)) {
                    value = '0';
                } else if (gameInMode === 'Master In' && !dartIsDouble(value) && !dartIsTriple(value)) {
                    value = '0';
                }
            }
        }

        const newCurrentThrow = state.game.currentThrow.map((dart, i) =>
            i === index ? value : dart
        );

        dispatch({ type: UPDATE_CURRENT_THROW, payload: newCurrentThrow });
    };

    const updateCurrentThrowDartBoard = (score, value) => {
        const newCurrentThrow = [...state.game.currentThrow];
        const gameInMode = state.game.gameInMode;
        const playerScore = state.game.playerModels[state.game.currentPlayerTurn]?.score ?? 0;

        // Apply in-mode restriction for players that haven't scored yet
        if (validateDartValue(value) && playerScore === 0) {
            if (gameInMode === 'Double In' && !dartIsDouble(value)) {
                value = '0';
            } else if (gameInMode === 'Master In' && !dartIsDouble(value) && !dartIsTriple(value)) {
                value = '0';
            }
        }

        for (let index = 0; index < newCurrentThrow.length; index++) {
            if (newCurrentThrow[index] === '') {
                newCurrentThrow[index] = value;
                break;
            }
        }

        dispatch({ type: UPDATE_CURRENT_THROW, payload: newCurrentThrow });
    };

    const getCurrentThrowScore = () =>
        state.game.currentThrow?.reduce((total, dart) => total + parseDartScore(dart), 0) ?? 0;

    /**
     * Check if a given total score (base + current throw so far) would be a bust.
     */
    const checkIfScoreIsBusted = (currentScore) => {
        if (state.game.hasWinner) return false;

        const target = state.game.targetScore;
        if (currentScore > target) return true;

        const mode = state.game.gameOutMode;
        if (mode === 'Double Out') {
            // Can't finish on 1 (no double), and must finish with a double
            if (currentScore === target - 1) return true;
            if (currentScore === target && !lastDartIsDouble(state.game.currentThrow)) return true;
        } else if (mode === 'Master Out') {
            if (currentScore === target &&
                !lastDartIsDouble(state.game.currentThrow) &&
                !lastDartIsTriple(state.game.currentThrow)) return true;
        }

        return false;
    };

    /**
     * Can the current player throw another dart?
     */
    const checkCanThrowMoreDarts = (currentScore) => {
        if (state.game.hasWinner) return false;
        const dartsThrown = state.game.currentThrow?.filter(d => d.trim() !== '').length ?? 0;
        if (dartsThrown >= 3) return false;
        if (currentScore > (state.game.targetScore ?? 0)) return false; // already bust
        return true;
    };

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
                summary: 'Validate Throw',
                detail: 'One or more darts are invalid.',
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

        // Work through darts one by one to detect eliminations, busts, and wins
        let runningScore = playerModels[playerId]?.score ?? 0;
        // We need a mutable snapshot of all player scores for elimination checks
        const tempScores = {};
        Object.keys(playerModels).forEach(pid => {
            tempScores[pid] = playerModels[pid]?.score ?? 0;
        });

        let totalRoundScore = 0;
        const allThrows = [...(state.game.allThrows || [])];
        const eliminations = []; // players reset during this round
        let busted = false;
        let winner = false;

        for (let i = 0; i < currentThrow.length; i++) {
            const dart = currentThrow[i];
            if (!dart || dart.trim() === '') continue;

            const dartScore = parseDartScore(dart);
            const projectedScore = runningScore + dartScore;

            // --- Check for bust ---
            const target = state.game.targetScore;
            const outMode = state.game.gameOutMode;
            let dartBusts = false;

            if (projectedScore > target) {
                dartBusts = true;
            } else if (projectedScore === target) {
                const isDouble = /^d/i.test(dart);
                const isTriple = /^t/i.test(dart);
                if (outMode === 'Double Out' && !isDouble) dartBusts = true;
                if (outMode === 'Master Out' && !isDouble && !isTriple) dartBusts = true;
            } else if (outMode === 'Double Out' && projectedScore === target - 1) {
                // Can't finish from 1 remaining (no double available)
                dartBusts = true;
            }

            if (dartBusts) {
                busted = true;
                break;
            }

            // --- Check for elimination of other players ---
            const otherPlayerIds = (state.game.players || []).filter(pid => pid !== playerId);
            otherPlayerIds.forEach(pid => {
                if (tempScores[pid] === projectedScore && projectedScore > 0) {
                    eliminations.push(pid);
                    tempScores[pid] = 0;
                }
            });

            runningScore = projectedScore;
            totalRoundScore += dartScore;
            tempScores[playerId] = runningScore;

            // --- Check for win ---
            if (runningScore === target) {
                winner = true;
                break;
            }
        }

        if (busted) {
            const originalScore = playerModels[playerId]?.score ?? 0;
            toast.current.show({
                severity: 'warn',
                summary: 'Bust!',
                detail: `Throw is bust. Score stays at ${originalScore}.`,
                life: 3000
            });
            dispatch({ type: RESET_CURRENT_THROW });
            manageCurrentPlayerChange();
            setLoading('validateThrow', false);
            return;
        }

        // Apply eliminations
        eliminations.forEach(pid => {
            const playerObj = state.players?.find(p => p.id === pid);
            dispatch({ type: UPDATE_PLAYER_SCORE, payload: { playerId: pid, score: 0 } });
            toast.current.show({
                severity: 'warn',
                summary: 'Eliminated!',
                detail: `${playerObj?.nickname || playerObj?.name || 'A player'} was reset to 0!`,
                life: 3000
            });
        });

        if (!busted && totalRoundScore === 180) {
            const player = state.players?.find(p => p.id === playerId);
            setOneEighty({ key: Date.now(), name: player?.nickname ?? '' });
        }

        // Apply stats updates
        const dartCount = currentThrow.filter(d => d && d.trim() !== '').length;
        const updatedPlayerModel = {
            ...playerModels[playerId],
            score: runningScore,
            totalThrow: {
                darts: (playerModels[playerId]?.totalThrow?.darts ?? 0) + dartCount,
                rounds: (playerModels[playerId]?.totalThrow?.rounds ?? 0) + 1
            },
            bestThreeDarts: Math.max(
                playerModels[playerId]?.bestThreeDarts ?? 0,
                totalRoundScore
            ),
            scoreRanges: updateScoreRanges(playerModels[playerId]?.scoreRanges ?? {}, totalRoundScore)
        };

        // Save throw record
        allThrows.push({
            darts: currentThrow,
            playerId,
            roundScore: totalRoundScore,
            scoreLeft: Math.max(state.game.targetScore - runningScore, 0)
        });

        if (winner) {
            // Dispatch winner state
            dispatch({ type: UPDATE_PLAYER_SCORE, payload: { playerId, score: runningScore } });
            dispatch({ type: SAVE_ALL_GAME_THROWS, payload: allThrows });
            dispatch({ type: GAME_HAS_WINNER, payload: playerId });

            const winnerPlayer = state.players?.find(p => p.id === playerId);
            toast.current.show({
                severity: 'success',
                summary: 'Game Won!',
                detail: `${winnerPlayer?.nickname || winnerPlayer?.name || 'A player'} wins the game!`,
                life: 4000
            });
            dispatch({ type: RESET_CURRENT_THROW });
            setLoading('validateThrow', false);
            return;
        }

        // Normal round end
        dispatch({
            type: UPDATE_PLAYER_SCORE,
            payload: { playerId, score: runningScore, playerModel: updatedPlayerModel }
        });
        dispatch({ type: SAVE_ALL_GAME_THROWS, payload: allThrows });
        dispatch({ type: RESET_CURRENT_THROW });
        manageCurrentPlayerChange();
        setLoading('validateThrow', false);
    };

    /**
     * Update score range histogram for statistics.
     */
    const updateScoreRanges = (ranges, score) => {
        const label = getScoreRangeLabel(score);
        if (!label) return ranges;
        return { ...ranges, [label]: (ranges[label] ?? 0) + 1 };
    };

    const validateWholeThrow = (values, currentScore) => {
        const empties = values.filter(v => v.trim() === '');
        const target = state.game.targetScore;

        // All 3 must be filled unless the player has reached/exceeded the target already
        if (
            (currentScore < target && empties.length > 0) ||
            values[0] === '' ||
            (values[1] === '' && values[2] !== '')
        ) {
            toast.current.show({
                severity: 'error',
                summary: 'Validate Throw',
                detail: 'Please enter a value for each dart thrown.',
                life: 3000
            });
            return false;
        }

        return true;
    };

    const manageCurrentPlayerChange = () => {
        const players = state.game.players;
        const idx = players.indexOf(state.game.currentPlayerTurn);
        const next = idx < players.length - 1 ? players[idx + 1] : players[0];
        dispatch({ type: CHANGE_CURRENT_PLAYER, payload: next });
    };

    const onClickReturnToPreviousPlayer = () => {
        if (!state.game.allThrows || state.game.allThrows.length === 0) return;
        const newGame = EliminationReturnToPreviousPlayer(state.game);
        dispatch({ type: RETURN_PREV_PLAYER, payload: newGame });
    };

    // -------------------- Context Provider --------------------
    return (
        <Fragment>
            <EliminationContext.Provider value={{
                game: state.game,
                players: state.players,
                loading: state.loading,
                updateCurrentThrowManual,
                updateCurrentThrowDartBoard,
                getCurrentThrowScore,
                checkIfScoreIsBusted,
                checkCanThrowMoreDarts,
                onClickValidateThrow,
                onClickReturnToPreviousPlayer,
                getPointsToNextPlayer
            }}>
                {children}
            </EliminationContext.Provider>
            <OneEightyCelebration celebration={oneEighty} onDone={endOneEighty} />
            <Toast ref={toast} position="bottom-right" />
        </Fragment>
    );
};

export default EliminationState;
