import { useState } from 'react';
import { t } from '../../../utils/i18n';
import { gamePreferences, saveGamePreferences } from '../../../utils/game.preferences';

// how the darts are entered, for every game: the board, or the keypad (the
// default on a phone, where the fields of the board are small). The choice of
// this device first, then the player's (with their account), then the screen.
const INPUT_KEY = 'oche.x01Input';

export const INPUTS = [
    { label: t('Board'), value: 'board', icon: 'pi pi-bullseye' },
    { label: t('Keypad'), value: 'keypad', icon: 'pi pi-th-large' },
];

const readInput = () => {
    try {
        const saved = localStorage.getItem(INPUT_KEY);
        if (saved === 'board' || saved === 'keypad') return saved;
    } catch {
        // storage unavailable: the default below
    }
    if (gamePreferences().inputMode) return gamePreferences().inputMode;
    return window.matchMedia?.('(max-width: 767.98px)').matches ? 'keypad' : 'board';
};

const writeInput = (input) => {
    try {
        localStorage.setItem(INPUT_KEY, input);
    } catch {
        // storage unavailable: the default again next time
    }
};

/**
 * The way of entering darts on this device: [input, choose].
 */
const useInputMode = () => {
    const [input, setInput] = useState(() => readInput());
    const choose = (value) => {
        if (!value) return;
        setInput(value);
        writeInput(value);
        saveGamePreferences({ inputMode: value });
    };
    return [input, choose];
};

export default useInputMode;
