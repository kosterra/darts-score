import { SelectButton } from 'primereact/selectbutton';
import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';

const EliminationInOutConfig = (props) => {
    const {
        gameInOption,
        gameOutOption,
        onInOutChange
    } = props;

    return (
        <div className="container">
            <div className="row">
                <div className="col-12 col-xl-6">
                    <p className="text-center text-faint fs-7 fw-semibold">Starting In</p>
                    <div className="row m-0 mb-3">
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
                    <p className="text-center text-faint fs-7 fw-semibold">Checkout</p>
                    <div className="row m-0 mb-3">
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