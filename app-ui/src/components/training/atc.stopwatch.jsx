import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { formatTrainingTime, toHundredths } from '../../utils/training.time';

/**
 * The stopwatch of a training: the time, and the one button that matters
 * at each moment (start, stop, then save the time or go on).
 *
 * watch: from useStopwatch
 * countdown: from useCountdown, starts the watch when it reaches zero
 * withCountdown, onWithCountdownChange: whether Start counts down 3-2-1 first
 * canStart: a player is chosen
 * onStart: when a new run begins
 * onSave(hundredths)
 */
const ATCStopwatch = ({ watch, countdown, withCountdown, onWithCountdownChange, canStart, onStart, saving, onSave }) => {
    const { elapsedMs, running, start, stop, reset } = watch;
    const stopped = !running && elapsedMs > 0;
    const counting = countdown.count !== null;

    return (
        <div className={`atc-stopwatch ${running ? 'is-running' : ''} ${counting ? 'is-counting' : ''}`}>
            {counting
                ? <div className="atc-stopwatch-time atc-countdown" key={countdown.count} aria-live="assertive">{countdown.count}</div>
                : <div className="atc-stopwatch-time" role="timer" aria-live="off">{formatTrainingTime(elapsedMs ? toHundredths(elapsedMs) : 0)}</div>
            }

            <div className="atc-stopwatch-actions">
                {!running && !stopped && !counting &&
                    <Button type="button" label="Start" icon="pi pi-play" className="atc-stopwatch-main" disabled={!canStart} onClick={() => { onStart?.(); if (withCountdown) countdown.begin(); else start(); }} />
                }
                {counting &&
                    <Button type="button" label="Cancel" icon="pi pi-times" outlined className="atc-stopwatch-main" onClick={countdown.cancel} />
                }
                {running &&
                    <Button type="button" label="Stop" icon="pi pi-stop" severity="danger" className="atc-stopwatch-main" onClick={stop} />
                }
                {stopped && <>
                    <Button type="button" label="Save time" icon="pi pi-check" className="atc-stopwatch-main" loading={saving} onClick={() => onSave(toHundredths(elapsedMs))} />
                    <div className="d-flex justify-content-center gap-2">
                        <Button type="button" label="Go on" icon="pi pi-play" size="small" outlined disabled={saving} onClick={start} />
                        <Button type="button" label="Discard" icon="pi pi-times" size="small" text severity="danger" disabled={saving} onClick={reset} />
                    </div>
                </>}
            </div>
            {!running && !stopped && !counting && <>
                {!canStart && <div className="text-faint fs-8 text-center mt-2">Choose a player to start.</div>}
                <label className="atc-countdown-switch">
                    <InputSwitch checked={withCountdown} onChange={(e) => onWithCountdownChange(e.value)} />
                    <span>3-2-1 countdown</span>
                </label>
            </>}
        </div>
    );
};

export default ATCStopwatch;
