import { useContext, useRef, useState } from 'react';
import { Toast } from 'primereact/toast';

import X01Context from '../../../utils/x01.context';

const NUMBERS = Array.from({ length: 20 }, (_, index) => index + 1);

// a button of the keypad, lit for a moment when it was just pressed
const Key = ({ id, pressed, label, onClick, className = '', disabled = false, ariaLabel }) => (
    <button
        type="button"
        className={`x01-key ${className} ${pressed === id ? 'is-pressed' : ''}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
    >
        {label}
    </button>
);

/**
 * The darts of a visit on big buttons, one tap per dart: a number is a single,
 * with Double or Treble chosen first a double or treble (for that dart only).
 * 25 is the outer bull, Bull the bullseye (with or without Double), Miss a dart
 * that scored nothing.
 */
const X01Keypad = () => {
    const { game, getCurrentThrowScore, checkCanThrowMoreDarts, updateCurrentThrowDartBoard, updateCurrentThrowManual } = useContext(X01Context);
    // 'D' or 'T' for the next dart, null for a single
    const [ring, setRing] = useState(null);
    // the button just pressed, lit for a moment
    const [pressed, setPressed] = useState(null);
    const toast = useRef(null);

    const score = game.playerModels[game.currentPlayerTurn].score - getCurrentThrowScore();
    const canThrow = checkCanThrowMoreDarts(score);
    const entered = game.currentThrow.filter(dart => dart.trim() !== '').length;

    const enter = (value, key) => {
        if (!canThrow) {
            toast.current?.clear();
            toast.current?.show({ severity: 'error', summary: 'No more darts', detail: 'This visit is complete: enter the score.', life: 2500 });
            return;
        }
        navigator.vibrate?.(12);
        setPressed(key);
        setTimeout(() => setPressed(current => current === key ? null : current), 250);
        updateCurrentThrowDartBoard(score, value);
        setRing(null);
    };

    const number = (n) => enter(`${ring ?? 'S'}${n}`, `n${n}`);
    const clearLast = () => {
        const index = game.currentThrow.map(dart => dart.trim() !== '').lastIndexOf(true);
        if (index >= 0) updateCurrentThrowManual(score, '', index);
    };

    return (
        <div className={`x01-keypad ${ring ? `is-${ring === 'D' ? 'double' : 'treble'}` : ''}`} aria-label="Keypad">
            <div className="x01-keypad-rings">
                <Key pressed={pressed} id="D" label="Double" className={`is-ring ${ring === 'D' ? 'is-active' : ''}`} onClick={() => setRing(ring === 'D' ? null : 'D')} ariaLabel="Double for the next dart" />
                <Key pressed={pressed} id="T" label="Treble" className={`is-ring ${ring === 'T' ? 'is-active' : ''}`} onClick={() => setRing(ring === 'T' ? null : 'T')} ariaLabel="Treble for the next dart" />
            </div>
            <div className="x01-keypad-numbers">
                {NUMBERS.map(n => (
                    <Key key={n} pressed={pressed} id={`n${n}`} label={ring ? `${ring}${n}` : n} onClick={() => number(n)} ariaLabel={`${ring === 'D' ? 'Double' : ring === 'T' ? 'Treble' : 'Single'} ${n}`} />
                ))}
            </div>
            <div className="x01-keypad-extras">
                {/* 25 is the outer bull only: a double 25 is the Bull next to it */}
                <Key pressed={pressed} id="25" label="25" onClick={() => enter('S25', '25')} disabled={ring !== null} ariaLabel="Outer bull, 25" />
                <Key pressed={pressed} id="bull" label="Bull" onClick={() => enter('D25', 'bull')} disabled={ring === 'T'} ariaLabel="Bullseye, 50" />
                <Key pressed={pressed} id="miss" label="Miss" className="is-miss" onClick={() => enter('0', 'miss')} />
                <Key pressed={pressed} id="back" label={<><i className="pi pi-delete-left" aria-hidden="true" /> Dart</>} className="is-back" onClick={clearLast} disabled={!entered} ariaLabel="Clear the last dart" />
            </div>
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default X01Keypad;
