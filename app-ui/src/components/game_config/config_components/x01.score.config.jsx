import { SelectButton } from 'primereact/selectbutton';

import ScoreConfigOptions from '../config_options/score.config.options';

const X01ScoreConfig = (props) => {
    const {
        scoreOption,
        onScoreChange
    } = props;

    return (
        <div className="container">
            <p className="text-center text-shade500 fs-7 fw-semibold">Starting Score</p>
            <div className="row border border-shade600 rounded m-0 py-3 mb-3">
                <div className="col">
                    <SelectButton
                        value={scoreOption}
                        onChange={(e) => onScoreChange('startingScore', e.value)}
                        optionLabel="value"
                        options={ScoreConfigOptions.gameScoreOptions.values}
                        className="p-selectbutton-pills flex-wrap"
                    />
                </div>
            </div>
        </div>
    );
};

export default X01ScoreConfig;