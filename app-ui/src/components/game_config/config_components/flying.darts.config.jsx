import { SelectButton } from 'primereact/selectbutton';

import { FLYING_DARTS_OPTIONS } from '../../../utils/flights';
import { t } from '../../../utils/i18n';

const HINTS = {
    players: t('A dart flies to the field you tap. Each player switches it on or off on their player profile (on unless they switched it off).'),
    on: t('A dart flies to the field you tap, for everyone in this game.'),
    off: t('The field you tap just lights up, for everyone in this game.'),
};

/**
 * Whether the darts fly onto the board in a game (X01, Cricket, Elimination): as each player set
 * it, or on or off for everyone. value: 'players' | 'on' | 'off'.
 */
const FlyingDartsConfig = ({ value = 'players', onChange }) => (
    <div>
        <p className="setting-title">{t('Dart animation')}</p>
        <div className="row mx-0 mt-0 setting-body">
            <div className="col d-flex flex-column gap-2">
                <SelectButton
                    value={value}
                    onChange={(e) => e.value && onChange(e.value)}
                    options={FLYING_DARTS_OPTIONS}
                    className="p-selectbutton-pills flex-wrap"
                    aria-label={t('Dart animation')}
                />
                <span className="text-faint fs-8">{HINTS[value]}</span>
            </div>
        </div>
    </div>
);

export default FlyingDartsConfig;
