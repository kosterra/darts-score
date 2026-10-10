
import { useState, useEffect } from "react";
import { Panel } from 'primereact/panel';

import { Button } from 'primereact/button';

const Stopwatch = (props) => {
    const {
        onSave,
        hasPlayer
    } = props;

    // state to store time
    const [time, setTime] = useState(0);

    // state to check stopwatch running or not
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let intervalId;
        if (isRunning) {
            // setting time from 0 to 1 every 10 milisecond using javascript setInterval method
            intervalId = setInterval(() => setTime(time + 1), 10);
        }
        return () => clearInterval(intervalId);
    }, [isRunning, time]);

    // Hours calculation
    const hours = Math.floor(time / 360000);

    // Minutes calculation
    const minutes = Math.floor((time % 360000) / 6000);

    // Seconds calculation
    const seconds = Math.floor((time % 6000) / 100);

    // Milliseconds calculation
    const milliseconds = time % 100;

    // Method to start and stop timer
    const startAndStop = () => {
        setIsRunning(!isRunning);
    };

    // Method to reset timer back to 0
    const reset = () => {
        setTime(0);
    };

    // Method to save current run
    const save = () => {
        onSave(time, hours, minutes, seconds, milliseconds, 'hoorli');
        setTime(0);
    };

    return (
        <Panel>
            <div className="row p-3">
                <div className="col">
                    <div className="d-flex justify-content-center align-items-end">
                        {/* <span className="text-shade100 fw-semibold font-monospace display-1" id="hr">
                            {hours}:{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}.{milliseconds.toString().padStart(2, "0")}
                        </span> */}
                        <span className="fw-semibold font-monospace display-1" id="hr">{hours}</span>
                        <span className="fw-semibold fs-6 mb-3 me-3">Hr</span>
                        <span className="fw-semibold font-monospace display-1" id="min">{minutes.toString().padStart(2, "0")}</span>
                        <span className="fw-semibold fs-6 mb-3 me-3">Min</span>
                        <span className="fw-semibold font-monospace display-1" id="sec">{seconds.toString().padStart(2, "0")}</span>
                        <span className="fw-semibold fs-6 mb-3 me-3">Sec</span>
                        <span className="fw-semibold font-monospace display-1" id="count">{milliseconds.toString().padStart(2, "0")}</span>
                    </div>
                </div>
            </div>
            <div className="row">
                <div className="col">
                    <div className="d-flex justify-content-center gap-2">
                        <Button
                            severity="primary"
                            icon={isRunning ? 'pi pi-pause' : 'pi pi-play'}
                            title={isRunning ? 'Pause Challenge' : (time > 0 ? 'Resume Challenge' : 'Start Challenge')}
                            disabled={!hasPlayer}
                            onClick={startAndStop}
                        />
                        <Button
                            severity="danger"
                            icon={'pi pi-undo'}
                            title={'Reset Challenge'}
                            disabled={!(!isRunning && time > 0)}
                            onClick={reset}
                        />
                        <Button
                            severity="info"
                            icon={'pi pi-save'}
                            title={'Save Challenge'}
                            disabled={(!(!isRunning && time > 0)) || !hasPlayer}
                            onClick={save}
                        />
                    </div>
                </div>
            </div>
        </Panel>
    );
};

export default Stopwatch;