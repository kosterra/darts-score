import React, { useState } from 'react';
import ToggleButton from 'react-bootstrap/ToggleButton';
import X01ConfigOptions from '../config_options/score.config.options';

const X01ScoreConfig = () => {
    const { gameScoreOptions } = X01ConfigOptions;
    const [gameScoreOption, setGameScoreOption] = useState(gameScoreOptions.default);

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
                        className={`btn btn-secondary btn-sm text-light ${Number(gameScoreOption) === option ? 'btn-selected' : ''}`}
                        checked={Number(gameScoreOption) === option}
                        onChange={(e) => setGameScoreOption(e.currentTarget.value)}
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