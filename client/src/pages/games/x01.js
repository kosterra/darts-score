import React, { Fragment, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {toast} from 'react-toastify';

import X01ScoreBoard from '../../components/games/X01ScoreBoard';
import X01StatisticsBoard from '../../components/games/X01StatisticsBoard';
import ScoreInputBoard from '../../components/games/ScoreInputBoard';

const X01GamePage = () => {
  const { id } = useParams();
  const [game, setGame] = useState({});

  useEffect(() => {
    console.log(id);
    fetch(process.env.REACT_APP_API_URL + 'games/x01/' + id)
        .then(response => response.json())
        .then(data => {
            setGame(data);
            console.log(data)
        }).catch(error => {
          toast.error('Failed to load the game. ' + error.message);
        });
	},[id])

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
