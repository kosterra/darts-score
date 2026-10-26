import { Fragment, useCallback, useEffect, useRef, useReducer, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { Toast } from 'primereact/toast';

import X01Context from './x01.context';
import GameReducer from './game.reducer';
import OneEightyCelebration from '../components/games/common/one.eighty.celebration';
import GameMoment from '../components/games/common/game.moment';
import { BigFish, BedAndBreakfast, BullFinish, PerfectLeg } from '../components/games/common/x01.moments';
import { x01VisitMoment } from './x01.moments';
import { call, callsForVisit } from './caller';
import X01Service from '../services/x01.service';
import X01TrainingService from '../services/x01.training.service';
import { QuickX01Service, quickPlayersOf } from '../services/quick.game.service';
import { BOT_ID, botDart, botPlayer, botSkill } from './x01.bot';
import { replayX01, visitPoints } from '../rules/x01';
import PlayerService from '../services/player.service';

import {
    normalizeDart,
    validateDartValue,
    dartIsDouble,
    dartIsTriple
} from './game.utils';
import { inModeOf, isBust, outModeOf, startingScoreOf } from './x01.rules';

import { FETCH_GAME_SUCCESS, FETCH_PLAYERS_SUCCESS, SET_GAME, SET_LOADING, UPDATE_CURRENT_THROW } from './constants';
import { t } from './i18n';


const X01State = props => {
    const { id } = useParams();
    // a training against the bot is played like a game, saved apart from the games
    const training = Boolean(props.training);
    // a quick game of the start page: no account, the players only names
    const quick = Boolean(props.quick);
    const Service = quick ? QuickX01Service : training ? X01TrainingService : X01Service;

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
    // one message at a time: a new one replaces the last instead of piling up
    const showError = (summary, detail) => {
        toast.current?.clear();
        toast.current?.show({ severity: 'error', summary, detail, life: 3000 });
    };
    // how each player finishes and scores, for the ways out: { [playerId]: profile }
    const [checkoutProfiles, setCheckoutProfiles] = useState({});
    // bumped after every visit and every undo: the game is saved then
    const [saveRequest, setSaveRequest] = useState(0);
    // the saves run one after the other, in the order of the visits
    const saving = useRef(Promise.resolve());
    // { key, name } while the 180 celebration plays
    const [oneEighty, setOneEighty] = useState(null);
    const endOneEighty = useCallback(() => setOneEighty(null), []);
    // { key, kind, winner, … } while a leg or set win is shown
    const [moment, setMoment] = useState(null);
    const endMoment = useCallback(() => setMoment(null), []);
    // { key, kind, name, … } while a big moment of a visit plays (a high finish, the
    // big fish, a bull finish, the nine-darter, bed and breakfast)
    const [highlight, setHighlight] = useState(null);
    const endHighlight = useCallback(() => setHighlight(null), []);

    // fetch a x01 game from the API
    useEffect(() => {
        setLoading('initGameLoading', true);
        async function fetchX01() {
            try {
                let x01 = await Service.loadX01GameById(id);
                dispatch({ type: FETCH_GAME_SUCCESS, payload: x01 });
                return x01;
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
                    // the bot is no player of the club
                    let player = playerId === BOT_ID ? botPlayer(game.bot) : await PlayerService.getPlayer(playerId);
                    players.push(player);
                }));
                dispatch({ type: FETCH_PLAYERS_SUCCESS, payload: players });
            } catch (error) {
                throw new Error(error);
            }
        }

        fetchX01().then((game) => {
            fetchPlayers(game).then(() => {
                setLoading('initGameLoading', false);
            });
            // the ways out work without them, so a failure only means the usual order
            const people = game.players.filter(playerId => playerId !== BOT_ID);
            if (!quick) PlayerService.loadCheckoutProfiles(people).then(setCheckoutProfiles).catch(() => {});
        }).catch(error => {
            toast.current.show(
                {
                    severity: 'error',
                    summary: t('Load Game'),
                    detail: t('Failed to load X01 game. ') + error.message,
                    life: 3000
                }
            );
            navigate(quick ? '/quick' : '/', { replace: true });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, navigate]);

    // the rules of the player at the oche: with a handicap they differ per player
    const currentInMode = () => inModeOf(state.game, state.game.currentPlayerTurn);
    const currentOutMode = () => outModeOf(state.game, state.game.currentPlayerTurn);
    // nothing scored in this leg yet: the in mode decides whether a dart counts
    const hasNotStarted = (score) => Number(score) === startingScoreOf(state.game, state.game.currentPlayerTurn);

    const updateCurrentThrowManual = (score, value, index) => {
        value = normalizeDart(value);
        if (hasNotStarted(score) && value !== '' && validateDartValue(value)) {
            if (currentInMode() === 'Double In') {
                let startedInDouble = dartIsDouble(value);
                if (!startedInDouble) {
                    value = '0'
                }
            } else if (currentInMode() === 'Master In') {
                let startedInMaster = dartIsDouble(value) || dartIsTriple(value);
                if (!startedInMaster) {
                    value = '0';
                }
            }
        }

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

    const updateCurrentThrowDartBoard = (score, value) => {
        const newCurrentThrow = [...state.game.currentThrow];

        for (let index = 0; index < newCurrentThrow.length; index++) {
            if (hasNotStarted(score) && validateDartValue(value)) {
                if (currentInMode() === 'Double In') {
                    let startedInDouble = dartIsDouble(value);
                    if (!startedInDouble) {
                        value = '0'
                    }
                } else if (currentInMode() === 'Master In') {
                    let startedInMaster = dartIsDouble(value) || dartIsTriple(value);
                    if (!startedInMaster) {
                        value = '0';
                    }
                }
            }

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

    const onClickValidateThrow = currentScore => {
        setLoading('validateThrow', true);

        let currentThrow = [...state.game.currentThrow];

        for (let i = 0; i < currentThrow.length; i++) {
            if (!validateDartValue(currentThrow[i])) {
                showError(t('Check the darts'), t('One or more darts are not valid: use e.g. 20, D16, T19, 25 or 50 (bullseye).'));
                setLoading('validateThrow', false);
                return
            }
        }

        let throwIsValid = validateWholeThrow(currentThrow, currentScore);
        if (!throwIsValid) {
            setLoading('validateThrow', false);
            return
        }

        let roundScore = getCurrentThrowScore();
        let currentLegThrows = [...state.game.currentLegThrows,
        {
            darts: currentThrow,
            playerId: state.game.currentPlayerTurn,
            roundScore: roundScore,
            scoreLeft: currentScore
        }];

        let hasBusted = checkIfScoreIsBusted(currentScore)
        // the big moment of the visit, the biggest one if there are several
        const visitMoment = x01VisitMoment({
            game: state.game,
            playerId: state.game.currentPlayerTurn,
            darts: currentThrow,
            roundScore,
            legThrows: currentLegThrows,
            won: !hasBusted && currentScore === 0,
            busted: hasBusted,
        });
        const thrower = state.players.find(p => p.id === state.game.currentPlayerTurn);
        if (visitMoment?.kind === 'oneEighty') {
            setOneEighty({ key: Date.now(), name: thrower?.nickname ?? '' });
        } else if (visitMoment?.kind === 'checkout') {
            // a high finish: the gold burst of the 180 with the finish on the signs
            setOneEighty({ key: Date.now(), name: thrower?.nickname ?? '', number: String(visitMoment.checkout), words: t('Checkout!'), sign: String(visitMoment.checkout) });
        } else if (visitMoment) {
            setHighlight({ key: Date.now(), name: thrower?.nickname ?? '', playerIndex: state.game.players.indexOf(state.game.currentPlayerTurn), ...visitMoment });
        }
        // the game with this visit, worked out by the rules engine from all its visits
        const visits = [...(state.game.visits ?? []), { player: state.game.currentPlayerTurn, darts: currentThrow.filter(dart => dart.trim() !== '') }];
        const next = replayX01({ ...state.game, visits });
        const hasWonLeg = !hasBusted && currentScore === 0;
        const hasWonSet = hasWonLeg && next.setsPlayed > state.game.setsPlayed;
        dispatch({ type: SET_GAME, payload: next });

        if (!next.hasWinner && hasWonLeg) setMoment(buildMoment(hasWonSet, next.currentPlayerTurn));
        // the caller, when it is switched on: the visit, and what the next player requires
        const nextId = next.currentPlayerTurn;
        call(callsForVisit(
            { score: hasBusted ? 0 : roundScore, busted: hasBusted, wonLeg: hasWonLeg, wonSet: hasWonSet, wonMatch: hasWonLeg && next.hasWinner },
            next.hasWinner ? null : {
                name: state.players.find(p => p.id === nextId)?.nickname ?? '',
                score: next.playerModels[nextId]?.score ?? 0,
                outMode: outModeOf(next, nextId),
                legStarts: hasWonLeg,
            },
        ));
        setLoading('validateThrow', false);
        setSaveRequest(request => request + 1);
    }

    // the bot's turn in a training: dart by dart on the board, like a player
    // tapping it, then the visit is sent; it waits while a moment plays
    const botSkillOf = state.game.bot ? botSkill(state.game.bot) : null;
    useEffect(() => {
        const game = state.game;
        if (!training || !botSkillOf || game.currentPlayerTurn !== BOT_ID || !game.gameIsRunning || game.hasWinner) return undefined;
        if (state.loading.initGameLoading || state.loading.validateThrow || moment || highlight || oneEighty) return undefined;
        const thrown = (game.currentThrow ?? []).filter(dart => dart !== '').length;
        const left = game.playerModels[BOT_ID].score - getCurrentThrowScore();
        const timer = setTimeout(() => {
            if (!checkCanThrowMoreDarts(left)) {
                onClickValidateThrow(left);
                return;
            }
            const { dart } = botDart({
                score: left,
                dartsLeft: 3 - thrown,
                outMode: currentOutMode(),
                inMode: currentInMode(),
                started: !hasNotStarted(left),
                skill: botSkillOf,
            });
            updateCurrentThrowDartBoard(left, dart);
            // a checkout: the winning dart lands and is seen before the visit is sent
        }, thrown === 0 ? 1100 : left === 0 ? 1800 : 750);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.game, state.loading, moment, highlight, oneEighty, training]);

    // the game as it is after the visit (or undo) that asked for it
    useEffect(() => {
        if (!saveRequest) return;
        const game = state.game;
        saving.current = saving.current
            .then(() => Service.updateX01Game(game))
            .then(saved => { if (!saved) throw new Error(t('not saved')); })
            .catch(() => showError(t('Not saved'), t('The last visit could not be saved. Check the connection: the next visit saves everything.')));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveRequest]);

    /**
     * What the banner for a won leg or set shows, from the state before this
     * visit was applied: the winner's count goes up by one.
     */
    const buildMoment = (hasWonSet, nextStarterId) => {
        const { game } = state;
        const nameOf = (id) => state.players.find(p => p.id === id)?.nickname ?? '';
        const winnerId = game.currentPlayerTurn;
        const countOf = (id) => {
            const model = game.playerModels[id];
            const count = hasWonSet ? model.setsWon : model.currentSetLegsWon;
            return count + (id === winnerId ? 1 : 0);
        };
        const multipleSets = game.numberOfSets > 1;
        return {
            key: Date.now(),
            kind: hasWonSet ? 'set' : 'leg',
            winner: nameOf(winnerId),
            title: hasWonSet
                ? t('wins set {{currentSet}}', { currentSet: game.currentSet })
                : multipleSets ? t('wins leg {{leg}} of set {{set}}', { leg: game.currentSetLeg, set: game.currentSet }) : t('wins leg {{leg}}', { leg: game.currentSetLeg }),
            standings: game.players.map(id => ({ name: nameOf(id), value: countOf(id) })),
            next: hasWonSet ? t('Set {{value}}', { value: game.currentSet + 1 }) : t('Leg {{value}}', { value: game.currentSetLeg + 1 }),
            starter: nameOf(nextStarterId),
        };
    };

    const validateWholeThrow = (values, currentScore) => {
        let getWhiteSpaces = values.filter(value => value.trim() === '');

        if (
            (currentScore > 1 && getWhiteSpaces.length) ||
            values[0] === '' ||
            (values[1] === '' && values[2] !== '')
        ) {
            showError(t('Check the darts'), t('Enter a value for each dart; 0 for a miss.'));
            return false;
        }

        return true;
    }

    const checkIfScoreIsBusted = (currentScore) => {
        // a won game shows its end: nothing is a bust any more
        if (state.game.hasWinner) return false;
        return isBust(currentScore, state.game.currentThrow, currentOutMode());
    }

    const checkCanThrowMoreDarts = (currentScore) => {
        const dartsThrown = state.game.currentThrow.filter(d => d.trim() !== '').length;
        return dartsThrown < 3 && currentScore > 0 && !checkIfScoreIsBusted(currentScore);
    };

    // the points of the visit being entered, as the rules count them (with the club's bull)
    const getCurrentThrowScore = () => visitPoints(state.game.currentThrow.filter(dart => validateDartValue(dart)), state.game.bull);

    // undo: the game without its last visit
    const onClickReturnToPreviousPlayer = () => {
        if (!state.game.visits?.length) return;
        dispatch({ type: SET_GAME, payload: replayX01({ ...state.game, visits: state.game.visits.slice(0, -1) }) });
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
            <X01Context.Provider
                value={{
                    // a moment of the winning visit plays to its end before the statistics page
                    celebrating: Boolean(oneEighty || highlight),
                    training,
                    quick,
                    // the bot is at the oche: the input waits
                    botThrowing: training && state.game.currentPlayerTurn === BOT_ID && !state.game.hasWinner,
                    game: state.game,
                    players: state.players,
                    checkoutProfiles,
                    loading: state.loading,
                    onClickValidateThrow,
                    updateCurrentThrowManual,
                    updateCurrentThrowDartBoard,
                    getCurrentThrowScore,
                    onClickReturnToPreviousPlayer,
                    checkCanThrowMoreDarts,
                    checkIfScoreIsBusted
                }}
            >
                {props.children}
            </X01Context.Provider>
            <OneEightyCelebration celebration={oneEighty} onDone={endOneEighty} />
            <BigFish moment={highlight?.kind === 'bigFish' ? highlight : null} onDone={endHighlight} />
            <PerfectLeg moment={highlight?.kind === 'nineDarter' ? highlight : null} onDone={endHighlight} />
            <BullFinish moment={highlight?.kind === 'bull' ? highlight : null} onDone={endHighlight} />
            <BedAndBreakfast moment={highlight?.kind === 'bedAndBreakfast' ? highlight : null} onDone={endHighlight} />
            <GameMoment moment={moment} onDone={endMoment} />
            <Toast ref={toast} position="bottom-right" />
        </Fragment>
    );
};

export default X01State;
