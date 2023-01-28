import React, { useContext, useState, useEffect, Fragment } from 'react';

import X01Context from '../../../utils/x01.context';
import X01Service from '../../../services/x01.service';

import DartBoard from './dartboard';
import Checkout from './checkout';
import checkout from '../../../utils/checkout';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Spinner from 'react-bootstrap/Spinner';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';


const ScoreInputBoard = () => {
    const {
        game,
        updateCurrentThrowManual,
        onClickValidateThrow,
        getCurrentThrowScore,
        onClickReturnToPreviousPlayer,
        loading
    } = useContext(X01Context);

    const [ score, setScore ] = useState(game.startingScore);
    const [ showModal, setShowModal ] = useState(false);
    const [ submit, setSubmit ] = useState(false);

    useEffect(() => {
		const clickEnterSubmitForm = (e) => {
			if(e.key === 'Enter') {
				document.getElementById('submit-throws').click();
			}
		}

		document.addEventListener('keyup', clickEnterSubmitForm);

		return () => {
			document.removeEventListener('keyup', clickEnterSubmitForm);
		}
	}, []);

	useEffect(() => {
        let totalScore = getCurrentThrowScore();
        let currentPlayerScore = game.playerModels[game.currentPlayerTurn].score;
        let newCurrentScore = currentPlayerScore - totalScore;
        setScore(newCurrentScore);

        // eslint-disable-next-line
	},[ game.currentThrow ]);

	useEffect(() => {
		if (submit) {
            setSubmit(false);
            X01Service.updateX01(game);
        }
		// eslint-disable-next-line
	}, [game.currentLegThrows]);

	const onChange = (e) => {
		let throwIndex = Number(e.target.name.split('-')[1]) - 1;
        updateCurrentThrowManual(score, e.target.value, throwIndex);
	};

    const onSubmit = (e) => {
		e.preventDefault();
        onClickValidateThrow(score);
        setSubmit(true)
	};
  
  return (
    <Fragment>
        {!game.hasWinner && (
            <Modal show={showModal}
                onHide={() => setShowModal(false)}
                fullscreen={false}
                aria-labelledby="contained-modal-title-vcenter"
                centered>
                <Modal.Header closeButton closeVariant="white">
                    <Modal.Title className="h6">How to manually add a dart score?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="fs-7">If you missed, simply enter 0.</p>
                    <p className="fs-7">For any other scores add:</p>
                    <p className="fs-7">"S" (for a single), "D" (for a double)<br />or "T" (for a treble) before your score.<br />So "D10" scores 20 points, "T20" scores 60 ...</p>
                    <p className="fs-7"><strong>Note that:</strong></p>
                    <p className="fs-7">The inner BULLSEYE (50 points) = "D25"<br /> and the outer BULLSEYE (25 points) = "S25".</p>
                </Modal.Body>
                <Modal.Footer className="p-1">
                    <Button variant="primary" onClick={() => setShowModal(false)} className="p-2">
                        <i className="fas fa-thumbs-up px-1"></i>
                        Got It
                    </Button>
                </Modal.Footer>
            </Modal>
        )}
        {!game.hasWinner && (
            <Container fluid className="mt-4">
                <Row className="gap-5 justify-content-center">
                    <Col className="d-flex justify-content-end col-6">
                        <DartBoard />
                    </Col>
                    <Col className="col-4">
                        <Form className="mt-1" onSubmit={onSubmit}>
                            <div className="mb-2">
                                <span>Click the dartboard or enter score{` `}</span>
                                <i onClick={() => setShowModal(true)} className="fas fa-question-circle" style={{cursor: "pointer"}}></i>
                            </div>
                            <div>
                                <div>
                                    <div>
                                        <Fragment>
                                            <InputGroup className="mb-3 w-50">
                                                <Form.Control
                                                    placeholder="D1"
                                                    aria-label="D1"
                                                    aria-describedby="d1-input"
                                                    value={game.currentThrow[0]}
                                                    onChange={onChange}
                                                    minLength={3}
                                                    maxLength={3}
                                                    />
                                                <Button variant="danger" id="d1-input">
                                                    <i onClick={() => updateCurrentThrowManual(score, '', 0)} className="fas fa-minus-circle"></i>
                                                </Button>
                                            </InputGroup>
                                        </Fragment>
                                    </div>
                                    <div>
                                        {((score !== 1 && score > 0) ||
                                            game.currentThrow[1].trim() !== '' ||
                                            (game.currentThrow[1].trim() === '' && game.currentThrow[2].trim() !== '')) && (
                                                <Fragment>
                                                    <InputGroup className="mb-3 w-50">
                                                        <Form.Control
                                                            placeholder="D2"
                                                            aria-label="D2"
                                                            aria-describedby="d2-input"
                                                            value={game.currentThrow[1]}
                                                            onChange={onChange}
                                                            minLength={3}
                                                            maxLength={3}
                                                            />
                                                        <Button variant="danger" id="d2-input">
                                                            <i onClick={() => updateCurrentThrowManual(score, '', 1)} className="fas fa-minus-circle delete-dart-input"></i>
                                                        </Button>
                                                    </InputGroup>
                                                </Fragment>
                                        )}
                                    </div>
                                    <div>
                                        {((score !== 1 && score > 0) || game.currentThrow[2].trim() !== '') && (
                                            <Fragment>
                                                <InputGroup className="mb-3 w-50">
                                                    <Form.Control
                                                        placeholder="D3"
                                                        aria-label="D3"
                                                        aria-describedby="d3-input"
                                                        value={game.currentThrow[2]}
                                                        onChange={onChange}
                                                        minLength={3}
                                                        maxLength={3}
                                                        />
                                                    <Button variant="danger" id="d3-input">
                                                        <i onClick={() => updateCurrentThrowManual(score, '', 2)} className="fas fa-minus-circle delete-dart-input"></i>
                                                    </Button>
                                                </InputGroup>
                                            </Fragment>
                                        )}
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    {loading.validateThrow ? (
                                        <Button disabled>
                                            <Spinner as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                aria-hidden="true"
                                            />
                                            <span className="visually-hidden">Loading...</span>
                                        </Button>
                                    ) : (
                                        <Button id="submit-throws" type="submit">
                                            <i className="fas fa-paper-plane" title='Send'></i>
                                        </Button>
                                    )}
                                    {game.currentLegThrows.length !== 0 && (
                                        <Button 
                                            onClick={onClickReturnToPreviousPlayer} 
                                            variant="red"
                                            type="button"
                                        >
                                            <i className="fas fa-undo-alt" title='Undo'></i>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Form>
                        {checkout[score] && (
                            <Checkout score={score} />
                        )}
                    </Col>
                </Row>
            </Container>
        )}
    </Fragment>
  )
}

export default ScoreInputBoard