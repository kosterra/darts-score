import { useRef, useState } from 'react';
import { Toast } from 'primereact/toast';
import { t } from '../../../utils/i18n';

const ALL_NUMBERS = Array.from({ length: 20 }, (_, index) => index + 1);

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
 * with Double or Treble chosen first a double or treble; after the dart it is
 * Single again. 25 is the outer bull, Bull the bullseye, Miss a dart that
 * scored nothing.
 *
 * canThrow: whether another dart fits in the visit; onDart(value) enters one
 * ('T20', 'S25', '0'); onClearLast() takes the last one back; entered: how
 * many darts are in. "numbers" are the numbers on the keypad (Cricket only
 * needs 15 to 20).
 */
const DartKeypad = ({ canThrow, onDart, onClearLast, entered, numbers = ALL_NUMBERS, className = '' }) => {
    // 'D' or 'T' for the next dart, null for a single
    const [ring, setRing] = useState(null);
    // the button just pressed, lit for a moment
    const [pressed, setPressed] = useState(null);
    const toast = useRef(null);

    const enter = (value, key) => {
        if (!canThrow) {
            toast.current?.clear();
            toast.current?.show({ severity: 'error', summary: t('No more darts'), detail: t('This visit is complete: enter the score.'), life: 2500 });
            return;
        }
        navigator.vibrate?.(12);
        setPressed(key);
        setTimeout(() => setPressed(current => current === key ? null : current), 250);
        onDart(value);
        setRing(null);
    };

    const number = (n) => enter(`${ring ?? 'S'}${n}`, `n${n}`);

    return (
        <div className={`x01-keypad ${ring ? `is-${ring === 'D' ? 'double' : 'treble'}` : ''} ${className}`} aria-label={t('Keypad')}>
            {/* the ring of the next dart: Single is always there to go back to */}
            <div className="x01-keypad-rings" role="radiogroup" aria-label={t('Ring of the next dart')}>
                {[[null, t('Single')], ['D', t('Double')], ['T', t('Treble')]].map(([value, label]) => (
                    <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={ring === value}
                        className={`x01-key is-ring ${ring === value ? 'is-active' : ''}`}
                        onClick={() => setRing(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div className={`x01-keypad-numbers ${numbers.length < 20 ? 'is-few' : ''}`}>
                {numbers.map(n => (
                    <Key key={n} pressed={pressed} id={`n${n}`} label={ring ? `${ring}${n}` : n} onClick={() => number(n)} ariaLabel={`${ring === 'D' ? 'Double' : ring === 'T' ? 'Treble' : 'Single'} ${n}`} />
                ))}
            </div>
            <div className="x01-keypad-extras">
                {/* 25 is the outer bull only: a double 25 is the Bull next to it */}
                <Key pressed={pressed} id="25" label="25" onClick={() => enter('S25', '25')} disabled={ring !== null} ariaLabel="Outer bull, 25" />
                <Key pressed={pressed} id="bull" label={t('Bull')} onClick={() => enter('D25', 'bull')} disabled={ring === 'T'} ariaLabel="Bullseye, 50" />
                <Key pressed={pressed} id="miss" label={t('Miss')} className="is-miss" onClick={() => enter('0', 'miss')} />
                <Key pressed={pressed} id="back" label={<><i className="pi pi-delete-left" aria-hidden="true" />{' '}{t('Dart')}</>} className="is-back" onClick={onClearLast} disabled={!entered} ariaLabel={t('Clear the last dart')} />
            </div>
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default DartKeypad;
