import { SelectButton } from 'primereact/selectbutton';

import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';

const X01InOutConfig = (props) => {
    const {
        legInOption,
        legOutOption,
        onInOutChange
    } = props;

    return (
        <div className="container">
            <div className="row">
                <div className="col-12 col-xl-6">
                    <p className="text-center text-shade500 fs-7 fw-semibold">Starting In</p>
                    <div className="row border border-shade600 rounded m-0 py-3 mb-3">
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
                    <p className="text-center text-shade500 fs-7 fw-semibold">Checkout</p>
                    <div className="row border border-shade600 rounded m-0 py-3 mb-3">
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