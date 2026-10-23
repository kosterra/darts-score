import { SelectButton } from 'primereact/selectbutton';

import ScoreConfigOptions from '../config_options/score.config.options';
import { t } from '../../../utils/i18n';
import { SettingTitle } from '../club_rules/club.rules.setup';

const X01ScoreConfig = (props) => {
    const {
        scoreOption,
        onScoreChange,
        // the starting scores offered, e.g. fewer for a training; all of them by default
        options = ScoreConfigOptions.gameScoreOptions.values,
        // e.g. pills-fit: five in a row
        pillsClassName = '',
        // a rule of the club: shown, not chosen
        locked = false,
    } = props;

    return (
        // no container of its own: the boxes line up with the other boxes of the setup
        <div>
            <SettingTitle locked={locked}>{t('Starting Score')}</SettingTitle>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col">
                    <SelectButton
                        value={scoreOption}
                        onChange={(e) => onScoreChange('startingScore', e.value)}
                        optionLabel="value"
                        options={locked ? options.filter(option => option.value === scoreOption) : options}
                        disabled={locked}
                        className={`p-selectbutton-pills flex-wrap ${pillsClassName}`}
                    />
                </div>
            </div>
        </div>
    );
};

export default X01ScoreConfig;