import { useState } from 'react';

// how the darts are entered, chosen per device for every game: the board, or
// the keypad (the default on a phone, where the fields of the board are small)
const INPUT_KEY = 'oche.x01Input';

export const INPUTS = [
    { label: 'Board', value: 'board', icon: 'pi pi-bullseye' },
    { label: 'Keypad', value: 'keypad', icon: 'pi pi-th-large' },
];

const readInput = () => {
    try {
        const saved = localStorage.getItem(INPUT_KEY);
        if (saved === 'board' || saved === 'keypad') return saved;
    } catch {
        // storage unavailable: the default below
    }
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
    };
    return [input, choose];
};

export default useInputMode;
