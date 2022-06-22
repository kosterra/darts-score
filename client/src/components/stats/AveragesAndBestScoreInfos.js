import React from 'react';

const AveragesAndBestScoreInfos = props => {
  const {averages, bestThreeDarts, getChart} = props;
  
  return (
    <div>
      <span className="section-title">Averages and Best</span>
      <div className="averages-and-best-info section-container">
        <div className="stat-hover statistics-item" onClick={() => getChart('averageOverall', 'Averages for each match', 'lineChart')}>
          <p className="statistics-label">Overall</p>
          <p className="statistics-value">{Math.round(averages.overall)}</p>
        </div>
        <div className="stat-hover statistics-item" onClick={() => getChart('averageBegMidGame', 'Beg/Mid game averages for each match', 'lineChart')}>
          <p className="statistics-label">Beg/Mid game</p>
          <p className="statistics-value">{Math.round(averages.begMidGame)}</p>
        </div>
        <div className="stat-hover statistics-item" onClick={() => getChart('averageEndGame', 'End game averages for each match', 'lineChart')}>
          <p className="statistics-label">End game</p>
          <p className="statistics-value">{Math.round(averages.endGame)}</p>
        </div>
        <div className="statistics-item" onClick={() => getChart('bestThreeDarts', 'Best three darts score for each match', 'lineChart')}>
          <p className="statistics-label">Best three darts</p>
          <p className="statistics-value">{bestThreeDarts}</p>
        </div>
      </div>
    </div>
  )
}

export default AveragesAndBestScoreInfos
