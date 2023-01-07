import React from 'react';

import Container from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row'
import Card from 'react-bootstrap/Card';
import X01Config from '../../components/game_config/x01.config'

const X01ConfigPage = () => {

    return (
        <>
            <Container className="bg-transparent border-0 m-4">
                <Row className="justify-content-md-center align-items-center">
                    <Card bg="dark" className="m-0 p-0 border-0 rounded-0" style={{ width: "50rem" }}>
                        <Card.Body className="m-0 p-0 border-0 rounded-0">
                            <Card.Title className="bg-primary p-3 text-light text-center">X01</Card.Title>
                            <Card.Text as="div" className="p-2 text-light">
                                <X01Config />
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Row>
            </Container>
        </>
	);
};

export default X01ConfigPage;