import { Fragment, useCallback, useEffect, useRef, useReducer, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { Toast } from 'primereact/toast';

import CricketContext from './cricket.context';
import GameReducer from './game.reducer';
import ClubCricketService from '../services/cricket.service';
import { QuickCricketService, quickPlayersOf } from '../services/quick.game.service';
import { allClosed, closedForAll, replayCricket, scoreAfter, scoreWins, sectionHitAfter } from '../rules/cricket';
import PlayerService from '../services/player.service';
import OneEightyCelebration from '../components/games/common/one.eighty.celebration';
import WhiteHorse from '../components/games/common/white.horse';
import { HatTrick, ShutOut } from '../components/games/cricket/cricket.moments';

import { validateDartValue } from './game.utils';

import { FETCH_GAME_SUCCESS, FETCH_PLAYERS_SUCCESS, SET_GAME, SET_LOADING, UPDATE_CURRENT_THROW } from './constants';
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

    const [state, dispatch] = useReducer(GameReducer, initialState);

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
        celebrateVisit(playerId, currentThrow, sectionHit);

        // the game with this visit, worked out by the rules engine from all its visits
        const visits = [...(state.game.visits ?? []), { player: playerId, darts: currentThrow.filter(dart => dart.trim() !== '') }];
        dispatch({ type: SET_GAME, payload: replayCricket({ ...state.game, visits }) });
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

    // the score and marks of the player at the oche with the darts typed so far
    const getCurrentThrowScore = () => scoreAfter(state.game, state.game.currentThrow);
    const getCurrentSectionHit = () => sectionHitAfter(state.game, state.game.currentThrow);

    // whether this score wins once every number is closed, by the variant
    const checkIfScoreIsHighestScore = (score) => scoreWins(state.game, score, getCurrentSectionHit());
    const checkIfAllSectionsClosed = (sectionHit) => allClosed(sectionHit);
    const checkSectionClosed = (number) => closedForAll(state.game, number);

    // undo: the game without its last visit
    const onClickReturnToPreviousPlayer = () => {
        if (!state.game.visits?.length) return;
        dispatch({ type: SET_GAME, payload: replayCricket({ ...state.game, visits: state.game.visits.slice(0, -1) }) });
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
