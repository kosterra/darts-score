import React, {useState} from 'react';
import { useNavigate } from "react-router-dom";
import {toast} from 'react-toastify';
import Button from 'react-bootstrap/Button';

import X01ScoreConfig from './config_components/x01.score.config';
import X01InOutConfig from './config_components/x01.inout.config';
import SetsLegsConfig from './config_components/sets.legs.config';
import PlayerConfig from './config_components/player.config';

import ScoreConfigOptions from './config_options/score.config.options';
import SetsLegsConfigOptions from './config_options/sets.legs.config.options';
import PlayerConfigOptions from './config_options/player.config.options';

const X01Config = (props) => {
    const [ gameForm, setGameForm ] = useState({
		score: ScoreConfigOptions.gameScoreOptions.default,
		setMode: SetsLegsConfigOptions.setLegModeOptions.default,
		legMode: SetsLegsConfigOptions.setLegModeOptions.default,
		numberOfSets: SetsLegsConfigOptions.boSetNumberOptions.default,
		numberOfLegs: SetsLegsConfigOptions.boLegNumberOptions.default,
		legInMode: SetsLegsConfigOptions.legInOptions.default,
		legOutMode: SetsLegsConfigOptions.legOutOptions.default,
        numberOfPlayers: PlayerConfigOptions.numberOfPlayerOptions.default,
		players: []
	});

    const navigate = useNavigate();

	const handleConfigChange = (name, value) => {
		if (name === 'numberOfPlayers') {
			setGameForm({...gameForm,
				numberOfPlayers: Number(value),
				setMode: value > 2 ? 'First to' : gameForm.setMode,
				legMode: value > 2 ? 'First to' : gameForm.legMode
			})

            if (gameForm.players.length > Number(value)) {
                setGameForm({...gameForm, players: gameForm.players.slice(0, Number(value))});
            }
		} else if (['setMode', 'legMode', 'legInMode', 'legOutMode'].includes(name)) {
			setGameForm({...gameForm, [name]: value});
        } else if (name === 'players') {
            setGameForm({...gameForm, players: value})
		} else {
			setGameForm({...gameForm, [name]: Number(value)});
		}
	}

    const handleSubmit = (event) => {
        if (!validate()) {
            event.preventDefault();
            event.stopPropagation();
            toast.error('You need to select ' + gameForm.numberOfPlayers + ' players!');
        } else {
            let playerIds = gameForm.players.map((item) => item.id);
            gameForm['players'] = playerIds;

            fetch(process.env.REACT_APP_API_URL + 'games/x01', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify(gameForm)
            }).then(response => {    
                if (!response.ok) {
                    toast.error('Error on create game! ' + response.statusText);
                    throw Error(response.statusText);
                } else {
                    return response.json();
                }
            }).then((data) => {
                console.log(data);
                navigate('/x01/' + data.id);
            }).catch(error => {
                toast.error('Error on create game! ' + error.message);
            });
        }
    }

    const validate = () =>{
        return Number(gameForm.numberOfPlayers) === gameForm.players.length;
    }

    return (
        <div>
            <X01ScoreConfig
                scoreOption={gameForm.score}
                onScoreChange={handleConfigChange}
            />
            <X01InOutConfig
                legInOption={gameForm.legInMode}
                legOutOption={gameForm.legOutMode}
                onInOutChange={handleConfigChange}
            />
            <SetsLegsConfig
                setModeOption={gameForm.setMode}
                legModeOption={gameForm.legMode}
                numberOfSetsOption={gameForm.numberOfSets}
                numberOfLegsOption={gameForm.numberOfLegs}
                onSetsLegsChange={handleConfigChange}
            />
            <PlayerConfig
                numberOfPlayers={gameForm.numberOfPlayers}
                selectedPlayers={gameForm.players}
                onNumberOfPlayersChange={handleConfigChange}
                onSelectedPlayersChange={handleConfigChange}
            />
            <div className="col-xs-1 p-3" align="center">
                <Button variant="primary" className="text-light m-0 p-2" onClick={handleSubmit}>Start Game</Button>
            </div>
        </div>
    );
}

export default X01Config;
