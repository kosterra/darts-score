import { SelectButton } from 'primereact/selectbutton';

import { FLYING_DARTS_OPTIONS } from '../../../utils/flights';

const HINTS = {
    players: 'As each player set it on their player profile (on for everyone who did not switch it off).',
    on: 'The darts fly onto the board for everyone in this game.',
    off: 'The fields light up at once, without darts, for everyone in this game.',
};

/**
 * Whether the darts fly onto the board in an X01 game: as each player set
 * it, or on or off for everyone. value: 'players' | 'on' | 'off'.
 */
const FlyingDartsConfig = ({ value = 'players', onChange }) => (
    <div>
        <p className="setting-title">Flying darts on the board</p>
        <div className="row mx-0 mt-0 setting-body">
            <div className="col d-flex flex-column gap-2">
                <SelectButton
                    value={value}
                    onChange={(e) => e.value && onChange(e.value)}
                    options={FLYING_DARTS_OPTIONS}
                    className="p-selectbutton-pills flex-wrap"
                    aria-label="Flying darts on the board"
                />
                <span className="text-faint fs-8">{HINTS[value]}</span>
            </div>
        </div>
    </div>
);

export default FlyingDartsConfig;
