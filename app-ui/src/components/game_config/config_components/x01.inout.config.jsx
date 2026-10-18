import { SelectButton } from 'primereact/selectbutton';

import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';

const X01InOutConfig = (props) => {
    const {
        legInOption,
        legOutOption,
        onInOutChange
    } = props;

    return (
        // no container of its own: the boxes line up with the other boxes of the setup
        <div>
            <div className="row">
                <div className="col-12 col-xl-6">
                    <p className="setting-title">Starting In</p>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col">
                            <SelectButton
                                value={legInOption}
                                onChange={(e) => onInOutChange('legInMode', e.value)}
                                optionLabel="value"
                                options={SetsLegsConfigOptions.legInOptions.values}
                                className="p-selectbutton-pills flex-wrap"
                            />
                        </div>
                    </div>
                </div>
                <div className="col-12 col-xl-6">
                    <p className="setting-title">Checkout</p>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col">
                            <SelectButton
                                value={legOutOption}
                                onChange={(e) => onInOutChange('legOutMode', e.value)}
                                optionLabel="value"
                                options={SetsLegsConfigOptions.legOutOptions.values}
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