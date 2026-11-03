import { Dropdown } from 'primereact/dropdown';

import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';
import { t } from '../../../utils/i18n';
import { SettingTitle } from '../club_rules/club.rules.setup';

const SetsLegsConfig = (props) => {
    const {
        onSetsLegsChange,
        setModeOption,
        legModeOption,
        numberOfSetsOption,
        numberOfLegsOption,
        // the club's locks ({ setMode, numberOfSets, legMode, numberOfLegs }) and the modes it offers
        locked = {},
        modeOptions = SetsLegsConfigOptions.setLegModeOptions.values,
    } = props

    const {
        ftLegsNumberOptions,
        boLegsNumberOptions,
        ftSetsNumberOptions,
        boSetsNumberOptions
    } = SetsLegsConfigOptions;

    return (
        // no container of its own: the boxes line up with the other boxes of the setup; in each box the
        // mode and the number side by side, so Sets and Legs are as tall as each other
        <div>
            <div className="row setting-pair">
                <div className="col-12 col-xl-6">
                    <SettingTitle locked={locked.setMode || locked.numberOfSets}>{t('Sets')}</SettingTitle>
                    <div className="setting-body sets-legs-fields">
                        <div className="sets-legs-field">
                            <Dropdown
                                value={setModeOption}
                                onChange={(e) => onSetsLegsChange('setMode', e.value)}
                                options={modeOptions}
                                disabled={locked.setMode}
                                optionLabel="value"
                                placeholder={t('Set mode')}
                                className="w-100"
                            />
                        </div>
                        <div className="sets-legs-field">
                            <Dropdown
                                value={numberOfSetsOption}
                                onChange={(e) => onSetsLegsChange('numberOfSets', e.value)}
                                disabled={locked.numberOfSets}
                                options={setModeOption === 'First to' ? ftSetsNumberOptions.values : boSetsNumberOptions.values}
                                optionLabel="name"
                                placeholder={t('Number of sets')}
                                className="w-100"
                            />
                        </div>
                    </div>
                </div>
                <div className="col-12 col-xl-6">
                    <SettingTitle locked={locked.legMode || locked.numberOfLegs}>{t('Legs')}</SettingTitle>
                    <div className="setting-body sets-legs-fields">
                        <div className="sets-legs-field">
                            <Dropdown
                                value={legModeOption}
                                onChange={(e) => onSetsLegsChange('legMode', e.value)}
                                options={modeOptions}
                                disabled={locked.legMode}
                                optionLabel="value"
                                placeholder={t('Leg mode')}
                                className="w-100"
                            />
                        </div>
                        <div className="sets-legs-field">
                            <Dropdown
                                value={numberOfLegsOption}
                                onChange={(e) => onSetsLegsChange('numberOfLegs', e.value)}
                                disabled={locked.numberOfLegs}
                                options={legModeOption === 'First to' ? ftLegsNumberOptions.values : boLegsNumberOptions.values}
                                optionLabel="name"
                                placeholder={t('Number of legs')}
                                className="w-100"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetsLegsConfig;