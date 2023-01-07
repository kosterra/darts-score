import React, { Fragment, useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import {toast} from 'react-toastify';

import X01Context from "../../utils/x01.context";

import X01ScoreBoard from '../../components/games/x01.scoreboard';
import X01StatisticsBoard from '../../components/games/x01.statisticsboard';
import ScoreInputBoard from '../../components/games/score.input.board';

const X01GamePage = () => {

  const {
      game
  } = useContext(X01Context);

  return (
    <Fragment>
      <div className="game-content w-100">
        <div className="modus-info d-flex justify-content-center">
          <div className="best-of-legs d-flex flex-column align-items-center rounded-8 rounded-bottom bg-tertiary p-2">
            <div className="sets-and-legs">{game.setMode} <strong>{game.numberOfSets}</strong> Set{game.numberOfSets > 1 && 's'} - {game.legMode} <strong>{game.numberOfLegs}</strong> Leg{game.numberOfLegs > 1 && 's'}</div>
            <div className="modus-in-out">{game.legInMode} / {game.legOutMode}</div>
          </div>
        </div>
        {/* <div className="score-boards">
            {Object.entries(game.matchPlayerInfo).map(([player, infos]) => (
              <X01ScoreBoard key={`player-board-${player}`} player={player} infos={infos} />
            ))}
        </div>*/}
        <ScoreInputBoard />
        {/* <div className="statistics-board">
          {Object.entries(game.matchPlayerInfo).map(([player, infos]) => (
              <X01StatisticsBoard
                key={`statistics-board-${player}`}
                player={player}
                infos={infos}
                currentLegThrows={game.currentLegThrows}
                legOutMode={game.legOutMode}
              />
          ))}
        </div> */}
      </div>
    </Fragment>
  )
}

export default X01GamePage
