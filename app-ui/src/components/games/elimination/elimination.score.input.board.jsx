import { useContext, useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { FaUndo } from "react-icons/fa";
import { FaPaperPlane } from "react-icons/fa6";

import EliminationContext from '../../../utils/elimination.context';
import EliminationService from '../../../services/elimination.service';
import EliminationDartBoard from './elimination.dartboard';
import ScoreInputBoardHelp from '../common/score.input.board.help';

const EliminationScoreInputBoard = () => {
    const {
        game,
        updateCurrentThrowManual,
        onClickValidateThrow,
        getCurrentThrowScore,
        onClickReturnToPreviousPlayer,
        checkCanThrowMoreDarts,
        loading
    } = useContext(EliminationContext);

    const [currentScore, setCurrentScore] = useState(0);
    const [pendingSave, setPendingSave] = useState(false);

    const keyfilterPattern = /^[SDT0-9]{1,3}$/;

    const validateInput = (event, validatePattern) => {
        const target = event.target;
        if (validatePattern) {
            const throwIndex = Number(target.name.split('-')[1]) - 1;
            updateCurrentThrowManual(currentScore, target.value.length > 0 ? target.value : '', throwIndex);
        }
    };

    const handleSubmitThrows = (e) => {
        e.preventDefault();
        onClickValidateThrow(currentScore);
        setPendingSave(true);
        e.target.reset();
    };

    const handleUndo = () => {
        onClickReturnToPreviousPlayer();
        setPendingSave(true);
    };

    // Save game to API whenever currentPlayerTurn changes (i.e. after a throw is committed)
    // or when the game gets a winner
    useEffect(() => {
        if (pendingSave) {
            setPendingSave(false);
            EliminationService.updateEliminationGame(game);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.currentPlayerTurn, game.hasWinner]);

    // Recalculate the displayed current score whenever the throw changes
    useEffect(() => {
        if (!game.playerModels || !game.currentPlayerTurn) return;
        const throwScore = getCurrentThrowScore();
        const playerScore = game.playerModels[game.currentPlayerTurn]?.score ?? 0;
        setCurrentScore(playerScore + throwScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.currentThrow]);

    // Keyboard shortcut: Enter submits
    useEffect(() => {
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                document.getElementById('submitThrows')?.click();
            }
        };
        document.addEventListener('keyup', handleEnter);
        return () => document.removeEventListener('keyup', handleEnter);
    }, []);

    const d1 = game.currentThrow?.[0] ?? '';
    const d2 = game.currentThrow?.[1] ?? '';
    const d3 = game.currentThrow?.[2] ?? '';
    const showD2 = checkCanThrowMoreDarts(currentScore) || d2.trim() !== '' || (d2.trim() === '' && d3.trim() !== '');
    const showD3 = checkCanThrowMoreDarts(currentScore) || d3.trim() !== '';
    const canUndo = (game.allThrows?.length ?? 0) > 0;

    if (game.hasWinner) return null;

    return (
        <div className="container mt-4">
                    <div className="row justify-content-center">
                        <div className="col col-12 col-md-8 col-xl-5 col-xxl-4 d-flex justify-content-center justify-content-xxl-start">
                            <EliminationDartBoard />
                        </div>
                        <div className="col col-12 col-md-4 col-xl-3 col-xxl-2 d-flex flex-column justify-content-start gap-3">
                            <div className="d-flex flex-column gap-1">
                                <ScoreInputBoardHelp />
                                <form className="mt-1" onSubmit={handleSubmitThrows}>
                                    <div className="d-flex flex-column gap-3">
                                        <div className="d-flex flex-column gap-2">
                                            {/* Dart 1 — always visible */}
                                            <div className="p-inputgroup flex-1">
                                                <InputText
                                                    name="d-1"
                                                    placeholder="D1"
                                                    value={d1}
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
                                                    onClick={() => updateCurrentThrowManual(currentScore, '', 0)}
                                                />
                                            </div>

                                            {/* Dart 2 */}
                                            {showD2 && (
                                                <div className="p-inputgroup flex-1">
                                                    <InputText
                                                        name="d-2"
                                                        placeholder="D2"
                                                        value={d2}
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
                                                        onClick={() => updateCurrentThrowManual(currentScore, '', 1)}
                                                    />
                                                </div>
                                            )}

                                            {/* Dart 3 */}
                                            {showD3 && (
                                                <div className="p-inputgroup flex-1">
                                                    <InputText
                                                        name="d-3"
                                                        placeholder="D3"
                                                        value={d3}
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
                                                        onClick={() => updateCurrentThrowManual(currentScore, '', 2)}
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
                                                    title="Submit throw"
                                                >
                                                    <FaPaperPlane />
                                                </Button>
                                            )}
                                            {canUndo && (
                                                <Button
                                                    type="button"
                                                    severity="danger"
                                                    onClick={handleUndo}
                                                    title="Undo last throw"
                                                >
                                                    <FaUndo />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
    );
};

export default EliminationScoreInputBoard;
