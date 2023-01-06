import React from 'react';
import ToggleButton from 'react-bootstrap/ToggleButton';
import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';

const X01InOutConfig = (props) => {
    const {
        legInOption,
        legOutOption,
        onInOutChange,
    } = props

    const { legInOptions, legOutOptions } = SetsLegsConfigOptions;

	return (
        <div className="p-2 container">
            <div className="justify-content-md-center align-items-center row">
                <div className="col">
                    <p className="h6 text-center">Starting In</p>
                    <div className="btn-toolbar justify-content-md-center align-items-center p-3 text-light">
                        {legInOptions.values.map((option, idx) => (
                        <ToggleButton
                            key={idx}
                            id={`in-option-${idx}`}
                            type="radio"
                            name="in-options"
                            value={option}
                            className={`btn btn-secondary btn-sm text-light ${legInOption === option ? 'btn-selected' : ''}`}
                            checked={legInOption === option}
                            onChange={(e) => onInOutChange('legInMode', e.currentTarget.value)}
                        >
                            {option}
                        </ToggleButton>
                        ))}
                    </div>
                </div>
                <div className="col">
                    <p className="h6 text-center">Checkout</p>
                    <div className="btn-toolbar justify-content-md-center align-items-center p-3 text-light">
                        {legOutOptions.values.map((option, idx) => (
                        <ToggleButton
                            key={idx}
                            id={`out-option-${idx}`}
                            type="radio"
                            name="out-options"
                            value={option}
                            className={`btn btn-secondary btn-sm text-light ${legOutOption === option ? 'btn-selected' : ''}`}
                            checked={legOutOption === option}
                            onChange={(e) => onInOutChange('legOutMode', e.currentTarget.value)}
                        >
                            {option}
                        </ToggleButton>
                        ))}
                    </div>
                </div>
            </div>
        </div>
	);
};

export default X01InOutConfig;