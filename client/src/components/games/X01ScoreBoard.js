import React, { useContext, useState, useEffect } from 'react';

import GameContext from '../../context/gameContext/gameContext';

import './X01ScoreBoard.css'

const X01ScoreBoard = props => {
    const { player, infos } = props
    const {
        match,
        getCurrentThrowScore,
        error,
        resetError
    } = useContext(GameContext);
    
    const [ score, setScore ] = useState(match.matchPlayerInfo[match.players[match.currentPlayerTurn]].score);

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
    setTimeout(() => {
      resetError();
    }, 12000);
    // eslint-disable-next-line
	},[ error ]);

    return (
        <div className="score-board">
            <div className="points-legs-sets-won">
                <div className="points-container">
                    <div className="points">
                        { match.players[match.currentPlayerTurn] === player ?
                            score === 1 || score < 0 ? 'BUST' : score : infos.score
                        }
                    </div>
                    <div className="player">
                        <span className="player-name">{player}</span>
                        { match.players[match.startingPlayerLeg] === player && (
                            <i className="fas fa-circle player-name-icon active-start-leg"></i>
                        )}
                        { match.players[match.currentPlayerTurn] === player && (
                            <i className="fas fa-circle player-name-icon active-throwing"></i>
                        )}
                    </div>
                </div>
                <div className="legs-container">
                    <div className="legs">
                        LEGS
                    </div>
                    <div className="value">
                        {match.matchPlayerInfo[player].currentSetLegWon}
                    </div>
                </div>
                <div className="sets-container">
                    <div className="sets">
                        SETS
                    </div>
                    <div className="value">
                        {match.matchPlayerInfo[player].setWon}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default X01ScoreBoard