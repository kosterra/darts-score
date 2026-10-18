import { Button } from 'primereact/button';
import { formatTrainingTime, toHundredths } from '../../utils/training.time';

/**
 * The stopwatch of a training: the time, and the one button that matters
 * at each moment (start, stop, then save the time or go on).
 *
 * watch: from useStopwatch
 * canStart: a player is chosen
 * onSave(hundredths)
 */
const ATCStopwatch = ({ watch, canStart, saving, onSave }) => {
    const { elapsedMs, running, start, stop, reset } = watch;
    const stopped = !running && elapsedMs > 0;

    return (
        <div className={`atc-stopwatch ${running ? 'is-running' : ''}`}>
            <div className="atc-stopwatch-time" role="timer" aria-live="off">
                {formatTrainingTime(elapsedMs ? toHundredths(elapsedMs) : 0)}
            </div>

            <div className="atc-stopwatch-actions">
                {!running && !stopped &&
                    <Button type="button" label="Start" icon="pi pi-play" className="atc-stopwatch-main" disabled={!canStart} onClick={start} />
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
            {!canStart && !running && !stopped && <div className="text-faint fs-8 text-center mt-2">Choose a player to start.</div>}
        </div>
    );
};

export default ATCStopwatch;
