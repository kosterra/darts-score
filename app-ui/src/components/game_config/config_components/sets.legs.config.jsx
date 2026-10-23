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
        // no container of its own: the boxes line up with the other boxes of the setup
        <div>
            <div className="row">
                <div className="col-12 col-xl-6">
                    <SettingTitle locked={locked.setMode || locked.numberOfSets}>{t('Sets')}</SettingTitle>
                    <div className="row gap-1 mx-0 mt-0 setting-body">
                        <div className="col">
                            <Dropdown
                                value={setModeOption}
                                onChange={(e) => onSetsLegsChange('setMode', e.value)}
                                options={modeOptions}
                                disabled={locked.setMode}
                                optionLabel="value"
                                placeholder={t('Set Mode')}
                                className="w-100"
                            />
                        </div>
                        <div className="col">
                            <Dropdown
                                value={numberOfSetsOption}
                                onChange={(e) => onSetsLegsChange('numberOfSets', e.value)}
                                disabled={locked.numberOfSets}
                                options={setModeOption === 'First to' ? ftSetsNumberOptions.values : boSetsNumberOptions.values}
                                optionLabel="name"
                                placeholder={t('Number of Sets')}
                                className="w-100"
                            />
                        </div>
                    </div>
                </div>
                <div className="col-12 col-xl-6">
                    <SettingTitle locked={locked.legMode || locked.numberOfLegs}>{t('Legs')}</SettingTitle>
                    <div className="row gap-1 mx-0 mt-0 setting-body">
                        <div className="col">
                            <Dropdown
                                value={legModeOption}
                                onChange={(e) => onSetsLegsChange('legMode', e.value)}
                                options={modeOptions}
                                disabled={locked.legMode}
                                optionLabel="value"
                                placeholder={t('Leg Mode')}
                                className="w-100"
                            />
                        </div>
                        <div className="col">
                            <Dropdown
                                value={numberOfLegsOption}
                                onChange={(e) => onSetsLegsChange('numberOfLegs', e.value)}
                                disabled={locked.numberOfLegs}
                                options={legModeOption === 'First to' ? ftLegsNumberOptions.values : boLegsNumberOptions.values}
                                optionLabel="name"
                                placeholder={t('Number of Legs')}
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