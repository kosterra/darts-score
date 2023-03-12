import React, { Fragment, useState, useEffect } from 'react';
import ToggleButton from 'react-bootstrap/ToggleButton';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import SelectableCardList from '../../elements/selectable.card.list';
import PlayerConfigOptions from '../config_options/player.config.options';
import PlayerForm from './player.form';

import PlayerService from '../../../services/player.service';

const PlayerConfig = (props) => {
    const {
        numberOfPlayers,
        selectedPlayers,
        onNumberOfPlayersChange,
        onSelectedPlayersChange
    } = props

    const {numberOfPlayerOptions} = PlayerConfigOptions;
    
    const [players, setPlayers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
		loadPlayers('');
	}, [])

    const onPlayerAdd=() => {
        loadPlayers('');
    }

    const onSelectPlayer=(players) => {
        onSelectedPlayersChange('players', players);
    }

    const onSearchTermChange=(event) => {
        setSearchTerm(event.target.value);
        loadPlayers(event.target.value);
    }

    const loadPlayers = async searchTerm => {
        let data = await PlayerService.loadPlayers(searchTerm);
        setPlayers(data);
    }

	return (
        <Fragment>
            <div className="p-2 container">
                <div className="justify-content-md-center align-items-center">
                    <p className="h6 text-center">Players</p>
                    <div className="btn-toolbar justify-content-md-center align-items-center p-3 mb-3 text-light">
                        {numberOfPlayerOptions.values.map((option, idx) => (
                            <ToggleButton
                                key={idx}
                                id={`number-of-players-option-${idx}`}
                                type="radio"
                                name="number-of-players-options"
                                value={option}
                                className={`btn btn-secondary btn-sm text-light ${Number(numberOfPlayers) === option ? 'btn-selected' : ''}`}
                                checked={Number(numberOfPlayers) === option}
                                onChange={(e) => onNumberOfPlayersChange('numberOfPlayers', e.currentTarget.value)}>
                                {Number(option) === 1 ? 'Solo' : option}
                            </ToggleButton>
                        ))}
                    </div>
                    <div className="d-flex justify-content-md-center align-items-center p-2 text-light">
                        <InputGroup className="mb-3">
                            <InputGroup.Text id="search-addon">
                                <i className="fas fa-search"></i>
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search"
                                value={searchTerm}
                                aria-label="Search"
                                aria-describedby="search-addon"
                                onChange={onSearchTermChange}
                            />
                        </InputGroup>
                        <PlayerForm onPlayerAdd={onPlayerAdd} />
                    </div>
                    <SelectableCardList
                        itemType={'Players'}
                        items={players}
                        selectedItems={selectedPlayers}
                        emptyText={'No Players found. Please create new Players first.'}
                        maxSelectable={Number(numberOfPlayers)}
                        setSelectedItems={onSelectPlayer} />
                </div>
            </div>
        </Fragment>
	);
};

export default PlayerConfig;