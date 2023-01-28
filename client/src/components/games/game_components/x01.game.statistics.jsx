import React, { useContext, useState } from 'react';

import X01Context from '../../../utils/x01.context';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

const X01GameStatistics = () => {
    const {
        game,
        players
    } = useContext(X01Context);

    return (
        <Container className="w-50 mb-4">
                { players && players.length > 0 &&
                    <span className="h2 mt-3">{players.find((player) => player.id === game.currentPlayerTurn).nickname} wins</span>
                }
                <span className="display-1 my-3 text-gold"><i className="fas fa-trophy" title="trophy"></i></span>
                            
                <Tabs
                    defaultActiveKey="overall"
                    id="justify-tab-example"
                    className="mb-3"
                    justify
                >
                    <Tab eventKey="overall" title="Overall">
                        <div>bli</div>
                    </Tab>
                    <Tab eventKey="set-1" title="Set 1">
                        <div>bla</div>
                    </Tab>
                    <Tab eventKey="set-2" title="Set 2">
                        <div>blupp</div>
                    </Tab>
                    <Tab eventKey="set-3" title="Set 3">
                        <div>blupp</div>
                    </Tab>
                    <Tab eventKey="set-4" title="Set 4">
                        <div>blupp</div>
                    </Tab>
                    <Tab eventKey="set-5" title="Set 5">
                        <div>blupp</div>
                    </Tab>
                </Tabs>

            <div className="mt-2">
                <div className="d-flex justify-content-between align-items-baseline">
                    <span className="ms-1 fs-8 text-grey">{game.playerModels[game.players[0]].setsWon}</span>
                    <span className="fs-7">Won Sets</span>
                    <span className="me-1 fs-8 text-grey">{game.playerModels[game.players[1]].setsWon}</span>
                </div>
                <ProgressBar className="border-0 radius-0">
                    <ProgressBar className="border-0 radius-0" variant="primary" now={66} key={1}/>
                    <ProgressBar className="border-0 radius-0" variant="secondary" now={34} key={2} />
                </ProgressBar>
            </div>
            <div className="mt-2">
                <div className="d-flex justify-content-between align-items-baseline">
                    <span className="ms-1 fs-8 text-grey">{game.playerModels[game.players[0]].setsWon}</span>
                    <span className="fs-7">Won Legs</span>
                    <span className="me-1 fs-8 text-grey">{game.playerModels[game.players[1]].setsWon}</span>
                </div>
                <ProgressBar className="border-0 radius-0">
                    <ProgressBar className="border-0 radius-0" variant="primary" now={66} key={1}/>
                    <ProgressBar className="border-0 radius-0" variant="secondary" now={34} key={2} />
                </ProgressBar>
            </div>
            <div className="mt-2">
                <div className="d-flex justify-content-between align-items-baseline">
                    <span className="ms-1 fs-8 text-grey">{game.playerModels[game.players[0]].scoreRanges['180']}</span>
                    <span className="fs-7">180s</span>
                    <span className="me-1 fs-8 text-grey">{game.playerModels[game.players[1]].scoreRanges['180']}</span>
                </div>
                <ProgressBar className="border-0 radius-0">
                    <ProgressBar className="border-0 radius-0" variant="primary" now={66} key={1}/>
                    <ProgressBar className="border-0 radius-0" variant="secondary" now={34} key={2} />
                </ProgressBar>
            </div>
            <div className="mt-2">
                <div className="d-flex justify-content-between align-items-baseline">
                    <span className="ms-1 fs-8 text-grey">{game.playerModels[game.players[0]].scoreRanges['140-159']}</span>
                    <span className="fs-7">140+</span>
                    <span className="me-1 fs-8 text-grey">{game.playerModels[game.players[1]].scoreRanges['140-159']}</span>
                </div>
                <ProgressBar className="border-0 radius-0">
                    <ProgressBar className="border-0 radius-0" variant="primary" now={66} key={1}/>
                    <ProgressBar className="border-0 radius-0" variant="secondary" now={34} key={2} />
                </ProgressBar>
            </div>
            <div className="mt-2">
                <div className="d-flex justify-content-between align-items-baseline">
                    <span className="ms-1 fs-8 text-grey">{game.playerModels[game.players[0]].scoreRanges['180']}</span>
                    <span className="fs-7">100+</span>
                    <span className="me-1 fs-8 text-grey">{game.playerModels[game.players[1]].scoreRanges['180']}</span>
                </div>
                <ProgressBar className="border-0 radius-0">
                    <ProgressBar className="border-0 radius-0" variant="primary" now={66} key={1}/>
                    <ProgressBar className="border-0 radius-0" variant="secondary" now={34} key={2} />
                </ProgressBar>
            </div>
            <div className="mt-2">
                <div className="d-flex justify-content-between align-items-baseline">
                    <span className="ms-1 fs-8 text-grey">{game.playerModels[game.players[0]].averages['begMidGame']}</span>
                    <span className="fs-7">Average</span>
                    <span className="me-1 fs-8 text-grey">{game.playerModels[game.players[1]].averages['begMidGame']}</span>
                </div>
                <ProgressBar className="border-0 radius-0">
                    <ProgressBar className="border-0 radius-0" variant="primary" now={66} key={1}/>
                    <ProgressBar className="border-0 radius-0" variant="secondary" now={34} key={2} />
                </ProgressBar>
            </div>
            <div className="mt-2">
                <div className="d-flex justify-content-between align-items-baseline">
                    <span className="ms-1 fs-8 text-grey">{game.playerModels[game.players[0]].setsWon}</span>
                    <span className="fs-7">Checkouts</span>
                    <span className="me-1 fs-8 text-grey">{game.playerModels[game.players[1]].setsWon}</span>
                </div>
                <ProgressBar className="border-0 radius-0">
                    <ProgressBar className="border-0 radius-0" variant="primary" now={66} key={1}/>
                    <ProgressBar className="border-0 radius-0" variant="secondary" now={34} key={2} />
                </ProgressBar>
            </div>
        </Container>
    )
}
    
export default X01GameStatistics;