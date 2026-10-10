import { Fragment, useEffect, useRef, useReducer } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { Toast } from 'primereact/toast';

import CricketContext from './cricket.context';
import CricketReducer from './cricket.reducer';
import CricketService from '../services/cricket.service';
import CricketReturnToPreviousPlayer from './cricket.return.to.previous.player';
import PlayerService from '../services/player.service';

import { validateDartValue, cricketGetCurrentScore } from './game.utils';

import {
    FETCH_GAME_SUCCESS,
    FETCH_PLAYERS_SUCCESS,
    SET_LOADING,
    UPDATE_CURRENT_THROW,
    RESET_CURRENT_THROW,
    UPDATE_PLAYER_SCORE,
    UPDATE_ALL_THROWS,
    UPDATE_TOTAL_THROW,
    UPDATE_SECTION_HIT,
    UPDATE_HITS,
    CHANGE_CURRENT_PLAYER,
    GAME_HAS_WINNER,
    RETURN_PREV_PLAYER
} from './constants';

const CricketState = props => {
    const { id } = useParams();

    const toast = useRef(null);

    const navigate = useNavigate();

    const initialState = {
        game: {},
        players: [],
        loading: {
            initGameLoading: true,
            validateThrow: false
        }
    };

    const [state, dispatch] = useReducer(CricketReducer, initialState);

    // fetch a cricket game from the API
    useEffect(() => {
        setLoading('initGameLoading', true);
        async function fetchCricket() {
            try {
                let cricket = await CricketService.loadCricketGameById(id);
                dispatch({ type: FETCH_GAME_SUCCESS, payload: cricket });
                return cricket;
            } catch (error) {
                throw new Error(error);
            }
        }

        async function fetchPlayers(game) {
            try {
                let players = [];
                await Promise.all(game.players.map(async (playerId) => {
                    let player = await PlayerService.getPlayer(playerId);
                    players.push(player);
                }));
                dispatch({ type: FETCH_PLAYERS_SUCCESS, payload: players });
            } catch (error) {
                throw new Error(error);
            }
        }

        fetchCricket().then((game) => {
            fetchPlayers(game).then(() => {
                setLoading('initGameLoading', false);
            });
        }).catch(error => {
            toast.current.show(
                {
                    severity: 'error',
                    summary: 'Load Game',
                    detail: 'Failed to load Cricket game. ' + error.message,
                    life: 3000
                }
            );
            navigate("/", { replace: true });
        });
    }, [id, navigate]);

    const updateCurrentThrowManual = (value, index) => {
        const newCurrentThrow = state.game.currentThrow.map((dart, i) => {
            if (i === index) {
                dart = value;
            }
            return dart
        });

        dispatch({
            type: UPDATE_CURRENT_THROW,
            payload: newCurrentThrow
        })
    }

    const updateCurrentThrowDartBoard = (value) => {
        const newCurrentThrow = [...state.game.currentThrow];

        for (let index = 0; index < newCurrentThrow.length; index++) {
            if (newCurrentThrow[index] === '') {
                newCurrentThrow[index] = value;
                break;
            }
        }

        dispatch({
            type: UPDATE_CURRENT_THROW,
            payload: newCurrentThrow
        })
    }

    const onClickValidateThrow = (currentScore, sectionHit) => {
        setLoading('validateThrow', true);

        let currentThrow = [...state.game.currentThrow];

        for (let i = 0; i < currentThrow.length; i++) {
            if (!validateDartValue(currentThrow[i])) {
                toast.current.show(
                    {
                        severity: 'error',
                        summary: 'Validate Throws',
                        detail: 'One or more of your darts have an invalid value',
                        life: 3000
                    }
                );
                setLoading('validateThrow', false);
                return
            }
        }

        let throwIsValid = validateWholeThrow(currentThrow, currentScore, sectionHit);
        if (!throwIsValid) {
            setLoading('validateThrow', false);
            return
        }

        let allThrows = [...state.game.allThrows,
        {
            darts: currentThrow,
            playerId: state.game.currentPlayerTurn
        }];
        updateAllThrows(allThrows)

        updateTotalThrow();
        updatePlayerScore(currentScore);
        updateSectionHit(sectionHit);
        updateHits();
        resetCurrentThrow();

        if (checkIfHasWonGame(sectionHit, currentScore)) {
            gameHasWinner();
            setLoading('validateThrow', false);
            return
        }

        manageCurrentPlayerChange();

        setLoading('validateThrow', false);
    }

    const validateWholeThrow = (values, currentScore, sectionHit) => {
        let getWhiteSpaces = values.filter(value => value.trim() === '');

        if (
            ((!checkIfScoreIsHighestScore(currentScore) || !checkIfAllSectionsClosed(sectionHit)) && getWhiteSpaces.length) ||
            values[0] === '' ||
            (values[1] === '' && values[2] !== '')
        ) {
            toast.current.show(
                {
                    severity: 'error',
                    summary: 'Validate Throws',
                    detail: 'You need to add a value for each dart',
                    life: 3000
                }
            );
            return false;
        }

        if (currentScore === 1 || currentScore === 0) {
            return true;
        }

        return true;
    }

    const resetCurrentThrow = () => dispatch({ type: RESET_CURRENT_THROW });

    const updatePlayerScore = score => {
        let playerId = state.game.currentPlayerTurn;

        dispatch({
            type: UPDATE_PLAYER_SCORE,
            payload: {
                playerId,
                score
            }
        })
    }

    const updateAllThrows = (allThrows) => {
        dispatch({
            type: UPDATE_ALL_THROWS,
            payload: allThrows
        })
    }

    const updateTotalThrow = () => {
        let playerModel = state.game.playerModels[state.game.currentPlayerTurn];
        let totalThrow = playerModel.totalThrow;
        let dartNumber = state.game.currentThrow.filter(dart => dart.trim() !== '').length;

        if (!totalThrow['game']) {
            totalThrow['game'] = {
                darts: 0,
                rounds: 0
            };
        }

        totalThrow.game.darts += dartNumber;
        totalThrow.game.rounds++;

        let playerId = state.game.currentPlayerTurn;

        dispatch({
            type: UPDATE_TOTAL_THROW,
            payload: {
                playerId,
                totalThrow
            }
        })
    }

    const updateSectionHit = (sectionHit) => {
        let playerId = state.game.currentPlayerTurn;

        dispatch({
            type: UPDATE_SECTION_HIT,
            payload: {
                playerId,
                sectionHit
            }
        })
    }

    const updateHits = () => {
        let playerId = state.game.currentPlayerTurn;
        let hit = { ...state.game.playerModels[state.game.currentPlayerTurn].hit };

        state.game.currentThrow.forEach(dart => {
            if (dart.trim() !== '') {
                if (Number(dart) === 0) {
                    if (hit['Missed']) {
                        hit.Missed++;
                    } else {
                        hit.Missed = 1;
                    }
                } else {
                    if (hit[dart.toUpperCase()]) {
                        hit[dart.toUpperCase()]++;
                    } else {
                        hit[dart.toUpperCase()] = 1;
                    }
                }
            }
        });

        dispatch({
            type: UPDATE_HITS,
            payload: {
                playerId,
                hit
            }
        })
    }

    const checkIfHasWonGame = (sectionHit, score) => {
        return checkIfAllSectionsClosed(sectionHit) && checkIfScoreIsHighestScore(score);
    }

    const getCurrentThrowScore = () => {
        let playerModel = Object.assign({}, state.game.playerModels[state.game.currentPlayerTurn]);
        let sectionHit = Object.assign({}, playerModel.sectionHit);

        state.game.currentThrow.forEach(dart => {
            if (validateDartValue(dart) && dart.trim() !== '') {
                let section = Number(dart.slice(1));

                if (section >= 15) {

                    if (/t/i.test(dart[0])) {
                        sectionHit[section.toString()] = getSectionHitCount(3, section, sectionHit);
                    }

                    if (/d/i.test(dart[0])) {
                        sectionHit[section.toString()] = getSectionHitCount(2, section, sectionHit);
                    }

                    if (/s/i.test(dart[0])) {
                        sectionHit[section.toString()] = getSectionHitCount(1, section, sectionHit);
                    }
                }
            }
        });

        return cricketGetCurrentScore(state.game.currentThrow, playerModel.score, sectionHit);
    }

    const getSectionHitCount = (count, section, sectionHit) => {
        let sectionClosedByOthers = checkSectionClosedByOthers(section);
        let isSectionClosed = checkSectionClosed(section);

        if (!isSectionClosed || !sectionClosedByOthers || (isSectionClosed && !sectionClosedByOthers)) {
            count += sectionHit[section];
        }

        if (!isSectionClosed && sectionClosedByOthers) {
            if (sectionHit[section] + count > 3) {
                count = 3;
            }
        }

        if (isSectionClosed && sectionClosedByOthers) {
            count = sectionHit[section];
        }

        return count;
    }

    const getCurrentSectionHit = () => {
        let sectionHit = Object.assign({}, state.game.playerModels[state.game.currentPlayerTurn].sectionHit);

        state.game.currentThrow.forEach(dart => {
            if (dart.trim() !== '') {
                let section = Number(dart.slice(1));

                if (section >= 15 && !checkSectionClosed(section.toString())) {
                    if (!sectionHit[section.toString()]) {
                        sectionHit[section.toString()] = 0;
                    }

                    if (/t/i.test(dart[0])) sectionHit[section.toString()] += 3;
                    if (/d/i.test(dart[0])) sectionHit[section.toString()] += 2;
                    if (/s/i.test(dart[0])) sectionHit[section.toString()]++;

                    if (!checkSectionClosed(section.toString())
                        && checkSectionClosedByOthers(section.toString())
                        && sectionHit[section.toString()] > 3) {
                        sectionHit[section.toString()] = 3;
                    }
                }
            }
        });

        return sectionHit;
    }

    const checkIfScoreIsHighestScore = (score) => {
        let highestScore = false;

        for (let i = 0; i < state.game.players.length; i++) {
            if (state.game.players[i] !== state.game.currentPlayerTurn) {
                let playerModel = state.game.playerModels[state.game.players[i]];
                if (playerModel.score > highestScore) {
                    highestScore = playerModel.score;
                }
            }
        }

        return score > highestScore;
    }

    const checkIfAllSectionsClosed = (sectionHit) => {
        return sectionHit['25'] >= 3
            && sectionHit['20'] >= 3
            && sectionHit['19'] >= 3
            && sectionHit['18'] >= 3
            && sectionHit['17'] >= 3
            && sectionHit['16'] >= 3
            && sectionHit['15'] >= 3;
    }

    const checkSectionClosed = (score) => {
        return checkSectionClosedByOthers(score)
            && state.game.playerModels[state.game.currentPlayerTurn].sectionHit[score.toString()] >= 3;
    }

    const checkSectionClosedByOthers = (score) => {
        let sectionIsClosed = true;

        for (let i = 0; i < state.game.players.length; i++) {
            if (state.game.players[i] !== state.game.currentPlayerTurn) {
                let playerModel = state.game.playerModels[state.game.players[i]];
                if (playerModel.sectionHit[score.toString()] < 3) {
                    sectionIsClosed = false;
                    break;
                }
            }
        }

        return sectionIsClosed;
    }

    const manageCurrentPlayerChange = () => {
        let currentPlayerIndex = state.game.players.indexOf(state.game.currentPlayerTurn);

        let nextPlayer = currentPlayerIndex < state.game.players.length - 1 ?
            state.game.players[currentPlayerIndex + 1] : state.game.players[0];
        dispatch({
            type: CHANGE_CURRENT_PLAYER,
            payload: nextPlayer
        });
    }

    const gameHasWinner = () => {
        let playerId = state.game.currentPlayerTurn;
        dispatch({
            type: GAME_HAS_WINNER,
            payload: playerId
        })
    }

    const onClickReturnToPreviousPlayer = () => {
        let newMatchData = CricketReturnToPreviousPlayer(state.game);

        dispatch({
            type: RETURN_PREV_PLAYER,
            payload: newMatchData
        })
    }

    const setLoading = (eventName, setTo) => dispatch({
        type: SET_LOADING,
        payload: {
            eventName,
            setTo
        }
    });

    return (
        <Fragment>
            <CricketContext.Provider
                value={{
                    game: state.game,
                    players: state.players,
                    loading: state.loading,
                    onClickValidateThrow,
                    updateCurrentThrowManual,
                    updateCurrentThrowDartBoard,
                    onClickReturnToPreviousPlayer,
                    getCurrentThrowScore,
                    getCurrentSectionHit,
                    checkIfScoreIsHighestScore,
                    checkSectionClosed,
                    checkIfAllSectionsClosed
                }}
            >
                {props.children}
            </CricketContext.Provider>
            <Toast ref={toast} position="bottom-right" />
        </Fragment>
    );
};

export default CricketState;
