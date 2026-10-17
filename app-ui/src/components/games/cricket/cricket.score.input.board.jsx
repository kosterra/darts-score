import { useContext } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { FaPaperPlane } from "react-icons/fa6";
import { FaUndo } from "react-icons/fa";


import CricketContext from '../../../utils/cricket.context';
import CricketService from '../../../services/cricket.service';
import CricketDartBoard from './cricket.dartboard';
import ScoreInputBoardHelp from '../common/score.input.board.help';


const CricketScoreInputBoard = () => {
    const {
        game,
        updateCurrentThrowManual,
        onClickValidateThrow,
        getCurrentThrowScore,
        getCurrentSectionHit,
        onClickReturnToPreviousPlayer,
        checkIfAllSectionsClosed,
        checkIfScoreIsHighestScore,
        loading
    } = useContext(CricketContext);

    const keyfilterPattern = /^[SDT0-9]{1,3}$/;

    const handleThrowSubmit = (e) => {
        e.preventDefault();
        onClickValidateThrow(getCurrentThrowScore(), getCurrentSectionHit());
        CricketService.updateCricketGame(game);
        e.target.reset();
    };

    const handleReturnSubmit = (e) => {
        e.preventDefault();
        onClickReturnToPreviousPlayer();
        CricketService.updateCricketGame(game);
        e.target.reset();
    };

    const renderInput = (index) => {
        const value = game.currentThrow[index] || '';
        const shouldRender = value !== '' || (!checkIfAllSectionsClosed(getCurrentSectionHit()) || !checkIfScoreIsHighestScore(getCurrentThrowScore()));
        if (!shouldRender) return null;

        return (
            <div className="p-inputgroup flex-1" key={`throw-${index}`}>
                <InputText
                    name={`d-${index + 1}`}
                    placeholder={`D${index + 1}`}
                    value={value}
                    keyfilter={keyfilterPattern}
                    validateOnly
                    onInput={(e) => updateCurrentThrowManual(e.target.value, index)}
                    className="focused-bg-only"
                />
                <Button
                    type="button"
                    icon="pi pi-times"
                    title="Clear this dart"
                    aria-label="Clear this dart"
                    severity="danger"
                    onClick={() => updateCurrentThrowManual('', index)}
                />
            </div>
        );
    };

    if (game.hasWinner) return null;

    return (
        <div className="container mt-4">
                <div className="row justify-content-center">
                    <div className="col col-12 col-md-8 col-xl-5 col-xxl-4 d-flex justify-content-center justify-content-xxl-start">
                        <CricketDartBoard />
                    </div>
                    <div className="col col-12 col-md-4 col-xl-3 col-xxl-2 d-flex flex-column justify-content-start gap-3">
                        <ScoreInputBoardHelp />
                        <form className="mt-1" onSubmit={handleThrowSubmit}>
                            <div className="d-flex flex-column gap-3">
                                <div className="d-flex flex-column gap-2">
                                    {[0, 1, 2].map(renderInput)}
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
                                            type="submit"
                                            severity="primary"
                                        >
                                            <FaPaperPlane />
                                        </Button>
                                    )}
                                    {game.allThrows.length > 0 && (
                                        <Button
                                            type="button"
                                            severity="danger"
                                            onClick={handleReturnSubmit}
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
    );
};

export default CricketScoreInputBoard;
