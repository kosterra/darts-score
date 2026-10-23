import { SelectButton } from 'primereact/selectbutton';

import ScoreConfigOptions from '../config_options/score.config.options';
import { t } from '../../../utils/i18n';
import { SettingTitle } from '../club_rules/club.rules.setup';

const EliminationScoreConfig = (props) => {
    const {
        scoreOption,
        onScoreChange,
        // the scores the club offers, and its lock
        options = ScoreConfigOptions.gameScoreOptions.values,
        locked = false,
    } = props;

    return (
        // no container of its own: the boxes line up with the other boxes of the setup
        <div>
            <SettingTitle locked={locked}>{t('Target Score')}</SettingTitle>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col">
                    <SelectButton
                        value={scoreOption}
                        onChange={(e) => onScoreChange('targetScore', e.value)}
                        optionLabel="value"
                        options={locked ? options.filter(option => option.value === scoreOption) : options}
                        disabled={locked}
                        className="p-selectbutton-pills flex-wrap"
                    />
                </div>
            </div>
        </div>
    );
};

export default EliminationScoreConfig;