import { SelectButton } from 'primereact/selectbutton';
import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';

const EliminationInOutConfig = (props) => {
    const {
        gameInOption,
        gameOutOption,
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
                                value={gameInOption}
                                onChange={(e) => onInOutChange('gameInMode', e.value)}
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
                                value={gameOutOption}
                                onChange={(e) => onInOutChange('gameOutMode', e.value)}
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

export default EliminationInOutConfig;