import React, { Fragment, useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import Input from '../form/Input';
import x01ConfigOptions from './X01ConfigOptions';
import PageErrorMessage from '../UIElement/PageErrorMessage';
import Modal from '../UIElement/Modal';
import Spinner from '../UIElement/Spinner';
import dataService from '../../services/DataService';
import dataModels from '../../models/DataModels';
import GameContext from '../../utils/GameContext';

const X01Config = () => {
	const navigate = useNavigate()
	const gameContext = useContext(GameContext);
	const {
		gameScoreOptions,
		setLegModeOptions,
		ftSetNumberOptions,
		ftLegNumberOptions,
		boSetNumberOptions,
		boLegNumberOptions,
		legInOptions,
		legOutOptions,
		numberOfPlayerOptions
	} = x01ConfigOptions;
	const [ playersNames, setPlayersNames ] = useState([])
	const [ showAddPlayer, setShowAddPlayer ] = useState(false);
	const [ newPlayerName, setNewPlayerName ] = useState('');
	const [ createPlayerSuccessMsg, setCreatePlayerSuccessMsg ] = useState(null);
	const [ error, setError ] = useState(null);
	const [ gameForm, setGameForm ] = useState({
		gameType: 501,
		setMode: 'Best of',
		legMode: 'Best of',
		numberOfSets: 3,
		numberOfLegs: 4,
		legInMode: 'Straight In',
		legOutMode: 'Double Out',
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
		if (e.target.name === 'numberOfPlayers') {
			setGameForm({...gameForm,
				numberOfPlayers: Number(e.target.value),
				players: Array(Number(e.target.value)).fill(''),
				setMode: e.target.value > 2 ? 'First to' : gameForm.setMode,
				legMode: e.target.value > 2 ? 'First to' : gameForm.legMode
			})
		} else if (['setMode', 'legMode', 'legInMode', 'legOutMode'].includes(e.target.name)) {
			setGameForm({...gameForm, [e.target.name]: e.target.value});
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
						<div className="game-type-container">
							<label className="section-title">Game Type</label>
							<div className="inputs-radio-container">
								{gameScoreOptions.map((value) => (
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

						<div className="in-out-mode-container">
							<div className="inputs-radio-container">
								{legInOptions.map((value) => (
									<Input
										key={`leg-in-mode-${value}`}
										id={value}
										element="input"
										type="radio"
										name="legInMode"
										value={value}
										htmlFor={value}
										label={value}
										checked={gameForm.legInMode === value}
										onChange={handleChange}
										classNameLabel={`label-radio-clickable ${value === gameForm.legInMode && "label-radio-btn-selected"}`}
										classNameInput={"isHidden"}
										required
									/>
								))}
							</div>
							<div className="inputs-radio-container">
								{legOutOptions.map((value) => (
									<Input
										key={`leg-out-mode-${value}`}
										id={value}
										element="input"
										type="radio"
										name="legOutMode"
										value={value}
										htmlFor={value}
										label={value}
										checked={gameForm.legOutMode === value}
										onChange={handleChange}
										classNameLabel={`label-radio-clickable ${value === gameForm.legOutMode && "label-radio-btn-selected"}`}
										classNameInput={"isHidden"}
										required
									/>
								))}
							</div>
						</div>

						<div className="sets-legs-container">
							<div className="item-container">
								<div className="element-container">
									<div className="sets-legs-settings-container sets-settings-container">
										<span>Sets</span>
										<div className="settings-elements sets-settings">
											{gameForm.numberOfPlayers > 2 &&
												<span>First to</span>
											}
											{gameForm.numberOfPlayers <= 2 &&
												<Input id="setMode" element="select" name="setMode" htmlFor="setMode" value={gameForm.setMode} onChange={handleChange}>
													{setLegModeOptions.map((value) => (
														<option key={`set-mode-option-${value}`} value={value}>
															{value}
														</option>
													))}
												</Input>
											}
											<Input id="numberOfSets" element="select" name="numberOfSets" htmlFor="numberOfSets" value={gameForm.numberOfSets} onChange={handleChange}>
												{gameForm.setMode === 'First to' && ftSetNumberOptions.map((value) => (
													<option key={`set-option-${value}`} value={value}>
														{value} set{value > 1 && 's'}
													</option>
												))}
												{gameForm.setMode === 'Best of' &&  boSetNumberOptions.map((value) => (
													<option key={`set-option-${value}`} value={value}>
														{value} set{value > 1 && 's'}
													</option>
												))}
											</Input>
										</div>
									</div>
									<div className="sets-legs-settings-container legs-settings-container">
										<span>Legs</span>
										<div className="settings-elements legs-settings">
											{gameForm.numberOfPlayers > 2 &&
												<span>First to</span>
											}
											{gameForm.numberOfPlayers <= 2 &&
												<Input id="legMode" element="select" name="legMode" htmlFor="legMode" value={gameForm.legMode} onChange={handleChange}>
													{setLegModeOptions.map((value) => (
														<option key={`leg-mode-option-${value}`} value={value}>
															{value}
														</option>
													))}
												</Input>
											}
											<Input id="numberOfLegs" element="select" name="numberOfLegs" htmlFor="numberOfLegs" value={gameForm.numberOfLegs} onChange={handleChange}>
												{gameForm.legMode === 'First to' &&  ftLegNumberOptions.map((value) => (
													<option key={`leg-option-${value}`} value={value}>
														{value} leg{value > 1 && 's'}
													</option>
												))}
												{gameForm.legMode === 'Best of' &&  boLegNumberOptions.map((value) => (
													<option key={`leg-option-${value}`} value={value}>
														{value} leg{value > 1 && 's'}
													</option>
												))}
											</Input>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="start-game-form-number-of-players">
						<label className="section-title">Number of Players</label>
						<div className="inputs-radio-container">
							{numberOfPlayerOptions.map((value) => (
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
