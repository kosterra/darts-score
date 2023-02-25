import React, { useContext } from 'react';

import X01Context from '../../../utils/x01.context';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const X01StatisticsBoard = props => {
    const { playerId } = props
    const {
        game
    } = useContext(X01Context);

    return (
        <Container className="p-0">
            <Row className="justify-content-md-center">
                <Col className="border-dotted-end-grey p-1 my-1 col-6">
                    <div>
                        <div className="h6 my-2 fw-600">Game Averages</div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>Overall</span>
                            <span>{game.playerModels[playerId].averages ? Math.round(game.playerModels[playerId].averages.overall) : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>Begin / Mid Game</span>
                            <span>{game.playerModels[playerId].averages ? Math.round(game.playerModels[playerId].averages.begMidGame) : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>End Game</span>
                            <span>{game.playerModels[playerId].averages ? Math.round(game.playerModels[playerId].averages.endGame) : 0}</span>
                        </div>
                    </div>
                    <div>
                        <div className="h6 my-2 fw-600">Amount</div>
                        <div className="d-flex justify-content-between text-grey fs-9 mb-3">
                            <span>Best Three Darts</span>
                            <span>{game.playerModels[playerId].bestThreeDarts ? game.playerModels[playerId].bestThreeDarts : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>180</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('180') ? game.playerModels[playerId].scoreRanges['180'] : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>160 - 179</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('160-179') ? game.playerModels[playerId].scoreRanges['160-179'] : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>140 - 159</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('140-159') ? game.playerModels[playerId].scoreRanges['140-159'] : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>120 - 139</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('120') ? game.playerModels[playerId].scoreRanges['120-139'] : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>100 - 119</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('100-119') ? game.playerModels[playerId].scoreRanges['100-119'] : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>80 - 99</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('80-99') ? game.playerModels[playerId].scoreRanges['80-99'] : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>60 - 79</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('60-79') ? game.playerModels[playerId].scoreRanges['60-79'] : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>40 - 59</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('40-59') ? game.playerModels[playerId].scoreRanges['40-59'] : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>20 - 39</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('20-39') ? game.playerModels[playerId].scoreRanges['20-39'] : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>1 - 19</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('1-19') ? game.playerModels[playerId].scoreRanges['1-19'] : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>ZERO</span>
                            <span>{game.playerModels[playerId].scoreRanges && game.playerModels[playerId].scoreRanges.hasOwnProperty('ZERO') ? game.playerModels[playerId].scoreRanges['ZERO'] : 0}</span>
                        </div>
                    </div>
                    <div>
                        <div className="h6 my-2 fw-600">Checkout</div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span>Highest</span>
                            <span>{game.playerModels[playerId].checkoutScores ? Math.max(0, ...Object.keys(game.playerModels[playerId].checkoutScores)) : 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9 mb-3">
                            <span>Doubles Hit</span>
                            <span>{game.playerModels[playerId].checkoutScores ? Object.values(game.playerModels[playerId].checkoutScores).reduce((partialSum, a) => partialSum + a, 0) : 0}</span>
                        </div>
                        {[...Array(20)].map((x, i) =>
                            <div className="d-flex justify-content-between text-grey fs-9" key={i}>
                                <span>Double {i+1}</span>
                                <span>{((((game.playerModels[playerId].checkout || {}).sections || {})[i+1] || {}).hit || 0)} / {((((game.playerModels[playerId].checkout || {}).sections || {})[i+1] || {}).total || 0)}</span>
                            </div>
                        )}
                        <div className="d-flex justify-content-between text-grey fs-9" >
                            <span>BULLSEYE</span>
                            <span>{((((game.playerModels[playerId].checkout || {}).sections || {})['25'] || {}).hit || 0)} / {((((game.playerModels[playerId].checkout || {}).sections || {})['25'] || {}).total || 0)}</span>
                        </div>
                    </div>
                </Col>
                <Col className="p-1 my-1 col-6">
                    <div className="h6 my-2 fw-600">Per Round Score</div>
                    <div className="container">
                        <div className="row align-items-baseline mb-1" key="initial">
                            <span className="col-2 p-0 fw-600 fs-8">Initial</span>
                            <span className="col-2 p-0 fs-9 text-grey text-right"> </span>
                            <span className="col-2 p-0 fs-9 text-grey text-right"> </span>
                            <span className="col-2 p-0 fs-9 text-grey text-right"> </span>
                            <span className="col-2 p-0 fs-9 fw-600 text-grey text-right"> </span>
                            <span className="col-2 p-0 fw-600 fs-8 text-right">501</span>
                        </div>
                        {game.currentLegThrows.filter(e => e.playerId === playerId).map((throws, index) => (
                            <div className="row align-items-baseline mb-1" key={index}>
                                <span className="col-2 p-0 fw-600 fs-8">R{index + 1}</span>
                                <span className="col-2 p-0 fs-9 font-italic text-grey text-right">{throws.darts[0]}</span>
                                <span className="col-2 p-0 fs-9 font-italic text-grey text-right">{throws.darts[1]}</span>
                                <span className="col-2 p-0 fs-9 font-italic text-grey text-right">{throws.darts[2]}</span>
                                <span className='col-2 p-0 fs-9 fw-600 text-grey text-right'>{throws.roundScore}</span>
                                <span className="col-2 p-0 fw-600 fs-8 text-right">{throws.scoreLeft}</span>
                            </div>
                        ))}
                    </div>
                </Col>
            </Row>
        </Container>
    )
}

export default X01StatisticsBoard