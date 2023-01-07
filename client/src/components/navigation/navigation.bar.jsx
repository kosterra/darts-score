import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import logo from '../../resources/img/logo.svg';

export const NavigationBar = () => (
    <Navbar bg="dark" variant="dark">
        <Container fluid={true}>
            <Navbar.Brand href="home">
                <img
                    alt="darts score logo"
                    src={logo}
                    width="60"
                    height="60"
                    className="d-inline-block"
                />
                <span>Darts Score</span>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="navbarScroll" />
            <Navbar.Collapse id="navbarScroll" className="justify-content-end">
                <Nav>
                    <NavDropdown title="Let's play darts" id="navbarScrollingDropdown" menuVariant="dark">
                        <NavDropdown.Item href="x01-new">X01</NavDropdown.Item>
                        <NavDropdown.Item href="cricket-new" disabled>Cricket</NavDropdown.Item>
                    </NavDropdown>
                    <Nav.Link href="training">Training</Nav.Link>
                    <Nav.Link href="statistics">Statistics</Nav.Link>
                    <Nav.Link href="history">History</Nav.Link>
                    <Nav.Link href="about">About</Nav.Link>
                </Nav>
            </Navbar.Collapse>
        </Container>
    </Navbar>
);