import { Dropdown } from 'primereact/dropdown';

import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';

const SetsLegsConfig = (props) => {
    const {
        onSetsLegsChange,
        setModeOption,
        legModeOption,
        numberOfSetsOption,
        numberOfLegsOption
    } = props

    const {
        setLegModeOptions,
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
                    <p className="setting-title">Sets</p>
                    <div className="row gap-1 mx-0 mt-0 setting-body">
                        <div className="col">
                            <Dropdown
                                value={setModeOption}
                                onChange={(e) => onSetsLegsChange('setMode', e.value)}
                                options={setLegModeOptions.values}
                                optionLabel="value"
                                placeholder="Set Mode"
                                className="w-100"
                            />
                        </div>
                        <div className="col">
                            <Dropdown
                                value={numberOfSetsOption}
                                onChange={(e) => onSetsLegsChange('numberOfSets', e.value)}
                                options={setModeOption === 'First to' ? ftSetsNumberOptions.values : boSetsNumberOptions.values}
                                optionLabel="name"
                                placeholder="Number of Sets"
                                className="w-100"
                            />
                        </div>
                    </div>
                </div>
                <div className="col-12 col-xl-6">
                    <p className="setting-title">Legs</p>
                    <div className="row gap-1 mx-0 mt-0 setting-body">
                        <div className="col">
                            <Dropdown
                                value={legModeOption}
                                onChange={(e) => onSetsLegsChange('legMode', e.value)}
                                options={setLegModeOptions.values}
                                optionLabel="value"
                                placeholder="Leg Mode"
                                className="w-100"
                            />
                        </div>
                        <div className="col">
                            <Dropdown
                                value={numberOfLegsOption}
                                onChange={(e) => onSetsLegsChange('numberOfLegs', e.value)}
                                options={legModeOption === 'First to' ? ftLegsNumberOptions.values : boLegsNumberOptions.values}
                                optionLabel="name"
                                placeholder="Number of Legs"
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