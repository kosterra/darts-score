import React, { Fragment, useState, useEffect } from 'react';

import X01Service from '../../services/x01.service';
import PlayerService from '../../services/player.service';

import dayjs from "dayjs";
import slice from "lodash";

import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

const FinishedX01Games = () => {
    const [x01Games, setX01Games] = useState([]);
    const [index, setIndex] = useState(3);
    const [isCompleted, setIsCompleted] = useState(false);
    const [players, setPlayers] = useState([]);

    const initialX01Games = x01Games.slice(0, index);
    console.log(initialX01Games);

    const loadFinishedX01Games = async () => {
        let data = await X01Service.loadFinishedX01Games();
        setX01Games(data);
    }

    const loadPlayers = async () => {
        let data = await PlayerService.loadPlayers('');
        setPlayers(data);
    }

    const loadMore = () => {
        setIndex(index + 2)
        if (index >= x01Games.length) {
          setIsCompleted(true);
        } else {
          setIsCompleted(false);
        }
    }

    useEffect(() => {
		loadFinishedX01Games();
        loadPlayers();
	}, []);

    return (
        <Fragment>
            {x01Games.length > 0 &&
                <Card className="rounded-0 border-0 bg-dark" style={{ width: '18rem' }}>
                    <Card.Body className="m-0 p-0 border-0 rounded-0 bg-tertiary">
                        <Card.Title className="bg-primary p-2 mb-0 text-light text-center span">
                            <div className="fs-6 fw-600">X01</div>
                            <div className="fs-8 mt-1">Recently Finished</div>
                        </Card.Title>
                        <Card.Text as="div" className="p-2 text-light">
                            <ListGroup variant="flush">
                                {initialX01Games.length > 0 && initialX01Games.map((x01Game, idx) => (
                                    <ListGroup.Item key={idx} className="bg-transparent mb-1 border-solid-grey">
                                        <div>
                                            { players.length > 0 && x01Game.players.map((playerId, idx) => (
                                                <Row key={idx}>
                                                    <Col className="text-white fs-8">
                                                        { players ? players.find(player => player.id === playerId).nickname : ''}
                                                        { x01Game.playerModels[playerId].hasWonGame &&
                                                            <i className="ms-1 text-gold fas fa-trophy"></i>
                                                        }
                                                    </Col>
                                                    <Col className="text-white text-center fs-8">{ x01Game.playerModels[playerId].setsWon }</Col>
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
                                {initialX01Games.length < 1 &&
                                    <span className="text-center fs-7">No finished games yet.</span>
                                }
                            </ListGroup>
                            {!isCompleted &&
                                <div className="d-flex justify-content-center mt-2">
                                    <Button onClick={loadMore}>
                                        Load More +
                                    </Button>
                                </div>
                            }
                        </Card.Text>
                    </Card.Body>               
                </Card>
            }
        </Fragment>
    )
}
  
export default FinishedX01Games;