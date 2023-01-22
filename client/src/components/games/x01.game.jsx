import React, { Fragment, useContext } from 'react';

import Container from 'react-bootstrap/esm/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from '../UIElement/Spinner';
import PageErrorMessage from '../UIElement/PageErrorMessage';

import X01Context from '../../utils/x01.context';

import X01ScoreBoard from '../../components/games/game_components/x01.scoreboard';
import X01StatisticsBoard from '../../components/games/game_components/x01.statisticsboard';
import ScoreInputBoard from '../../components/games/game_components/score.input.board';

const X01Game = () => {
    const { game, players, loading } = useContext(X01Context)

    if (loading.initGameLoading) {
        return <Spinner spinnerContClassName={"spinner-cont-large"} spinnerImgClassName={"spinnerSmall"}/>
    }
      
    if (!game.gameIsRunning) {
        return (
            <PageErrorMessage title={'Error'} message={'You need to initialise a new game'}>
                New game
            </PageErrorMessage>
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
            <Container fluid>
                <Row className="justify-content-md-center">
                    {Object.entries(players).map(([idx, player]) => (
                        <Col key={`score-board-col-${idx}`} className={`col-3 border-dotted-top-grey border-dotted-bottom-grey ${Number(idx) < players.length - 1 ? 'border-dotted-end-grey' : ''}`}>
                            <X01ScoreBoard key={`score-board-${idx}`} playerId={player.id} idx={idx} />
                        </Col>
                    ))}
                </Row>
            </Container>
            <ScoreInputBoard />
            <Container fluid className="mt-4">
                <Row className="justify-content-md-center">
                    {Object.entries(players).map(([idx, player]) => (
                        <Col key={`statistics-board-col-${idx}`} className={`col-3 border-dotted-top-grey border-dotted-bottom-grey ${Number(idx) < players.length - 1 ? 'border-dotted-end-grey' : ''}`}>
                            <X01StatisticsBoard key={`statistics-board-${idx}`} playerId={player.id} />
                        </Col>
                    ))}
                </Row>
            </Container>
        </div>
      </Fragment>
    )
}
  
export default X01Game;
