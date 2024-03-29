import React, { Fragment, useContext } from 'react';
import { Link } from 'react-router-dom';

import GameContext from '../../utils/GameContext';
import PageErrorMessage from '../../components/shared/UIElement/PageErrorMessage';
import Spinner from '../../components/shared/UIElement/Spinner';
import X01ScoreBoard from '../../components/games/X01ScoreBoard';
import X01StatisticsBoard from '../../components/games/X01StatisticsBoard';
import ScoreInputBoard from '../../components/games/ScoreInputBoard';

const X01Game = () => {
  const { match, loading } = useContext(GameContext);

  if(loading.initGameLoading) {
    return <Spinner spinnerContClassName={"spinner-cont-large"} spinnerImgClassName={"spinnerSmall"}/>
  }
  
  if(!match.gameIsRunning) {
    return (
      <PageErrorMessage title={'Error'} message={'You need to initialise a new game'}>
        <Link to='/' className="page-error-button button-link">
          <i className="fas fa-plus"></i>
          New game
        </Link>
      </PageErrorMessage>
    )
  }

  return (
    <Fragment>
      <div className="game-content">
        <div className="modus-info">
          <div className="best-of-legs">
            <span className="sets-and-legs">{match.setMode} <strong>{match.numberOfSets}</strong> Set{match.numberOfSets > 1 && 's'} - {match.legMode} <strong>{match.numberOfLegs}</strong> Leg{match.numberOfLegs > 1 && 's'}</span>
            <span className="modus-in-out">{match.legInMode} / {match.legOutMode}</span>
          </div>
        </div>
        <div className="score-boards">
            {Object.entries(match.matchPlayerInfo).map(([player, infos]) => (
              <X01ScoreBoard key={`player-board-${player}`} player={player} infos={infos} />
            ))}
        </div>
        <ScoreInputBoard />
        <div className="statistics-board">
          {Object.entries(match.matchPlayerInfo).map(([player, infos]) => (
              <X01StatisticsBoard
                key={`statistics-board-${player}`}
                player={player}
                infos={infos}
                currentLegThrows={match.currentLegThrows}
                legOutMode={match.legOutMode}
              />
          ))}
        </div>
      </div>
    </Fragment>
  )
}

export default X01Game
