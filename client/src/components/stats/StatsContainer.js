import React from 'react';

import MatchesNumberInfo from './MatchesNumberInfo';
import AveragesAndBestScoreInfos from './AveragesAndBestScoreInfos';
import StatsObjectData from './StatsObjectData';

const StatsContainer = props => {
  const {
    nbrOfMatches,
    matchesWon,
    soloGames,
    averages,
    bestThreeDarts,
    scoreRanges,
    hit,
    doubleOut,
    checkoutScores,
    totalThrow
  } = props.playerStats;

  const {
    getChart
  } = props;

  return (
    <div className="stats-page">
      <div className="statistics-objects-container match-statistics">
        <MatchesNumberInfo 
              nbrOfMatches={nbrOfMatches} 
              matchesWon={matchesWon} 
              soloGames={soloGames}
              getChart={getChart}
        />

        <AveragesAndBestScoreInfos averages={averages} bestThreeDarts={bestThreeDarts} getChart={getChart} />
      </div>

      <div className="statistics-objects-container">
        {Object.keys(scoreRanges).length > 0 && (
          <StatsObjectData title={'Score ranges'} object={scoreRanges} totalThrow={totalThrow.rounds} statName={'scoreRanges'} displayPercentage/>
        )}
        {Object.keys(doubleOut).length > 0 && (
          <StatsObjectData title={'Double Out success rate'} object={doubleOut} statName={'doubleOut'}/>
        )}
        {Object.keys(checkoutScores).length > 0 && (
          <StatsObjectData title={'Checkout scores cleared'} object={checkoutScores}  statName={'checkoutScores'}/>
        )}
        {Object.keys(hit).length > 0 && (
          <StatsObjectData title={'Sections hit'} object={hit} totalThrow={totalThrow.darts} statName={'sectionHit'} displayPercentage/>
        )}
      </div>
    </div>
  )
}

export default StatsContainer
