import { useEffect, useState } from 'react';

import { call, callerOn, callerSupported, setCallerOn, setCallerVoiceKind, stopCalling } from '../../../utils/caller';
import useGamePreferences from '../../../utils/use.game.preferences';
import { t } from '../../../utils/i18n';

/**
 * The caller on or off, in the game header: a speaker. Switched on it says
 * "Game on!" at once, which also lets a phone speak later (they only start
 * speaking after a tap). Remembered on the device; the voice, male or female,
 * comes with the account.
 */
const CallerButton = () => {
    const [on, setOn] = useState(callerOn);
    const [{ callerVoice }] = useGamePreferences();
    useEffect(() => setCallerVoiceKind(callerVoice), [callerVoice]);
    // leaving the game stops what is still being said
    useEffect(() => () => stopCalling(), []);
    if (!callerSupported()) return null;

    const toggle = () => {
        setCallerOn(!on);
        setOn(!on);
        if (!on) call([t('Game on!')]);
    };

    return (
        <button
            type="button"
            className={`game-rules-toggle caller-toggle ${on ? 'is-on' : ''}`}
            aria-pressed={on}
            title={on ? t('The caller is on: tap to switch it off') : t('The caller calls the scores aloud: tap to switch it on')}
            onClick={toggle}
        >
            <i className={`pi ${on ? 'pi-volume-up' : 'pi-volume-off'}`} aria-hidden="true" />
            <span className="game-rules-label">{t('Caller')}</span>
        </button>
    );
};

export default CallerButton;
