import React, { Fragment, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import Container from 'react-bootstrap/esm/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Rings } from 'react-loader-spinner';

import X01Context from '../../utils/x01.context';
import X01Models from '../../models/x01.models';
import X01Service from '../../services/x01.service';

import X01ScoreBoard from './game_components/x01.scoreboard';
import X01StatisticsBoard from './game_components/x01.statisticsboard';
import ScoreInputBoard from './game_components/score.input.board';
import X01GameStatistics from './game_components/x01.game.statistics';

import Button from 'react-bootstrap/Button';

const X01Game = () => {
    const navigate = useNavigate();

    const {
        game,
        players,
        loading
    } = useContext(X01Context);

	const onNewGame = () => {
		navigate("/x01-new", { replace: true });
	};

	const onFinishGame = () => {
		navigate("/", { replace: true });
	};

	const onRestartGame = async () => {
        let newMatchSetup = {...game};

		newMatchSetup.hasWinner = false;
		newMatchSetup.startingPlayerLeg = game.players[0];
		newMatchSetup.startingPlayerSet = game.players[0];
		newMatchSetup.currentPlayerTurn = game.players[0];

		newMatchSetup.playerModels = {};
		newMatchSetup.players.forEach(player => {
			let x01PlayerModel = {...X01Models.X01PlayerModel};
			x01PlayerModel.score = Number(newMatchSetup.gameType);
			newMatchSetup.playerModels[player] = x01PlayerModel;
		});

		let newGame = await X01Service.createX01(game)
        navigate('/x01/' + newGame.id);
	};

    if (loading.initGameLoading) {
        return (
            <Container fluid className="m-5">
                <div className="d-flex justify-content-center align-items-center">
                    <span className="display-2 me-2 fw-600 text-white">L</span>
                    <Rings
                        height="120"
                        width="120"
                        color="#528b6e"
                        radius="12"
                        wrapperStyle={{}}
                        wrapperClass=""
                        visible={true}
                        ariaLabel="rings-loading"
                    />
                    <span className="display-2 ms-2 fw-600 text-white">ading</span>
                </div>
            </Container>
        )
    }

    return (
      <Fragment>
        <div className="mx-4">
            <div className="d-flex justify-content-center mb-4">
                <div className="d-flex flex-column align-items-center bbr-12 bg-tertiary p-2">
                    <div className="fs-7">{game.setMode} <strong>{game.numberOfSets}</strong> Set{game.numberOfSets > 1 && 's'} - {game.legMode} <strong>{game.numberOfLegs}</strong> Leg{game.numberOfLegs > 1 && 's'}</div>
                    <div className="fs-9 pt-1">{game.legInMode} / {game.legOutMode}</div>
                </div>
            </div>
            {!game.hasWinner && (
                <Container fluid>
                    <Row className="justify-content-md-center">
                        {game.players.length > 0 && game.players.map((playerId, idx) => (
                            <Col key={`score-board-col-${idx}`} className={`col-3 border-dotted-top-grey border-dotted-bottom-grey ${Number(idx) < players.length - 1 ? 'border-dotted-end-grey' : ''}`}>
                                <X01ScoreBoard key={`score-board-${idx}`} playerId={playerId} idx={idx} />
                            </Col>
                        ))}
                    </Row>
                </Container>
            )}
            {game.hasWinner && (
                <Container>
                    <Row>
                        <Col className="d-flex flex-column justify-content-center align-items-center gap-2">
                            <X01GameStatistics />
                            <div className="d-grid gap-2 col-2 mx-auto">
                                <Button onClick={onRestartGame} variant="primary">
                                    <i className="fas fa-sync-alt pe-2" title='Send'></i>
                                    PLAY AGAIN
                                </Button>
                                <Button onClick={onNewGame} variant="outline-primary">
                                    <i className="fas fa-plus pe-2" title='Send'></i>
                                    NEW GAME
                                </Button>
                                <Button onClick={onFinishGame} variant="outline-primary">
                                    <i className="fas fa-home pe-2" title='Send'></i>
                                    BACK HOME
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Container>
            )}
            <ScoreInputBoard />
            {!game.hasWinner && (
                <Container fluid className="mt-4">
                    <Row className="justify-content-md-center">
                        {Object.entries(players).map(([idx, player]) => (
                            <Col key={`statistics-board-col-${idx}`} className={`col-3 border-dotted-top-grey border-dotted-bottom-grey ${Number(idx) < players.length - 1 ? 'border-dotted-end-grey' : ''}`}>
                                <X01StatisticsBoard key={`statistics-board-${idx}`} playerId={player.id} />
                            </Col>
                        ))}
                    </Row>
                </Container>
            )}
        </div>
      </Fragment>
    )
}
  
export default X01Game;
