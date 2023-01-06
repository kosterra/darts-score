import React, { Fragment, useState, useEffect } from 'react';
import {toast} from 'react-toastify';
import ToggleButton from 'react-bootstrap/ToggleButton';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import SelectableCardList from '../../elements/selectable.card.list';
import PlayerConfigOptions from '../config_options/player.config.options';
import PlayerForm from './player.form';

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

    const onUnselectPlayer=(id) => {
        onSelectedPlayersChange('players', selectedPlayers.filter(i => i.id !== id));
    }

    const onSearchTermChange=(event) => {
        setSearchTerm(event.target.value);
        loadPlayers(event.target.value);
    }

    const loadPlayers = (searchTerm) => {
        fetch(process.env.REACT_APP_API_URL + 'players/search?search=' + (searchTerm ? searchTerm : ''))
            .then(response => response.json())
            .then(data => {
                setPlayers(data)
            }).catch(error => {
                toast.error('Failed to load players. ' + error.message);
            });
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
                    <div className="selected-players mb-4 d-flex justify-content-center">
                        <Row xs={1} md={4} className="w-75 d-flex justify-content-center">
                            {[...Array(Number(numberOfPlayers))].map((x, idx) =>
                                <Col key={idx} className="col-md-4 w-25 d-flex justify-content-center">
                                    <div className="selected-player-container">
                                        {selectedPlayers[idx] &&
                                            <Card className={`h-100 m-0 p-0 rounded-0 selectable-card bg-tertiary w-100`}>
                                                <Card.Body className="m-0 p-0 border-0 rounded-0 bg-tertiary">
                                                    <Card.Title as="h6" className="bg-primary p-2 mb-0 text-light text-center span">
                                                        {selectedPlayers[idx].nickname}
                                                    </Card.Title>
                                                    <Card.Text as="div" className="p-2 text-light text-center">
                                                        <span>{selectedPlayers[idx].firstname + ' ' + selectedPlayers[idx].lastname}</span>
                                                    </Card.Text>
                                                </Card.Body>
                                                <span className="pl-1 card-unselect">
                                                    <Button value={selectedPlayers[idx].id}
                                                        className="unselect-button border-0 rounded-0"
                                                        onClick={(e) => onUnselectPlayer(e.target.value)}>
                                                        <i className="far fa-times-circle" style={{ pointerEvents: 'none' }}></i>
                                                    </Button>
                                                </span>
                                            </Card>
                                        }
                                        {!selectedPlayers[idx] &&
                                            <i className="fas fa-user-circle fa-4x text-secondary"></i>
                                        }
                                    </div>
                                </Col>
                            )}
                        </Row>
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