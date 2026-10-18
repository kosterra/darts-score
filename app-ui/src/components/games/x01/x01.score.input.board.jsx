import { useContext, useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

import X01Context from '../../../utils/x01.context';
import X01DartBoard from './x01.dartboard';
import ScoreInputBoardHelp from '../common/score.input.board.help';
import { startingScoreOf } from '../../../utils/x01.rules';


const X01ScoreInputBoard = () => {
    const {
        game,
        updateCurrentThrowManual,
        onClickValidateThrow,
        getCurrentThrowScore,
        onClickReturnToPreviousPlayer,
        checkCanThrowMoreDarts,
        checkIfScoreIsBusted,
        players,
        loading
    } = useContext(X01Context);

    const [score, setScore] = useState(startingScoreOf(game, game.currentPlayerTurn));

    // s, d and t work as well: the dart is written in capitals once typed
    const keyfilterPattern = /^[SDTsdt0-9]{1,3}$/;

    const handlers = {
        submitThrows: handleSubmitThrows,
        submitReturn: handleSubmitReturn,
    }

    const submitHandler = (e) => {
        const { id } = e.nativeEvent.submitter;
        handlers[id](e);
    };

    function handleSubmitThrows(e) {
        e.preventDefault();
        onClickValidateThrow(score);
        e.target.reset();
    }

    function handleSubmitReturn(e) {
        e.preventDefault();
        onClickReturnToPreviousPlayer();
        e.target.reset();
    }

    const validateInput = (event, validatePattern) => {
        const target = event.target;
        // validatePattern is the result of the regex against the whole input string
        if (validatePattern) {
            let throwIndex = Number(target.name.split('-')[1]) - 1;
            if (target.value.length > 0) {
                updateCurrentThrowManual(score, target.value, throwIndex);
            } else {
                updateCurrentThrowManual(score, '', throwIndex);
            }
        }
    };

    // Enter submits the visit, also after darts were tapped on the dartboard; in a
    // dart field the browser submits the form itself
    useEffect(() => {
        const clickEnterSubmitForm = (e) => {
            if (e.key !== 'Enter' || e.target.closest?.('form, button, [role="dialog"]')) return;
            document.getElementById('submitThrows')?.click();
        }

        document.addEventListener('keyup', clickEnterSubmitForm);

        return () => {
            document.removeEventListener('keyup', clickEnterSubmitForm);
        }
    }, []);

    useEffect(() => {
        let totalScore = getCurrentThrowScore();
        let currentPlayerScore = game.playerModels[game.currentPlayerTurn].score;
        let newCurrentScore = currentPlayerScore - totalScore;
        setScore(newCurrentScore);

        // eslint-disable-next-line
    }, [game.currentThrow]);

    if (game.hasWinner) return null;

    // the dart fields: the second and third only while the visit can go on
    const darts = game.currentThrow;
    const shown = [
        true,
        checkCanThrowMoreDarts(score) || darts[1].trim() !== '' || (darts[1].trim() === '' && darts[2].trim() !== ''),
        checkCanThrowMoreDarts(score) || darts[2].trim() !== '',
    ];
    const visitScore = getCurrentThrowScore();
    const busted = checkIfScoreIsBusted(score);
    const nickname = players.find(player => player.id === game.currentPlayerTurn)?.nickname ?? '';

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col col-12 col-md-8 col-xl-5 col-xxl-4 d-flex justify-content-center justify-content-xxl-start">
                    <X01DartBoard />
                </div>
                <div className="col col-12 col-md-4 col-xl-3 col-xxl-3">
                    <div className="x01-input">
                        <div className="x01-input-head">
                            <span className="text-default fw-semibold">{nickname}&apos;s visit</span>
                            <ScoreInputBoardHelp label="Tap the board or type" plainSingles compact />
                        </div>
                        <form onSubmit={submitHandler}>
                            <div className="x01-darts">
                                {shown.map((visible, index) => visible && (
                                    <label key={index} className="x01-dart-field">
                                        <span className="x01-dart-label">Dart {index + 1}</span>
                                        <InputText
                                            name={`d-${index + 1}`}
                                            placeholder={index === 0 ? 'e.g. T20' : ''}
                                            value={darts[index]}
                                            keyfilter={keyfilterPattern}
                                            validateOnly
                                            onInput={validateInput}
                                            autoComplete="off"
                                            className="x01-dart-input"
                                        />
                                        {darts[index] !== '' &&
                                            <button
                                                type="button"
                                                className="x01-dart-clear"
                                                title="Clear this dart"
                                                aria-label={`Clear dart ${index + 1}`}
                                                onClick={() => updateCurrentThrowManual(score, '', index)}
                                            >
                                                <i className="pi pi-times" aria-hidden="true" />
                                            </button>
                                        }
                                    </label>
                                ))}
                            </div>

                            <div className={`x01-visit-total ${busted ? 'is-bust' : ''}`} aria-live="polite">
                                {busted
                                    ? <span><strong>Bust</strong> · the score stays at {game.playerModels[game.currentPlayerTurn].score}</span>
                                    : <span>Visit <strong>{visitScore}</strong> · leaves <strong>{score}</strong></span>
                                }
                            </div>

                            <Button
                                id="submitThrows"
                                type="submit"
                                label="Enter score"
                                icon="pi pi-check"
                                loading={loading.validateThrow}
                                className="w-100 justify-content-center"
                            />
                            {game.currentLegThrows.length !== 0 &&
                                <Button
                                    id="submitReturn"
                                    type="submit"
                                    label="Undo last visit"
                                    icon="pi pi-undo"
                                    text
                                    size="small"
                                    className="w-100 justify-content-center mt-1"
                                />
                            }
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default X01ScoreInputBoard
