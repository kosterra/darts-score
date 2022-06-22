import React from 'react';

import './MatchesNumberInfo.css'

const MatchesNumberInfo = props => {
  const { nbrOfMatches, matchesWon, soloGames, getChart } = props;
  return (
    <div>
      <span className="section-title">Match Statistics</span>
      <div className="matches-info section-container">
        <div className="stat-hover statistics-item" onClick={() => getChart('matchResult', 'Win/Loss', 'pieChart')}>
          <p className="statistics-label">Matches played</p>
          <p className="statistics-value">{nbrOfMatches}</p>
        </div>
        <div className="stat-hover statistics-item" onClick={() => getChart('matchResult', 'Win/Loss', 'pieChart')}>
          <p className="statistics-label">Matches won</p>
          <p className="statistics-value">{matchesWon}</p>
        </div>
        <div className="statistics-item">
          <p className="statistics-label">Solo game</p>
          <p className="statistics-value">{soloGames}</p>
        </div>
      </div>
    </div>
  )
}

export default MatchesNumberInfo
