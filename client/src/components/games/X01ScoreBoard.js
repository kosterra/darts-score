import React, { useContext, useState, useEffect } from 'react';
import GameContext from '../../utils/GameContext';

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

                <div className="legs-sets-wrapper">
                    <div className="legs-sets-container legs-container">
                        <div className="legs-sets legs">
                            LEGS
                        </div>
                        {match.legMode === 'Best of' &&
                            <div className="value">
                                {[...Array(match.matchPlayerInfo[player].currentSetLegWon)].map((e, i) => (
                                    <i key={`leg-filled-${i}`} className="fas fa-circle"></i>
                                ))}
                                {[...Array(Math.round(match.numberOfLegs / 2) - match.matchPlayerInfo[player].currentSetLegWon)].map((e, i) => (
                                    <i key={`leg-unfilled-${i}`} className="far fa-circle"></i>
                                ))}
                            </div>
                        }
                        {match.legMode === 'First to' &&
                            <div className="value">
                                {[...Array(match.matchPlayerInfo[player].currentSetLegWon)].map((e, i) => (
                                    <i key={`set-filled-${i}`} className="fas fa-circle"></i>
                                ))}
                                {[...Array(match.numberOfLegs - match.matchPlayerInfo[player].currentSetLegWon)].map((e, i) => (
                                    <i key={`leg-unfilled-${i}`} className="far fa-circle"></i>
                                ))}
                            </div>
                        }
                    </div>
                
                    <div className="legs-sets-container sets-container">
                        <div className="legs-sets sets">
                            SETS
                        </div>
                        {match.setMode === 'Best of' &&
                            <div className="value">
                                {[...Array(match.matchPlayerInfo[player].setWon)].map((e, i) => (
                                    <i key={`set-filled-${i}`} className="fas fa-circle"></i>
                                ))}
                                {[...Array(Math.round(match.numberOfSets / 2) - match.matchPlayerInfo[player].setWon)].map((e, i) => (
                                    <i key={`set-unfilled-${i}`} className="far fa-circle"></i>
                                ))}
                            </div>
                        }
                        {match.setMode === 'First to' &&
                            <div className="value">
                                {[...Array(match.matchPlayerInfo[player].setWon)].map((e, i) => (
                                    <i key={`set-filled-${i}`} className="fas fa-circle"></i>
                                ))}
                                {[...Array(match.numberOfSets - match.matchPlayerInfo[player].setWon)].map((e, i) => (
                                    <i key={`set-unfilled-${i}`} className="far fa-circle"></i>
                                ))}
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

export default X01ScoreBoard