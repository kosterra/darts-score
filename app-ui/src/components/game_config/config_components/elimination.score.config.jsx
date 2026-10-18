import { SelectButton } from 'primereact/selectbutton';

import ScoreConfigOptions from '../config_options/score.config.options';

const EliminationScoreConfig = (props) => {
    const {
        scoreOption,
        onScoreChange
    } = props;

    return (
        <div className="container">
            <p className="text-center text-faint fs-7 fw-semibold">Target Score</p>
            <div className="row m-0 mb-3">
                <div className="col">
                    <SelectButton
                        value={scoreOption}
                        onChange={(e) => onScoreChange('targetScore', e.value)}
                        optionLabel="value"
                        options={ScoreConfigOptions.gameScoreOptions.values}
                        className="p-selectbutton-pills flex-wrap"
                    />
                </div>
            </div>
        </div>
    );
};

export default EliminationScoreConfig;