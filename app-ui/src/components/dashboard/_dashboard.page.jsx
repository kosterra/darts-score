import { useState, useEffect } from 'react';
import DashboardGameList from './dashboard.gamelist';

import X01Service from '../../services/x01.service';
import CricketService from '../../services/cricket.service';
import EliminationService from '../../services/elimination.service';
import PlayerService from '../../services/player.service';

const Dashboard = () => {
	
	const [runningX01Games, setRunningX01Games] = useState([]);
	const [finishedX01Games, setFinishedX01Games] = useState([]);
	const [runningCricketGames, setRunningCricketGames] = useState([]);
	const [finishedCricketGames, setFinishedCricketGames] = useState([]);
	const [runningEliminationGames, setRunningEliminationGames] = useState([]);
	const [finishedEliminationGames, setFinishedEliminationGames] = useState([]);
	const [players, setPlayers] = useState([]);

	const loadRunningX01Games = async () => {
		let data = await X01Service.loadRunningX01Games();
		setRunningX01Games(data);
	}

	const loadRunningCricketGames = async () => {
		let data = await CricketService.loadRunningCricketGames();
		setRunningCricketGames(data);
	}

	const loadRunningEliminationGames = async () => {
		let data = await EliminationService.loadRunningEliminationGames();
		setRunningEliminationGames(data);
	}

	const loadFinishedX01Games = async () => {
		let data = await X01Service.loadFinishedX01Games();
		setFinishedX01Games(data);
	}

	const loadFinishedCricketGames = async () => {
		let data = await CricketService.loadFinishedCricketGames();
		setFinishedCricketGames(data);
	}

	const loadFinishedEliminationGames = async () => {
		let data = await EliminationService.loadFinishedEliminationGames();
		setFinishedEliminationGames(data);
	}

	const loadPlayers = async () => {
		let data = await PlayerService.searchPlayers('');
		setPlayers(data);
	}

	useEffect(() => {
		loadRunningX01Games();
		loadFinishedX01Games();
		loadRunningCricketGames();
		loadFinishedCricketGames();
		loadRunningEliminationGames();
		loadFinishedEliminationGames();
		loadPlayers();
	}, []);

	return (
		<div className="container-fluid p-4 border-0">
			<div className="row">
				{runningX01Games && runningX01Games.length > 0 &&
					<DashboardGameList
						title="X01"
						subtitle="Currently Running"
						games={runningX01Games}
						players={players}
						gamesType="x01"
						emptyMessage="Currently no running X01 games"
					/>
				}
				{finishedX01Games && finishedX01Games.length > 0 &&
					<DashboardGameList
						title="X01"
						subtitle="Recently Finished"
						games={finishedX01Games}
						players={players}
						gamesType="x01"
						emptyMessage="Not yet any X01 games played"
					/>
				}
				{runningCricketGames && runningCricketGames.length > 0 &&
					<DashboardGameList
						title="Cricket"
						subtitle="Currently Running"
						games={runningCricketGames}
						players={players}
						gamesType="cricket"
						emptyMessage="Currently no running Cricket games"
					/>
				}
				{finishedCricketGames && finishedCricketGames.length > 0 &&
					<DashboardGameList
						title="Cricket"
						subtitle="Recently Finished"
						games={finishedCricketGames}
						players={players}
						gamesType="cricket"
						emptyMessage="Not yet any Cricket games played"
					/>
				}
				{runningEliminationGames && runningEliminationGames.length > 0 &&
					<DashboardGameList
						title="Elimination"
						subtitle="Currently Running"
						games={runningEliminationGames}
						players={players}
						gamesType="elimination"
						emptyMessage="Currently no running Elimination games"
					/>
				}
				{finishedEliminationGames && finishedEliminationGames.length > 0 &&
					<DashboardGameList
						title="Elimination"
						subtitle="Recently Finished"
						games={finishedEliminationGames}
						players={players}
						gamesType="elimination"
						emptyMessage="Not yet any Elimination games played"
					/>
				}
			</div>
		</div>
	);
};

export default Dashboard;