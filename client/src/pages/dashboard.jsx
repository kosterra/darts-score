import React from 'react';

import RunningX01Games from '../components/dashboard/running.x01';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const Dashboard = () => {
	return (
		<Container fluid>
		<Container className="mx-2 mt-4">
			<Row>
				<Col className="col-3 justify-content-center">
					<RunningX01Games />
				</Col>
				<Col className="col-6">
					Other Content
				</Col>
			</Row>
		</Container>
		</Container>
	);
};

export default Dashboard;