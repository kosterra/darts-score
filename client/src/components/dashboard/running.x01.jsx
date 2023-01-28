import React, { Fragment, useState, useEffect } from 'react';

import X01Service from '../../services/x01.service';
import PlayerService from '../../services/player.service';

import dayjs from "dayjs";

import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

const RunningX01Games = () => {
    const [x01Games, setX01Games] = useState([]);
    const [players, setPlayers] = useState([]);

    useEffect(() => {
		loadRunningX01Games();
        loadPlayers();
	}, []);

    const loadRunningX01Games = async () => {
        let data = await X01Service.loadRunningX01Games();
        setX01Games(data);
    }

    const loadPlayers = async () => {
        let data = await PlayerService.loadPlayers('');
        setPlayers(data);
    }

    return (
        <Fragment>
            <Card className="rounded-0 border-0 bg-dark" style={{ width: '18rem' }}>
                <Card.Body className="m-0 p-0 border-0 rounded-0 bg-tertiary">
                    <Card.Title as="h6" className="bg-primary p-2 mb-0 text-light text-center span">
                        Running X01 Games
                    </Card.Title>
                    <Card.Text as="div" className="p-2 text-light">
                        <ListGroup variant="flush">
                            {x01Games.length > 0 && x01Games.map((x01Game, idx) => (
                                <ListGroup.Item key={idx} className="bg-transparent mb-1 border-solid-grey">
                                    <div>
                                        <Row>
                                            <Col className="text-white fw-600 fs-6">Player</Col>
                                            <Col className="text-white text-center fw-600 fs-6">Sets</Col>
                                            <Col className="text-white text-center fw-600 fs-6">Legs</Col>
                                        </Row>
                                        { players.length > 0 && x01Game.players.map((playerId, idx) => (
                                            <Row key={idx}>
                                                <Col className="text-white fs-8">{ players ? players.find(player => player.id === playerId).nickname : ''}</Col>
                                                <Col className="text-white text-center fs-8">{ x01Game.playerModels[playerId].setsWon }</Col>
                                                <Col className="text-white text-center fs-8">{ x01Game.playerModels[playerId].currentSetLegsWon }</Col>
                                            </Row>
                                        ))}
                                    </div>
                                    <div className="d-flex justify-content-between align-items-end mt-2">
                                        <span className="fs-9 text-grey">{ dayjs(x01Game.createdAt).format("DD.MM.YYYY HH:mm") }</span>
                                        <Button href={'/x01/' + x01Game.id} className="py-1">
                                            <i className="fas fa-external-link-alt"></i>
                                        </Button>
                                    </div>
                                </ListGroup.Item>
                            ))}
                            {x01Games.length === 0 &&
                                <span className="text-center fs-7">No running games yet.</span>
                            }
                        </ListGroup>
                    </Card.Text>
                </Card.Body>               
            </Card>
        </Fragment>
    )
}
  
export default RunningX01Games;