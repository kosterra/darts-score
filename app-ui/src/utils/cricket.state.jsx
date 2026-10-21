import { Fragment, useCallback, useEffect, useRef, useReducer, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { Toast } from 'primereact/toast';

import CricketContext from './cricket.context';
import CricketReducer from './cricket.reducer';
import ClubCricketService from '../services/cricket.service';
import { QuickCricketService, quickPlayersOf } from '../services/quick.game.service';
import CricketReturnToPreviousPlayer from './cricket.return.to.previous.player';
import PlayerService from '../services/player.service';
import OneEightyCelebration from '../components/games/common/one.eighty.celebration';
import WhiteHorse from '../components/games/common/white.horse';
import { HatTrick, ShutOut } from '../components/games/cricket/cricket.moments';

import { validateDartValue, cricketGetCurrentScore } from './game.utils';
import { cutThroatPoints, variantOf, winsWithScore } from './cricket.variants';

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
import { t } from './i18n';

const CricketState = props => {
    // a quick game of the start page: no account, the players only names
    const quick = Boolean(props.quick);
    const CricketService = quick ? QuickCricketService : ClubCricketService;
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

    // the big moments of a visit: nine marks (three trebles), or the White
    // Horse (three different trebles); { key, name, ... } while they play
    const [nineMarks, setNineMarks] = useState(null);
    const [whiteHorse, setWhiteHorse] = useState(null);
    const endNineMarks = useCallback(() => setNineMarks(null), []);
    const endWhiteHorse = useCallback(() => setWhiteHorse(null), []);
    const [hatTrick, setHatTrick] = useState(null);
    const [shutOut, setShutOut] = useState(null);
    const endHatTrick = useCallback(() => setHatTrick(null), []);
    const endShutOut = useCallback(() => setShutOut(null), []);
    // while one plays, a won game waits for it before the statistics page opens
    const celebrating = Boolean(nineMarks || whiteHorse || hatTrick || shutOut);

    // a visit (or an undo) asks for a save of the game as it is afterwards;
    // the saves run one after the other, so they arrive in order
    const [saveRequest, setSaveRequest] = useState(0);
    const saving = useRef(Promise.resolve());
    // the winning visit is saved: the statistics page can show the finished game
    const [winnerSaved, setWinnerSaved] = useState(false);

    useEffect(() => {
        if (!saveRequest) return;
        const game = state.game;
        saving.current = saving.current
            .then(() => CricketService.updateCricketGame(game))
            .catch(() => toast.current?.show({ severity: 'error', summary: t('Not saved'), detail: t('The last visit could not be saved. Check the connection: the next visit saves everything.'), life: 4000 }))
            .then(() => { if (game.hasWinner) setWinnerSaved(true); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveRequest]);

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
                if (quick) {
                    dispatch({ type: FETCH_PLAYERS_SUCCESS, payload: quickPlayersOf(game) });
                    return;
                }
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
                    summary: t('Load Game'),
                    detail: t('Failed to load Cricket game. ') + error.message,
                    life: 3000
                }
            );
            navigate(quick ? '/quick' : '/', { replace: true });
        });
        // the service follows "quick", which a page never changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                        summary: t('Validate Throws'),
                        detail: t('One or more of your darts have an invalid value'),
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

        const playerId = state.game.currentPlayerTurn;
        // what the visit changes, so that it can be taken back exactly
        const scoresBefore = Object.fromEntries(state.game.players.map(id => [id, state.game.playerModels[id].score ?? 0]));
        let allThrows = [...state.game.allThrows,
        {
            darts: currentThrow,
            playerId,
            sectionHitBefore: { ...state.game.playerModels[playerId].sectionHit },
            scoresBefore
        }];
        updateAllThrows(allThrows)

        // cut-throat: the points go to the opponents who still have the number open
        if (variantOf(state.game) === 'Cut-throat') {
            const points = cutThroatPoints(state.game, playerId, state.game.playerModels[playerId].sectionHit, sectionHit);
            Object.entries(points).filter(([, value]) => value > 0).forEach(([id, value]) => dispatch({
                type: UPDATE_PLAYER_SCORE,
                payload: { playerId: id, score: scoresBefore[id] + value }
            }));
        }

        celebrateVisit(playerId, currentThrow, sectionHit);

        updateTotalThrow();
        updatePlayerScore(currentScore);
        updateSectionHit(sectionHit);
        updateHits();
        resetCurrentThrow();

        if (checkIfHasWonGame(sectionHit, currentScore)) {
            gameHasWinner();
            setLoading('validateThrow', false);
            setSaveRequest(request => request + 1);
            return
        }

        manageCurrentPlayerChange();

        setLoading('validateThrow', false);
        setSaveRequest(request => request + 1);
    }

    /**
     * The big moments of a visit, the biggest one if there are several: the
     * shut-out (all seven closed while an opponent closed none), the White
     * Horse (three different trebles on 15 to 20), nine marks (three trebles),
     * the hat trick (three bulls).
     */
    const celebrateVisit = (playerId, darts, sectionHit) => {
        const thrown = darts.map(dart => String(dart).trim().toUpperCase());
        const trebles = thrown.filter(dart => /^T(1[5-9]|20)$/.test(dart));
        const bulls = thrown.filter(dart => dart === 'S25' || dart === 'D25');
        const name = state.players.find(player => player.id === playerId)?.nickname ?? '';
        const playerIndex = state.game.players.indexOf(playerId);
        const key = Date.now();
        const closedCount = (hits = {}) => ['15', '16', '17', '18', '19', '20', '25'].filter(n => (hits[n] ?? 0) >= 3).length;
        const shutOutVictims = closedCount(sectionHit) === 7 && closedCount(state.game.playerModels[playerId].sectionHit) < 7
            ? state.game.players.filter(id => id !== playerId && closedCount(state.game.playerModels[id].sectionHit) === 0)
            : [];

        if (shutOutVictims.length) {
            const nickname = (id) => state.players.find(player => player.id === id)?.nickname ?? '';
            setShutOut({ key, name, playerIndex, victims: shutOutVictims.map(nickname) });
        } else if (trebles.length === 3 && new Set(trebles).size === 3) {
            setWhiteHorse({ key, name, darts: trebles });
        } else if (trebles.length === 3) {
            setNineMarks({ key, name, number: '9', words: t('Nine marks!'), sign: t('9 marks') });
        } else if (bulls.length === 3) {
            setHatTrick({ key, name, playerIndex, darts: bulls });
        }
    };

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
                    summary: t('Validate Throws'),
                    detail: t('You need to add a value for each dart'),
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

        // the own score only grows in Standard: cut-throat points go to the others, no-score has none
        if (variantOf(state.game) !== 'Standard') return playerModel.score ?? 0;
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

                    if (((!checkSectionClosed(section.toString()) && checkSectionClosedByOthers(section.toString()))
                        || variantOf(state.game) === 'No-score')
                        && sectionHit[section.toString()] > 3) {
                        sectionHit[section.toString()] = 3;
                    }
                }
            }
        });

        return sectionHit;
    }

    // whether this score wins once every number is closed: by the variant, with
    // the points the current visit gives the others in cut-throat
    const checkIfScoreIsHighestScore = (score) => {
        const variant = variantOf(state.game);
        const current = state.game.currentPlayerTurn;
        const given = variant === 'Cut-throat'
            ? cutThroatPoints(state.game, current, state.game.playerModels[current].sectionHit, getCurrentSectionHit())
            : {};
        const others = state.game.players
            .filter(id => id !== current)
            .map(id => (state.game.playerModels[id].score ?? 0) + (given[id] ?? 0));
        return winsWithScore(variant, score, others);
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
        setSaveRequest(request => request + 1);
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
                    winnerSaved,
                    celebrating,
                    quick,
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
            <OneEightyCelebration celebration={nineMarks} onDone={endNineMarks} />
            <WhiteHorse moment={whiteHorse} onDone={endWhiteHorse} />
            <HatTrick moment={hatTrick} onDone={endHatTrick} />
            <ShutOut moment={shutOut} onDone={endShutOut} />
            <Toast ref={toast} position="bottom-right" />
        </Fragment>
    );
};

export default CricketState;
