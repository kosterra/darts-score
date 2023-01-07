import React, { useContext, useState, useEffect } from 'react';
import X01Context from '../../utils/x01.context';

const X01ScoreBoard = (props) => {
    const { player, infos } = props
    const {
        game,
        getCurrentThrowScore,
        error,
        resetError
    } = useContext(X01Context);
    
    const [ score, setScore ] = useState(game.matchPlayerInfo[game.players[game.currentPlayerTurn]].score);

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

        let currentPlayer = game.players[game.currentPlayerTurn];
        let currentPlayerScore = game.matchPlayerInfo[currentPlayer].score;

        let newCurrentScore = currentPlayerScore - totalScore;
        setScore(newCurrentScore);

    // eslint-disable-next-line
	},[ game.currentThrow ]);

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
                        { game.players[game.currentPlayerTurn] === player ?
                            score === 1 || score < 0 ? 'BUST' : score : infos.score
                        }
                    </div>
                    <div className="player">
                        <span className="player-name">{player}</span>
                        <div className="player-icons">
                            { game.players[game.startingPlayerLeg] === player && (
                                <i className="fas fa-circle player-name-icon active-start-leg"></i>
                            )}
                            { game.players[game.currentPlayerTurn] === player && (
                                <i className="fas fa-circle player-name-icon active-throwing"></i>
                            )}
                            { game.players[game.startingPlayerLeg] !== player && game.players[game.currentPlayerTurn] !== player && (
                                <i className="fas fa-circle player-name-icon placeholder"></i>
                            )}
                        </div>
                    </div>
                </div>

                <div className="legs-sets-wrapper">
                    <div className="legs-sets-container legs-container">
                        <div className="legs-sets legs">
                            LEGS
                        </div>
                        {game.numberOfLegs <= 5 && game.legMode === 'Best of' &&
                            <div className="value">
                                {[...Array(game.matchPlayerInfo[player].currentSetLegWon)].map((e, i) => (
                                    <i key={`leg-filled-${i}`} className="fas fa-circle"></i>
                                ))}
                                {[...Array(Math.round(game.numberOfLegs / 2) - game.matchPlayerInfo[player].currentSetLegWon)].map((e, i) => (
                                    <i key={`leg-unfilled-${i}`} className="far fa-circle"></i>
                                ))}
                            </div>
                        }
                        {game.numberOfLegs <= 4 && game.legMode === 'First to' &&
                            <div className="value">
                                {[...Array(game.matchPlayerInfo[player].currentSetLegWon)].map((e, i) => (
                                    <i key={`set-filled-${i}`} className="fas fa-circle"></i>
                                ))}
                                {[...Array(game.numberOfLegs - game.matchPlayerInfo[player].currentSetLegWon)].map((e, i) => (
                                    <i key={`leg-unfilled-${i}`} className="far fa-circle"></i>
                                ))}
                            </div>
                        }
                        {((game.numberOfLegs > 4 && game.legMode === 'First to') || (game.numberOfLegs > 5 && game.legMode === 'Best of')) &&
                            <div className="value">
                                <span className="text-value">{game.matchPlayerInfo[player].currentSetLegWon}</span>
                            </div>
                        }
                    </div>
                
                    <div className="legs-sets-container sets-container">
                        <div className="legs-sets sets">
                            SETS
                        </div>
                        {game.numberOfSets <= 5 && game.setMode === 'Best of' &&
                            <div className="value">
                                {[...Array(game.matchPlayerInfo[player].setWon)].map((e, i) => (
                                    <i key={`set-filled-${i}`} className="fas fa-circle"></i>
                                ))}
                                {[...Array(Math.round(game.numberOfSets / 2) - game.matchPlayerInfo[player].setWon)].map((e, i) => (
                                    <i key={`set-unfilled-${i}`} className="far fa-circle"></i>
                                ))}
                            </div>
                        }
                        {game.numberOfSets <= 4 && game.setMode === 'First to' &&
                            <div className="value">
                                {[...Array(game.matchPlayerInfo[player].setWon)].map((e, i) => (
                                    <i key={`set-filled-${i}`} className="fas fa-circle"></i>
                                ))}
                                {[...Array(game.numberOfSets - game.matchPlayerInfo[player].setWon)].map((e, i) => (
                                    <i key={`set-unfilled-${i}`} className="far fa-circle"></i>
                                ))}
                            </div>
                        }
                        {((game.numberOfSets > 4 && game.setMode === 'First to') || (game.numberOfSets > 5 && game.setMode === 'Best of')) && 
                            <div className="value">
                                <span className="text-value">{game.matchPlayerInfo[player].setWon}</span>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

export default X01ScoreBoard