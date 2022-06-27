import React from 'react';

const X01StatisticsBoard = props => {
  const { averages, bestThreeDarts, scoreRanges, doubleOut, checkoutScores } = props.infos
  const player = props.player
  const currentLegThrows = props.currentLegThrows

  return (
    <div className="statistics-board-wrapper">
        <div className="game-statistics">
            <div className="statistics-block">
                <h3 className="title">Game Averages</h3>
                <div className="statistics-entry">
                    <span className="label">Overall</span>
                    <span className="value">{Math.round(averages.overall)}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">Begin / Mid Game</span>
                    <span className="value">{Math.round(averages.begMidGame)}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">End Game</span>
                    <span className="value">{Math.round(averages.endGame)}</span>
                </div>
            </div>
            <div className="statistics-block">
                <h3 className="title">Amount</h3>
                <div className="statistics-entry vertical-space">
                    <span className="label">Best Three Darts</span>
                    <span className="value">{bestThreeDarts}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">180</span>
                    <span className="value">{scoreRanges.hasOwnProperty('180') ? scoreRanges['180'] : 0}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">160 - 179</span>
                    <span className="value">{scoreRanges.hasOwnProperty('160-179') ? scoreRanges['160-179'] : 0}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">140 - 159</span>
                    <span className="value">{scoreRanges.hasOwnProperty('140-159') ? scoreRanges['140-159'] : 0}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">120 - 139</span>
                    <span className="value">{scoreRanges.hasOwnProperty('120') ? scoreRanges['120-139'] : 0}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">100 - 119</span>
                    <span className="value">{scoreRanges.hasOwnProperty('100-119') ? scoreRanges['100-119'] : 0}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">80 - 99</span>
                    <span className="value">{scoreRanges.hasOwnProperty('80-99') ? scoreRanges['80-99'] : 0}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">60 - 79</span>
                    <span className="value">{scoreRanges.hasOwnProperty('60-79') ? scoreRanges['60-79'] : 0}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">40 - 59</span>
                    <span className="value">{scoreRanges.hasOwnProperty('40-59') ? scoreRanges['40-59'] : 0}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">20 - 39</span>
                    <span className="value">{scoreRanges.hasOwnProperty('20-39') ? scoreRanges['20-39'] : 0}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">1 - 19</span>
                    <span className="value">{scoreRanges.hasOwnProperty('1-19') ? scoreRanges['1-19'] : 0}</span>
                </div>
                <div className="statistics-entry">
                    <span className="label">ZERO</span>
                    <span className="value">{scoreRanges.hasOwnProperty('ZERO') ? scoreRanges['ZERO'] : 0}</span>
                </div>
            </div>
            <div className="statistics-block">
                <h3 className="title">Checkout</h3>
                <div className="statistics-entry">
                    <span className="label">Highest</span>
                    <span className="value">{Math.max(0, ...Object.keys(checkoutScores))}</span>
                </div>
                <div className="statistics-entry bottom-space">
                    <span className="label">Doubles Hit</span>
                    <span className="value">{Object.values(checkoutScores).reduce((partialSum, a) => partialSum + a, 0)}</span>
                </div>
                {[...Array(20)].map((x, i) =>
                    <div className="statistics-entry" key={i}>
                        <span className="label">Double {i+1}</span>
                        <span className="value">{doubleOut[String(i+1)] ? doubleOut[String(i+1)].hit : 0} / {doubleOut[String(i+1)] ? doubleOut[String(i+1)].total : 0}</span>
                    </div>
                )}
                <div className="statistics-entry" >
                    <span className="label">BULLSEYE</span>
                    <span className="value">{doubleOut['25'] ? doubleOut['25'].hit : 0} / {doubleOut['25'] ? doubleOut['25'].total : 0}</span>
                </div>
            </div>
        </div>
        {currentLegThrows.filter(e => e.playerName === player).length > 0 && 
        <div className="score-course">
            <h3 className="title">Per Round Score</h3>
            <div className="points-entry" key="initial">
                <span className="label item">Initial</span>
                <span className="per-dart item"> </span>
                <span className="per-dart item"> </span>
                <span className="per-dart item"> </span>
                <span className="per-round item"> </span>
                <span className="score-left item">501</span>
            </div>
            {currentLegThrows.filter(e => e.playerName === player).map((throws, index) => (
                <div className="points-entry" key={index}>
                    <span className="label item">R{index + 1}</span>
                    <span className="per-dart item">{throws.darts[0]}</span>
                    <span className="per-dart item">{throws.darts[1]}</span>
                    <span className="per-dart item">{throws.darts[2]}</span>
                    <span className='per-round item'>{throws.roundScore}</span>
                    <span className="score-left item">{throws.scoreLeft}</span>
                </div>
            ))}
        </div>
        }
    </div>
  )
}

export default X01StatisticsBoard