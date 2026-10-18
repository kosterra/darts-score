import { useContext, useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { FaUndo } from "react-icons/fa";
import { FaPaperPlane } from "react-icons/fa6";

import X01Context from '../../../utils/x01.context';
import X01DartBoard from './x01.dartboard';
import Checkout from './x01.checkout';
import checkout from '../../../utils/checkout';
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

    return (
        <div className="container mt-4">
                    <div className="row justify-content-center">
                        <div className="col col-12 col-md-8 col-xl-5 col-xxl-4 d-flex justify-content-center justify-content-xxl-start">
                            <X01DartBoard />
                        </div>
                        <div className="col col-12 col-md-4 col-xl-3 col-xxl-2 d-flex flex-column justify-content-start gap-3">
                            <div className="d-flex flex-column gap-1">
                                <ScoreInputBoardHelp />
                                <form className="mt-1" onSubmit={submitHandler}>
                                    <div className="d-flex flex-column gap-3">
                                        <div className="d-flex flex-column gap-2">
                                            <div className="p-inputgroup flex-1">
                                                <InputText
                                                    name="d-1"
                                                    placeholder="D1"
                                                    value={game.currentThrow[0]}
                                                    keyfilter={keyfilterPattern}
                                                    validateOnly
                                                    onInput={validateInput}
                                                    className="focused-bg-only"
                                                />
                                                <Button
                                                    type="button"
                                                    icon="pi pi-times"
                                                    title="Clear this dart"
                                                    aria-label="Clear this dart"
                                                    severity="danger"
                                                    onClick={() => updateCurrentThrowManual(score, '', 0)}
                                                />
                                            </div>
                                            {(checkCanThrowMoreDarts(score) || game.currentThrow[1].trim() !== '' || (game.currentThrow[1].trim() === '' && game.currentThrow[2].trim() !== '')) && (
                                                <div className="p-inputgroup flex-1">
                                                    <InputText
                                                        name="d-2"
                                                        placeholder="D2"
                                                        value={game.currentThrow[1]}
                                                        keyfilter={keyfilterPattern}
                                                        validateOnly
                                                        onInput={validateInput}
                                                        className="focused-bg-only"
                                                    />
                                                    <Button
                                                        type="button"
                                                        icon="pi pi-times"
                                                        title="Clear this dart"
                                                        aria-label="Clear this dart"
                                                        severity="danger"
                                                        onClick={() => updateCurrentThrowManual(score, '', 1)}
                                                    />
                                                </div>
                                            )}
                                            {(checkCanThrowMoreDarts(score) || game.currentThrow[2].trim() !== '') && (
                                                <div className="p-inputgroup flex-1">
                                                    <InputText
                                                        name="d-3"
                                                        placeholder="D3"
                                                        value={game.currentThrow[2]}
                                                        keyfilter={keyfilterPattern}
                                                        validateOnly
                                                        onInput={validateInput}
                                                        className="focused-bg-only"
                                                    />
                                                    <Button
                                                        type="button"
                                                        icon="pi pi-times"
                                                        title="Clear this dart"
                                                        aria-label="Clear this dart"
                                                        severity="danger"
                                                        onClick={() => updateCurrentThrowManual(score, '', 2)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="d-flex gap-2">
                                            {loading.validateThrow ? (
                                                <Button disabled>
                                                    <ProgressSpinner
                                                        style={{ width: '20px', height: '20px' }}
                                                        strokeWidth="8"
                                                        fill="var(--surface-ground)"
                                                        animationDuration=".8s"
                                                    />
                                                    <span className="visually-hidden">Loading...</span>
                                                </Button>
                                            ) : (
                                                <Button
                                                    id="submitThrows"
                                                    type="submit"
                                                    severity="primary"
                                                >
                                                    <FaPaperPlane />
                                                </Button>
                                            )}
                                            {game.currentLegThrows.length !== 0 && (
                                                <Button
                                                    id="submitReturn"
                                                    severity="danger"
                                                    type="submit"
                                                >
                                                    <FaUndo />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                            {checkout[score] && (
                                <Checkout score={score} />
                            )}
                        </div>
                    </div>
                </div>
    )
}

export default X01ScoreInputBoard