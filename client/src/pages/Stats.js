import React, { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';

import StatsContainer from '../components/stats/StatsContainer';
import Input from '../components/shared/form/Input';
import Modal from '../components/shared/UIElement/Modal';
import ChartComponent from '../components/shared/charts/ChartComponent';
import PageErrorMessage from '../components/shared/UIElement/PageErrorMessage';
import Spinner from '../components/shared/UIElement/Spinner';
import dataService from '../services/DataService';
import getChartData from '../components/shared/charts/utils/getChartDataMethods';

import './Stats.css';

const Stats = () => {
  const {getAllPlayersName, getSinglePlayerData} = dataService;
  const [form, setForm] = useState({playerName: undefined});
  const [playerStats, setPlayerStats] = useState(undefined);
  const [playerNameList, setPlayerNameList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    (async() => {
			const playersNames = await getAllPlayersName()
			setPlayerNameList(playersNames);
		})()
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if(playerNameList) {
      setLoading(false);
      setForm({...form, playerName: playerNameList[0] ? playerNameList[0] : undefined})
    }
    // eslint-disable-next-line
  }, [playerNameList]);

  if (loading) {
    return <Spinner
    spinnerContClassName={'spinner-cont-large'}
    spinnerImgClassName={'spinnerSmall'}
  />
  }

  const handleChange = e => {
    setForm({...form, [e.target.name]: e.target.value});
  }

  const getChart = (statName, title, chartType) => {
      let data = getChartData(statName, playerStats);
      setChartData({title, data, chartType});
      setShowGraph(true);
  }

  const onSubmit = e => {
    e.preventDefault();
    getSinglePlayerData(form.playerName).then(data => {
			setPlayerStats(data);
		})
  }

  return (
    <div className="main-container statistics">
      <div className="title-container">
				<span className="title">Statistics</span>
			</div>
      <div className="content-container">
        {showGraph && (
          <Modal 
            isDiv
            header={chartData.title}
            onClickModalBackground={() => setShowGraph(false)}
            className={'modal-graph-container'}
            footer={(
              <Fragment>
                <button className="modal-btn" onClick={() => setShowGraph(false)}>Go Back</button>
              </Fragment>
            )}
          >
            <ChartComponent chartType={chartData.chartType} data={chartData.data} />
          </Modal>
        )}
    
        <div className="stats-page-container">
          {playerNameList && playerNameList.length ? (
            <div>
              <form onSubmit={onSubmit} className="stats-page-form">
                <Input element="select" 
                  name="playerName" 
                  htmlFor="playerName" 
                  label="Pick a player:" 
                  value={form.playerName} 
                  onChange={handleChange}
                >
                  {playerNameList.map((playerName) => (
                    <option key={`player-name-stat-${playerName}`} value={playerName}>
                      {playerName}
                    </option>
                  ))}
                </Input>
                <button type="submit">
                  <i className="fas fa-chart-bar"></i>
                  Statistics
                </button>
              </form>
            </div>

          ) : (
            <PageErrorMessage title={"No Players found"} message={"Create a player, play a game and come back after."}>
              <Link to="/" className="page-error-button button-link">
                <i className="fas fa-plus"></i>
                New Game
              </Link>
            </PageErrorMessage>
          )}

          {playerStats && (
            <StatsContainer 
              playerStats={playerStats}
              getChart={getChart}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Stats
