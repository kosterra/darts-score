import React from 'react';
import ToggleButton from 'react-bootstrap/ToggleButton';
import X01ConfigOptions from '../config_options/score.config.options';

const X01ScoreConfig = (props) => {
    const {
        onScoreChange,
        scoreOption
    } = props

    const { gameScoreOptions } = X01ConfigOptions;

	return (
        <div className="p-2 container">
            <div className="justify-content-md-center align-items-center">
                <p className="h6 text-center">Starting Score</p>
                <div className="btn-toolbar justify-content-md-center align-items-center p-3 text-light">
                    {gameScoreOptions.values.map((option, idx) => (
                    <ToggleButton
                        key={idx}
                        id={`score-option-${idx}`}
                        type="radio"
                        name="score-options"
                        value={option}
                        className={`btn btn-secondary btn-sm text-light ${Number(scoreOption) === option ? 'btn-selected' : ''}`}
                        checked={Number(scoreOption) === option}
                        onChange={(e) => onScoreChange('score', e.currentTarget.value)}
                    >
                        {option}
                    </ToggleButton>
                    ))}
                </div>
            </div>
        </div>
	);
};

export default X01ScoreConfig;