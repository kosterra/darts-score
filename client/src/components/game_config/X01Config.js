import React, { Fragment, useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import Input from '../shared/form/Input';
import inputsValues from '../utils/NewGameInputsValues';
import PageErrorMessage from '../shared/UIElement/PageErrorMessage';
import Modal from '../shared/UIElement/Modal';
import Spinner from '../shared/UIElement/Spinner';
import dataService from '../../services/DataService';
import dataModels from '../../models/DataModels';
import GameContext from '../../utils/GameContext';

const X01Config = () => {
	const navigate = useNavigate()
	const gameContext = useContext(GameContext);
	const { gameTypeValues, setOptionsValues, legOptionsValues, numberOfPlayers } = inputsValues;
	const [ playersNames, setPlayersNames ] = useState([])
	const [ showAddPlayer, setShowAddPlayer ] = useState(false);
	const [ newPlayerName, setNewPlayerName ] = useState('');
	const [ createPlayerSuccessMsg, setCreatePlayerSuccessMsg ] = useState(null);
	const [ error, setError ] = useState(null);
	const [ gameForm, setGameForm ] = useState({
		gameType: 501,
		sets: 3,
		legs: 4,
		numberOfPlayers: 2,
		players: ['','']
	});

	useEffect( () => {
		(async() => {
			const playersNames = await dataService.getAllPlayersName()
			setPlayersNames(playersNames);
		})()
	   
	}, [])

	useEffect(() => {
		new Set(gameForm.players).size === gameForm.players.length && setError(null);
		let clearErrorTimout = setTimeout(() => {
			setError(null);
		}, 10000);

		return () => {
			clearTimeout(clearErrorTimout);
		}
	}, [error, gameForm.players]);

	useEffect(() => {
		let clearMessage = setTimeout(() => {
			setCreatePlayerSuccessMsg(null);
		}, 10000000);

		return () => {
			clearTimeout(clearMessage);
		}
	}, [createPlayerSuccessMsg])

	const handleChange = e => {
		if(e.target.name === 'numberOfPlayers') {
			setGameForm({...gameForm, numberOfPlayers: Number(e.target.value) , players: Array(Number(e.target.value)).fill('')})
		} else {
			setGameForm({...gameForm, [e.target.name]: Number(e.target.value)});
		}
	}

	const updatePlayer = (newValue, i) => {
		const newPlayersList = [...gameForm.players].map((player, j) => {
			if(j === i) {
				return newValue;
			} else {
				return player;
			}
		})
		setGameForm({...gameForm, players: newPlayersList});
	}

	const onStartGame = e => {
		e.preventDefault();

		const playersArrHasDuplicate = new Set(gameForm.players).size !== gameForm.players.length;
		if(playersArrHasDuplicate){
			setError('Each player should be unique.');
			return
		}

		let newGameForm = {...gameForm};
		newGameForm.isSoloGame = Number(newGameForm.numberOfPlayers) === 1;
		newGameForm.gameIsRunning = true;
		newGameForm.matchPlayerInfo = {}
		newGameForm.players.forEach(player => {
			let playerDataModel = {...dataModels.playerMatchModel};
			playerDataModel.score = Number(newGameForm.gameType);
			newGameForm.matchPlayerInfo[player] = playerDataModel;
		})
		
		gameContext.initNewGame(newGameForm);
		navigate("/game/x01", { replace: true });
	}

	const onCreatePlayer = e => {
		e.preventDefault();

		dataService.getAllPlayersName().then(data => {
			if (data.find(name => name === newPlayerName)) {
				setCreatePlayerSuccessMsg(newPlayerName + " already exist!");
				return
			}
		})

		dataService.createPlayer(newPlayerName);
		
		if (dataService.getSinglePlayerData(newPlayerName)) {
			setCreatePlayerSuccessMsg(newPlayerName + " has been added");
		} else {
			setCreatePlayerSuccessMsg("There was an error, please try again!");
		}

		setNewPlayerName('');

		(async() => {
			const playersNames = await dataService.getAllPlayersName()
			setPlayersNames(playersNames);
		})()
		
	}

	if (gameContext.match.gameIsRunning && !gameContext.loading.initGameLoading) {
		return (
			<PageErrorMessage
				title={"Running game"} message={'Please go back to the game or cancel'}
			>
				<Link to="/game/x01" className="page-error-button button-link">Go to the game</Link>
				<button onClick={gameContext.resetGame} type="button" className="page-error-button page-error-button-danger">Cancel the game</button>
			</PageErrorMessage>
		)
	}

	if (gameContext.loading.initGameLoading) {
		return <Spinner spinnerContClassName={"spinner-cont-large"} spinnerImgClassName={"spinnerSmall"}/>
	}

	return (
		<Fragment>
			{showAddPlayer && (
				<Modal 
					isForm
					header={'Add a new player'}
					onSubmit={onCreatePlayer}
					onClickModalBackground={() => setShowAddPlayer(false)}
					contentClass={"add-player-content"}
					footer={(
						<Fragment>
							<button className="modal-btn" type="submit">
								<i className="fas fa-user-plus"></i>
								Create Player
							</button>
							<button className="modal-btn" onClick={() => setShowAddPlayer(false)}>
								<i className="fas fa-times"></i>
								Close
							</button>
						</Fragment>
					)}
				>
					<div className="input-container">
						<Input 
							element="input"
							type="text"
							name="newPlayerName"
							value={newPlayerName}
							htmlFor={"newPlayerName"}
							label={"Player Name:"}
							onChange={e => setNewPlayerName(e.target.value)}
							minLength={2}
							maxLength={15}
							required={true}
						/>
					</div>
					{createPlayerSuccessMsg && (
						<p className="create-player-msg">{createPlayerSuccessMsg}</p>
					)}
				</Modal>
			)}
			<div className="main-container start-game-container">
				<div className="title-container">
					<span className="title">New Game</span>
				</div>
				<form className="content-container" onSubmit={onStartGame}>
					<div className="options-container">
						<div className="game-type-cont">
							<label className="section-title">Game Type</label>
							<div className="inputs-radio-container">
								{gameTypeValues.map((value) => (
									<Input
										key={`game-type-${value}`}
										id={value}
										element="input"
										type="radio"
										name="gameType"
										value={value}
										htmlFor={value}
										label={value}
										checked={Number(gameForm.gameType) === Number(value)}
										onChange={handleChange}
										classNameLabel={`label-radio-clickable ${Number(value) === gameForm.gameType && "label-radio-btn-selected"}`}
										classNameInput={"isHidden"}
										required
									/>
								))}
							</div>
						</div>

						<div className="sets-legs-container">
							<div className="item-container">
								<div className="element-container">
									<Input id="sets" element="select" name="sets" htmlFor="sets" label="First to" value={gameForm.sets} onChange={handleChange}>
										{setOptionsValues.map((value) => (
											<option key={`set-option-${value}`} value={value}>
												{value} set{value > 1 && 's'}
											</option>
										))}
									</Input>
									<Input id="legs" element="select" name="legs" htmlFor="legs" value={gameForm.legs} onChange={handleChange}>
										{legOptionsValues.map((value) => (
											<option key={`leg-option-${value}`} value={value}>
												{value} leg{value > 1 && 's'}
											</option>
										))}
									</Input>
								</div>
							</div>
						</div>
					</div>

					<div className="start-game-form-number-of-players">
						<label className="section-title">Number of Players</label>
						<div className="inputs-radio-container">
							{numberOfPlayers.map((value) => (
								<Input
									key={`player-nbr-${value}`}
									id={value}
									element="input"
									type="radio"
									name="numberOfPlayers"
									value={value}
									htmlFor={value}
									label={value === 1 ? 'Solo' : value }
									checked={Number(gameForm.numberOfPlayers) === Number(value)}
									onChange={handleChange}
									classNameLabel={ `label-radio-clickable ${Number(value) === gameForm.numberOfPlayers && "label-radio-btn-selected"}`}
									classNameInput={"isHidden"}
									required
								/>
							))}
						</div>
					</div>
					
					<div className="select-player-container">
						<label className="section-title">Select Players</label>
						<div className="select-player-wrapper">
							<div className="item-container">
							{gameForm.players.map((player, i) => {
								return (
									<div key={`player-${i+1}`} className="element-container">
											<Input element="select" 
												name="players-names"
												id={`playersNames-${i}`}
												htmlFor={`playersNames-${i}`}
												label={`Player ${i+1}:`} 
												value={gameForm.players[i]} 
												onChange={e => updatePlayer(e.target.value ,i)}>
												<option value={''} disabled hidden>Select Player</option>
											{playersNames && playersNames.map((existingPlayer) => (
												<option key={`player-name-${existingPlayer}`} value={existingPlayer}>
													{existingPlayer}
												</option>
											))}
											</Input>
									</div>
								)
							})}
							</div>
							<div className="add-player-container">
								<button className='add-player-button' type="button" onClick={() => setShowAddPlayer(true)}>+ Add</button>
							</div>
						</div>
					</div>

					{error && (
						<div className="error-container">
							<p>{error}</p>
						</div>
					)}

					<button type="submit" className="start-game-button">Start Game</button>
				</form>
			</div>
		</Fragment>
	);
};

export default X01Config;
