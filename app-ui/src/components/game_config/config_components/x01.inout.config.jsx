import { SelectButton } from 'primereact/selectbutton';

import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';
import { t } from '../../../utils/i18n';
import { SettingTitle } from '../club_rules/club.rules.setup';

const X01InOutConfig = (props) => {
    const {
        legInOption,
        legOutOption,
        onInOutChange,
        // the choices the club offers, and its locks
        inOptions = SetsLegsConfigOptions.legInOptions.values,
        outOptions = SetsLegsConfigOptions.legOutOptions.values,
        inLocked = false,
        outLocked = false,
    } = props;

    return (
        // no container of its own: the boxes line up with the other boxes of the setup
        <div>
            <div className="row">
                <div className="col-12 col-xl-6">
                    <SettingTitle locked={inLocked}>{t('Starting In')}</SettingTitle>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col">
                            <SelectButton
                                value={legInOption}
                                onChange={(e) => onInOutChange('legInMode', e.value)}
                                optionLabel="value"
                                options={inLocked ? inOptions.filter(option => option.value === legInOption) : inOptions}
                                disabled={inLocked}
                                className="p-selectbutton-pills flex-wrap"
                            />
                        </div>
                    </div>
                </div>
                <div className="col-12 col-xl-6">
                    <SettingTitle locked={outLocked}>{t('Checkout')}</SettingTitle>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col">
                            <SelectButton
                                value={legOutOption}
                                onChange={(e) => onInOutChange('legOutMode', e.value)}
                                optionLabel="value"
                                options={outLocked ? outOptions.filter(option => option.value === legOutOption) : outOptions}
                                disabled={outLocked}
                                className="p-selectbutton-pills flex-wrap"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default X01InOutConfig;