import { useContext, useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';

import X01Context from '../../../utils/x01.context';
import X01DartBoard from './x01.dartboard';
import X01WaysOut from './x01.ways.out';
import ScoreInputBoardHelp from '../common/score.input.board.help';


const BOARD_KEY = 'oche.x01Board';
const readShowBoard = () => {
    try {
        return localStorage.getItem(BOARD_KEY) !== 'hidden';
    } catch {
        return true;
    }
};
const writeShowBoard = (show) => {
    try {
        localStorage.setItem(BOARD_KEY, show ? 'shown' : 'hidden');
    } catch {
        // storage unavailable: the board shows again next time
    }
};

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

    // the score left after the darts entered so far, worked out on every render: a copy in
    // state lagged one render behind, and a quick Enter submitted the score before the last dart
    const score = game.playerModels[game.currentPlayerTurn].score - getCurrentThrowScore();
    // on a phone the board can be hidden to type only; remembered on the device
    const [showBoard, setShowBoard] = useState(() => readShowBoard());
    const toggleBoard = () => {
        setShowBoard(!showBoard);
        writeShowBoard(!showBoard);
    };

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

    const boardHeader = (
        <div className="p-panel-header">
            <span className="p-panel-title">Dartboard</span>
            <Button
                type="button"
                label={showBoard ? 'Type only' : 'Show board'}
                icon={showBoard ? 'pi pi-pencil' : 'pi pi-bullseye'}
                text
                size="small"
                className="d-md-none p-1"
                aria-pressed={!showBoard}
                onClick={toggleBoard}
            />
        </div>
    );

    const visitHeader = (
        <div className="p-panel-header">
            <span className="p-panel-title">{nickname}&apos;s visit</span>
            <ScoreInputBoardHelp label={<span className="d-none d-sm-inline">Tap the board or type</span>} plainSingles compact />
        </div>
    );

    return (
        <div className="row g-4 x01-play">
            <div className="col-12 col-lg-7">
                <Panel headerTemplate={() => boardHeader} className={`h-100 x01-board-panel ${showBoard ? '' : 'is-hidden'}`}>
                    <div className="x01-board-col">
                        <X01DartBoard />
                    </div>
                </Panel>
            </div>
            <div className="col-12 col-lg-5 d-flex flex-column gap-4">
                <Panel headerTemplate={() => visitHeader} className="x01-input">
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

                        <div className="x01-visit-actions">
                        <Button
                            id="submitThrows"
                            type="submit"
                            label="Enter score"
                            icon="pi pi-check"
                            loading={loading.validateThrow}
                            className="justify-content-center x01-enter"
                        />
                        {game.currentLegThrows.length !== 0 &&
                            <Button
                                id="submitReturn"
                                type="submit"
                                label="Undo last visit"
                                icon="pi pi-undo"
                                text
                                size="small"
                                className="justify-content-center x01-undo"
                            />
                        }
                        </div>
                    </form>
                </Panel>
                <Panel header="Ways out" className="x01-ways-panel">
                    <X01WaysOut />
                </Panel>
            </div>
        </div>
    )
}

export default X01ScoreInputBoard
