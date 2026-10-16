import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { TiInfoLarge } from "react-icons/ti";

const ScoreInputBoardHelp = () => {
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
            <div className="mb-2 ms-1 d-flex align-items-center">
                <span className="col-10 text-default fs-8 fw-semibold d-inline-block text-truncate">
                    Click the dartboard or enter score
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
            </Dialog>
        </div>
    );
}

export default ScoreInputBoardHelp;
