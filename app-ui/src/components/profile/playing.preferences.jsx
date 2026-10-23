import { SelectButton } from 'primereact/selectbutton';

import SettingSwitch from '../elements/setting.switch';
import useGamePreferences from '../../utils/use.game.preferences';
import { t } from '../../utils/i18n';

const WAYS_OUT = [
    { value: 'all', label: t('For every player') },
    { value: 'turn', label: t('At the oche only') },
    { value: 'off', label: t('Off') },
];
const WAYS_OUT_HINTS = {
    all: t('The ways out and tips show for every player of an X01 game.'),
    turn: t('Only for the player at the oche; the others see their score only.'),
    off: t('Without ways out and tips: you work out your finish yourself.'),
};
const INPUTS = [
    { value: null, label: t('Per device') },
    { value: 'board', label: t('Board') },
    { value: 'keypad', label: t('Keypad') },
];

/**
 * How the player likes to play, saved with their account so it follows them
 * to every device: the ways out, sending a visit by itself, the keypad for
 * the left hand, quieter celebrations and board or keypad. Saved right away.
 */
const PlayingPreferences = ({ onSaved }) => {
    const [preferences, save] = useGamePreferences();
    const change = (changes, detail) => save(changes).then(() => onSaved?.(detail));

    return (
        <>
            <p className="game-setup-section-title">{t('On every device')}</p>
            <p className="text-faint fs-8 mt-0">{t('With your account, on every device you log in on. Saved right away.')}</p>
            <p className="setting-title">{t('Show the ways out in X01')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2">
                <SelectButton
                    value={preferences.waysOut}
                    options={WAYS_OUT}
                    onChange={(e) => e.value && change({ waysOut: e.value }, WAYS_OUT.find(entry => entry.value === e.value).label)}
                    className="p-selectbutton-pills flex-wrap"
                    aria-label={t('Ways out in X01')}
                />
                <span className="text-faint fs-8">{WAYS_OUT_HINTS[preferences.waysOut]}{' '}{t('A club may play without them.')}</span>
                </div>
            </div>
            <p className="setting-title">{t('Entering the darts')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2">
                <SelectButton
                    value={preferences.inputMode}
                    options={INPUTS}
                    onChange={(e) => e.value !== undefined && change({ inputMode: e.value }, t('Entering the darts'))}
                    className="p-selectbutton-pills flex-wrap"
                    aria-label={t('Entering the darts')}
                />
                <span className="text-faint fs-8">{t('What a device starts with until you choose there: the board, or the keypad (on a phone).')}</span>
                </div>
            </div>
            <SettingSwitch
                id="pref-auto-send"
                title={t('Send the visit after the third dart')}
                hint={t('No need to press Enter score: the visit goes by itself a moment after its third dart. Undo takes it back.')}
                checked={preferences.autoSend}
                onChange={(value) => change({ autoSend: value }, value ? t('Visits go by themselves.') : t('Visits go with Enter score.'))}
            />
            <SettingSwitch
                id="pref-left-handed"
                title={t('Keypad for the left hand')}
                hint={t('The rings and the keys Miss, Bull and back are mirrored, closer to the left thumb.')}
                checked={preferences.leftHanded}
                onChange={(value) => change({ leftHanded: value }, t('Keypad for the left hand'))}
            />
            <SettingSwitch
                id="pref-quiet"
                title={t('Quieter celebrations')}
                hint={t('The big moments without confetti, sparks and figures: just the number and the card.')}
                checked={preferences.celebrations === 'quiet'}
                onChange={(value) => change({ celebrations: value ? 'quiet' : 'full' }, t('Celebrations'))}
            />
            <p className="text-faint fs-8 mt-3 mb-0">{t('Your favourite formats come first in the setups: pin one with its star. The setups and trainings start as you left them, on every device.')}</p>
        </>
    );
};

export default PlayingPreferences;
