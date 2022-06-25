import React, { useContext, useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';

import GameContext from '../../utils/GameContext';
import Checkout from './Checkout';
import Input from '../shared/form/Input';
import Spinner from '../shared/UIElement/Spinner';
import Modal from '../shared/UIElement/Modal';
import savePlayersData from '../../utils/SavePlayerData';
import DartBoard from './DartBoard';
import dataModels from '../../models/DataModels';
import checkout from '../../utils/Checkout';

const ScoreInputBoard = props => {
    const navigate = useNavigate();
    const {
        match,
        updateCurrentThrowManual,
        onClickValidateThrow,
        getCurrentThrowScore,
        onClickReturnToPreviousPlayer,
        resetGame,
        initNewGame,
        loading,
        error,
        resetError
    } = useContext(GameContext);

    const [ score, setScore ] = useState(match.matchPlayerInfo[match.players[match.currentPlayerTurn]].score);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
		const clickEnterSubmitForm = (e) => {
			if(e.key === 'Enter') {
				document.getElementById('submit-throws').click();
			}
		}

		document.addEventListener('keyup', clickEnterSubmitForm);

		return () => {
			document.removeEventListener('keyup', clickEnterSubmitForm);
		}
	}, [])

	useEffect(() => {
    let totalScore = getCurrentThrowScore();

    let currentPlayer = match.players[match.currentPlayerTurn];
    let currentPlayerScore = match.matchPlayerInfo[currentPlayer].score;

    let newCurrentScore = currentPlayerScore - totalScore;
    setScore(newCurrentScore);

    // eslint-disable-next-line
	},[ match.currentThrow ]);
	
	useEffect(() => {
		let currentPlayer = match.players[match.currentPlayerTurn];
		if(match.hasWinner) {
            savePlayersData(match, currentPlayer)
        }

		// eslint-disable-next-line
	}, [match.hasWinner])

	useEffect(() => {
    setTimeout(() => {
      resetError();
    }, 3000);
    // eslint-disable-next-line
	},[ error ]);

	const onChange = (e) => {
		let throwIndex = Number(e.target.name.split('-')[1]) - 1;
        updateCurrentThrowManual(score, e.target.value, throwIndex);
	};

    const onSubmit = (e) => {
		e.preventDefault();
		onClickValidateThrow(score);
	};

	const onNewGame = e => {
		resetGame();
		navigate("/", { replace: true });
	}

	const onFinishGame = e => {
		resetGame();
		navigate("/", { replace: true });
	}

	const onRestartGame = e => {
        let newMatchSetup = {...match};

		newMatchSetup.hasWinner = false;
		newMatchSetup.startingPlayerLeg = 0;
		newMatchSetup.startingPlayerSet = 0;
		newMatchSetup.currentPlayerTurn = 0;
		newMatchSetup.allLegsThrows = [];

		newMatchSetup.matchPlayerInfo = {};
		newMatchSetup.players.forEach(player => {
			let playerDataModel = {...dataModels.playerMatchModel};
			playerDataModel.score = Number(newMatchSetup.gameType);
			newMatchSetup.matchPlayerInfo[player] = playerDataModel;
		})

		initNewGame(newMatchSetup);
	}
  
  return (
    <Fragment>
        {showModal && (
            <Modal 
                isDiv
                contentClass={'modal-game-infos-text'}
                header={'How to manually add a dart score?'}
                footer={(
                    <Fragment>
                        <button className="modal-btn" onClick={() => setShowModal(false)}>GOT IT</button>
                    </Fragment>
                )}
            >
                <p>If you missed, simply enter 0.</p>
                <p>For any other scores add:</p>
                <p>"S" (for a single), "D" (for a double)<br />
                or "T" (for a treble) before your score.<br />
                So "D10" scores 20 points, "T20" scores 60 ...</p>
                <p>Note that:</p>
                <p>The inner BULLSEYE (50 points) = "D25"<br /> 
                and the outer BULLSEYE (25 points) = "S25".</p>
                
            </Modal>
        )}
        {match.hasWinner && (
            <div className="game-victory-container">
                <span className="game-victory-message">
                    <span className="message">{match.players[match.currentPlayerTurn]} wins</span>
                    <i className="fas fa-trophy" title="trophy"></i>
                </span>
                <div className="game-victory-buttons">
                    <button onClick={onRestartGame} className="game-new-game-btn">
                        <i className="fas fa-sync-alt" title='Send'></i>
                        PLAY AGAIN
                    </button>
                    <button onClick={onNewGame} className="outline">
                        <i className="fas fa-plus" title='Send'></i>
                        NEW GAME
                    </button>
                    <button onClick={onFinishGame} className="outline">
                        <i className="fas fa-home" title='Send'></i>
                        BACK HOME
                    </button>
                </div>
            </div>
        )}
        {!match.hasWinner && (
            <div className="score-input-board">
                <div className="score-input-board-left-column">
                    <DartBoard />
                </div>
                <div className="score-input-board-right-column">
                    <form className="score-enter-form" onSubmit={onSubmit}>
                        <div className="score-enter-form-title">
                            <span>Click the dartboard or enter score{` `}</span>
                            <i onClick={() => setShowModal(true)} className="fas fa-question-circle" style={{cursor: "pointer"}}></i>
                        </div>
                        <div className="score-enter-wrapper">
                            <div className="score-enter-fields">
                                <div className="score-enter-input">
                                    <Fragment>
                                        <Input
                                            element="input"
                                            type="text"
                                            name="dart-1"
                                            htmlFor="dart-1"
                                            label="D1"
                                            value={match.currentThrow[0]}
                                            placeholder="Enter score"
                                            onChange={onChange}
                                            classNameLabel="label"
                                        />
                                        <i onClick={() => updateCurrentThrowManual(score, '', 0)} className="fas fa-minus-circle delete-dart-input"></i>
                                    </Fragment>
                                </div>
                                <div className="score-enter-input">
                                    {((score !== 1 && score > 0) ||
                                        match.currentThrow[1].trim() !== '' ||
                                        (match.currentThrow[1].trim() === '' && match.currentThrow[2].trim() !== '')) && (
                                        <Fragment>
                                            <Input
                                                element="input"
                                                type="text"
                                                name="dart-2"
                                                htmlFor="dart-2"
                                                label="D2"
                                                value={match.currentThrow[1]}
                                                placeholder="Enter score"
                                                onChange={onChange}
                                                classNameLabel="label"
                                            />
                                            <i onClick={() => updateCurrentThrowManual(score, '', 1)} className="fas fa-minus-circle delete-dart-input"></i>
                                        </Fragment>
                                    )}
                                </div>
                                <div className="score-enter-input">
                                    {((score !== 1 && score > 0) || match.currentThrow[2].trim() !== '') && (
                                        <Fragment>
                                            <Input
                                                element="input"
                                                type="text"
                                                name="dart-3"
                                                htmlFor="dart-3"
                                                label="D3"
                                                value={match.currentThrow[2]}
                                                placeholder="Enter score"
                                                onChange={onChange}
                                                classNameLabel="label"
                                            />
                                            <i onClick={() => updateCurrentThrowManual(score, '', 2)} className="fas fa-minus-circle delete-dart-input"></i>
                                        </Fragment>
                                    )}
                                </div>
                            </div>
                            <div className="score-enter-buttons">
                                {loading.validateThrow ? (
                                    <Spinner
                                        spinnerContClassName={'spinner-cont-large'}
                                        spinnerImgClassName={'spinnerSmall'}
                                    />
                                ) : (
                                    <button id="submit-throws" type="submit">
                                        <i className="fas fa-paper-plane" title='Send'></i>
                                    </button>
                                )}
                                {match.currentLegThrows.length !== 0 && (
                                    <button 
                                        onClick={onClickReturnToPreviousPlayer} 
                                        className="score-enter-buttons-undo" 
                                        type="button"
                                    >
                                        <i className="fas fa-undo-alt" title='Undo'></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && error.errorFor === 'throw-validation' && <p className="game__throw-validaion-error">{error.message}</p>}
                    </form>
                    {checkout[score] && (
                        <Checkout score={score} />
                    )}
                </div>
            </div>
        )}
    </Fragment>
  )
}

export default ScoreInputBoard