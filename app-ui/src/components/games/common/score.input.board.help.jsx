import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { TiInfoLarge } from "react-icons/ti";

/**
 * How to enter darts, behind a small help button.
 * label: the line next to the button
 * plainSingles: a plain number is a single and 50 the bullseye (X01)
 * compact: just the line and the button, for a header
 */
const ScoreInputBoardHelp = ({ label = 'Click the dartboard or enter score', plainSingles = false, compact = false }) => {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState('center');

    const footerContent = (
        <div>
            <Button
                label="Got it!"
                icon="pi pi-check"
                onClick={() => setVisible(false)}
                autoFocus
            />
        </div>
    );

    const showHelp = (pos = 'center') => {
        setPosition(pos);
        setVisible(true);
    };

    return (
        <div>
            {/* Trigger */}
            {compact
                ? (
                    <span className="d-inline-flex align-items-center gap-2">
                        <span className="text-faint fs-8">{label}</span>
                        <Button type="button" severity="help" size="small" rounded className="p-1 fw-semibold fs-7" aria-label="How to enter darts" onClick={() => showHelp('bottom-right')}>
                            <TiInfoLarge />
                        </Button>
                    </span>
                )
                : (
                    <div className="mb-2 ms-1 d-flex align-items-center">
                        <span className="col-10 text-default fs-8 fw-semibold d-inline-block text-truncate">
                            {label}
                        </span>
                        <div className="col-2 d-flex justify-content-end">
                            <Button
                                type="button"
                                severity="help"
                                size="small"
                                rounded
                                className="p-1 me-2 fw-semibold fs-6"
                                onClick={() => showHelp('bottom-right')}
                            >
                                <TiInfoLarge />
                            </Button>
                        </div>
                    </div>
                )
            }

            {/* Dialog */}
            <Dialog
                header="Help"
                visible={visible}
                position={position}
                style={{ width: '40vw' }}
                breakpoints={{ '960px': '50vw', '641px': '100vw' }}
                onHide={() => setVisible(false)}
                footer={footerContent}
                draggable={false}
                resizable={false}
            >
                {plainSingles
                    ? (
                        <div className="fs-8">
                            <p>Tap where each dart landed on the board, or type it:</p>
                            <ul>
                                <li><strong>20</strong> (or <strong>S20</strong>) for a single</li>
                                <li><strong>D20</strong> for a double, <strong>T20</strong> for a treble</li>
                                <li><strong>25</strong> for the outer bull, <strong>50</strong> (or <strong>D25</strong>) for the bullseye</li>
                                <li><strong>0</strong> for a miss</li>
                            </ul>
                            <p className="mb-0">Then press <strong>Enter</strong> or <strong>Enter score</strong>. <strong>Undo last visit</strong> reopens the visit before, to correct it.</p>
                        </div>
                    )
                    : (
                <div className="fs-8">
                    <p>If you missed, simply enter <strong>0</strong>.</p>
                    <p>For any other scores, add:</p>
                    <ul>
                        <li><strong>S</strong> for a single</li>
                        <li><strong>D</strong> for a double</li>
                        <li><strong>T</strong> for a treble</li>
                    </ul>
                    <p>{'So "D10" scores 20 points, "T20" scores 60 ...'}</p>
                    <p className="fs-7 mt-4"><strong>Note that:</strong></p>
                    <p>
                        The inner BULLSEYE (50 points) = <strong>D25</strong><br />
                        The outer BULLSEYE (25 points) = <strong>S25</strong>.
                    </p>
                </div>
                    )
                }
            </Dialog>
        </div>
    );
}

export default ScoreInputBoardHelp;
