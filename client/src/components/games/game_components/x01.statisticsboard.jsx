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
                        <div className="h6 my-2 fw-600">Averages</div>
                        <div className="d-flex justify-content-between text-grey fs-9 border-solid-bottom-grey">
                            <span className="col-4"></span>
                            <span className="col-2 fw-600 text-center">L</span>
                            <span className="col-2 fw-600 text-center">S</span>
                            <span className="col-2 fw-600 text-center">G</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">Overall</span>
                            <span className="col-2 text-center">{Math.round((((game.playerModels[playerId].averages || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg]|| {}).overall || 0)}</span>
                            <span className="col-2 text-center">{Math.round(((game.playerModels[playerId].averages || {})['set-' + game.currentSet] || {}).overall || 0)}</span>
                            <span className="col-2 text-center">{Math.round(((game.playerModels[playerId].averages || {}).game || {}).overall || 0)}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">Begin / Mid</span>
                            <span className="col-2 text-center">{Math.round((((game.playerModels[playerId].averages || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg]|| {}).begMidLeg || 0)}</span>
                            <span className="col-2 text-center">{Math.round(((game.playerModels[playerId].averages || {})['set-' + game.currentSet] || {}).begMidSet || 0)}</span>
                            <span className="col-2 text-center">{Math.round(((game.playerModels[playerId].averages || {}).game || {}).begMidGame || 0)}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">End</span>
                            <span className="col-2 text-center">{Math.round((((game.playerModels[playerId].averages || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg]|| {}).endLeg || 0)}</span>
                            <span className="col-2 text-center">{Math.round(((game.playerModels[playerId].averages || {})['set-' + game.currentSet] || {}).endSet || 0)}</span>
                            <span className="col-2 text-center">{Math.round(((game.playerModels[playerId].averages || {}).game || {}).endGame || 0)}</span>
                        </div>
                    </div>
                    <div>
                        <div className="h6 my-2 fw-600">Amount</div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">Best Three</span>
                            <span className="col-2 text-center">{((((game.playerModels[playerId].bestThreeDarts || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {}).value || 0)}</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].bestThreeDarts || {})['set-' + game.currentSet] || {}).value || 0)}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].bestThreeDarts.game || {}).value || 0)}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9 mt-3">
                            <span className="col-4">180</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['180'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['180'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['180'] || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">160 - 179</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['160-179'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['160-179'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['160-179'] || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">140 - 159</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['140-159'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['140-159'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['140-159'] || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">120 - 139</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['120-139'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['120-139'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['120-139'] || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">100 - 119</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['100-119'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['100-119'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['100-119'] || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">80 - 99</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['80-99'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['80-99'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['80-99'] || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">60 - 79</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['60-79'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['60-79'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['60-79'] || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">40 - 59</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['40-59'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['40-59'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['40-59'] || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">20 - 39</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['20-39'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['20-39'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['20-39'] || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">1 - 19</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['1-19'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['1-19'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['1-19'] || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">ZERO</span>
                            <span className="col-2 text-center">{(((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})['ZERO'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {})['set-' + game.currentSet] || {})['ZERO'] || 0}</span>
                            <span className="col-2 text-center">{((game.playerModels[playerId].scoreRanges || {}).game || {})['ZERO'] || 0}</span>
                        </div>
                    </div>
                    <div>
                        <div className="h6 my-2 fw-600">Checkout</div>
                        <div className="d-flex justify-content-between text-grey fs-9">
                            <span className="col-4">Highest</span>
                            <span className="col-2 text-center">{Math.max(0, ...Object.keys((((game.playerModels[playerId].checkoutScores || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {})).filter((key) => !isNaN(key)))}</span>
                            <span className="col-2 text-center">{Math.max(0, ...Object.keys(((game.playerModels[playerId].checkoutScores || {})['set-' + game.currentSet] || {})).filter((key) => !isNaN(key)))}</span>
                            <span className="col-2 text-center">{Math.max(0, ...Object.keys(((game.playerModels[playerId].checkoutScores || {})['game'] || {})).filter((key) => !isNaN(key)))}</span>
                        </div>
                        <div className="d-flex justify-content-between text-grey fs-9 mb-3">
                            <span className="col-4">Doubles Hit</span>
                            <span className="col-2 text-center">{Object.values(((((game.playerModels[playerId].checkoutScores || {})['set-' + game.currentSet] || {})['leg-' + game.currentSetLeg] || {}))).filter((key) => !isNaN(key)).reduce((partialSum, a) => partialSum + a, 0)}</span>
                            <span className="col-2 text-center">{Object.values((((game.playerModels[playerId].checkoutScores || {})['set-' + game.currentSet] || {}))).filter((key) => !isNaN(key)).reduce((partialSum, a) => partialSum + a, 0)}</span>
                            <span className="col-2 text-center">{Object.values((((game.playerModels[playerId].checkoutScores || {})['game'] || {}))).filter((key) => !isNaN(key)).reduce((partialSum, a) => partialSum + a, 0)}</span>
                        </div>
                        {[...Array(20)].map((x, i) => ((game.playerModels[playerId].checkout || {}).sections || {})[i+1] ? (
                                <div key={i+1} className="d-flex justify-content-between text-grey fs-9">
                                    <span className="col-10">Double {i+1}</span>
                                    <span className="d-flex justify-content-between col-2 text-center">
                                        <span className="col-4 text-center">{((((game.playerModels[playerId].checkout || {}).sections || {})[i+1] || {}).hit || 0)}</span>
                                        <span className="col-4 text-center"> / </span>
                                        <span className="col-4 text-center">{((((game.playerModels[playerId].checkout || {}).sections || {})[i+1] || {}).total || 0)}</span>
                                    </span>
                                </div>
                            ) : null
                        )}
                        {((((game.playerModels[playerId].checkout || {}).sections || {})['25'] || {}).total || 0) > 0 &&
                            <div className="d-flex justify-content-between text-grey fs-9">
                                <span className="col-10">BULLSEYE</span>
                                <span className="d-flex justify-content-between col-2 text-center">
                                    <span className="col-4 text-center">{((((game.playerModels[playerId].checkout || {}).sections || {})['25'] || {}).hit || 0)}</span>
                                    <span className="col-4 text-center"> / </span>
                                    <span className="col-4 text-center">{((((game.playerModels[playerId].checkout || {}).sections || {})['25'] || {}).total || 0)}</span>
                                </span>
                            </div>
                        }
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