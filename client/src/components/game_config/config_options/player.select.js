import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ToggleButton from 'react-bootstrap/ToggleButton';
import X01ConfigOptions from './score.config.options';

const PlayerSelect = () => {
    const { numberOfPlayerOptions } = X01ConfigOptions;
    const [numberOfPlayerOption, setNumberOfPlayerOption] = useState(numberOfPlayerOptions.default);

	return (
        <Container>
            <Row className="justify-content-md-center align-items-center">
                <div><h6>Players</h6></div>
                <ButtonGroup>
                    {numberOfPlayerOptions.values.map((option, idx) => (
                    <ToggleButton
                        key={idx}
                        id={`number-of-players-option-${idx}`}
                        type="radio"
                        name="number-of-players-options"
                        value={option}
                        checked={Number(numberOfPlayerOption) === option}
                        onChange={(e) => setNumberOfPlayerOption(e.currentTarget.value)}
                    >
                        {option}
                    </ToggleButton>
                    ))}
                </ButtonGroup>
            </Row>
        </Container>
	);
};

export default PlayerSelect;