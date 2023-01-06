import React from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';

const SetsLegsConfig = (props) => {
    const {
            onSetsLegsChange,
            setModeOption,
            legModeOption,
            numberOfSetsOption,
            numberOfLegsOption
        } = props

    const {
            setLegModeOptions,
            ftSetNumberOptions,
            ftLegNumberOptions,
            boSetNumberOptions,
            boLegNumberOptions
        } = SetsLegsConfigOptions;

	return (
        <div className="p-2 container">
            <div className="justify-content-md-center align-items-center row">
                <div className="col">
                    <div className="row">
                        <p className="h6 text-center">Sets</p>
                    </div>
                    <div className="row">
                        <div className="col">
                            <Dropdown onSelect={(e) => onSetsLegsChange('setMode', e)}>
                                <Dropdown.Toggle
                                    id="dropdown-basic"
                                    variant="tertiary"
                                    className="float-end">
                                    {setModeOption}
                                </Dropdown.Toggle>
                                <Dropdown.Menu variant="dark">
                                    {setLegModeOptions.values.map((option, idx) => (
                                        <Dropdown.Item
                                            key={idx}
                                            id={`leg-mode-option-${idx}`}
                                            as="button"
                                            active={setModeOption === option}
                                            eventKey={option}>
                                            {option}
                                        </Dropdown.Item>
                                    ))}
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                        <div className="col">
                            <DropdownButton
                                id="dropdown-item-button"
                                title={numberOfSetsOption + (numberOfSetsOption <=1 ? ' set' : ' sets')}
                                variant="tertiary"
                                menuVariant="dark"
                                onSelect={(e) => onSetsLegsChange('numberOfSets', e)}>
                                {setModeOption === 'First to' && ftSetNumberOptions.values.map((option, idx) => (
                                    <Dropdown.Item
                                        key={idx}
                                        id={`number-of-sets-option-${idx}`}
                                        as="button"
                                        active={Number(numberOfSetsOption) === option}
                                        eventKey={option}>
                                        {option} set{option > 1 && 's'}
                                    </Dropdown.Item>
                                ))}
                                {setModeOption === 'Best of' &&  boSetNumberOptions.values.map((option, idx) => (
                                    <Dropdown.Item
                                        key={idx}
                                        id={`number-of-sets-option-${idx}`}
                                        as="button"
                                        active={Number(numberOfSetsOption) === option}
                                        eventKey={option}>
                                        {option} set{option > 1 && 's'}
                                    </Dropdown.Item>
                                ))}
                            </DropdownButton>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="row">
                        <p className="h6 text-center">Legs</p>
                    </div>
                    <div className="row">
                        <div className="col">
                            <Dropdown onSelect={(e) => onSetsLegsChange('legMode', e)}>
                                <Dropdown.Toggle
                                    id="dropdown-basic"
                                    variant="tertiary"
                                    className="float-end">
                                    {legModeOption}
                                </Dropdown.Toggle>
                                <Dropdown.Menu variant="dark">
                                    {setLegModeOptions.values.map((option, idx) => (
                                        <Dropdown.Item
                                            key={idx}
                                            id={`leg-mode-option-${idx}`}
                                            as="button"
                                            active={legModeOption === option}
                                            eventKey={option}>
                                            {option}
                                        </Dropdown.Item>
                                    ))}
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                        <div className="col">
                            <DropdownButton
                                id="dropdown-item-button"
                                title={numberOfLegsOption + (numberOfLegsOption <=1 ? ' leg' : ' legs')}
                                variant="tertiary"
                                menuVariant="dark"
                                onSelect={(e) => onSetsLegsChange('numberOfLegs', e)}>
                                {legModeOption === 'First to' && ftLegNumberOptions.values.map((option, idx) => (
                                    <Dropdown.Item
                                        key={idx}
                                        id={`number-of-legs-option-${idx}`}
                                        as="button"
                                        active={Number(numberOfLegsOption) === option}
                                        eventKey={option}>
                                        {option} leg{option > 1 && 's'}
                                    </Dropdown.Item>
                                ))}
                                {legModeOption === 'Best of' &&  boLegNumberOptions.values.map((option, idx) => (
                                    <Dropdown.Item
                                        key={idx}
                                        id={`number-of-legs-option-${idx}`}
                                        as="button"
                                        active={Number(numberOfLegsOption) === option}
                                        eventKey={option}>
                                        {option} set{option > 1 && 's'}
                                    </Dropdown.Item>
                                ))}
                            </DropdownButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
	);
};

export default SetsLegsConfig;