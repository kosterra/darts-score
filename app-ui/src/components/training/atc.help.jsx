import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

const ATCHelp = () => {
    const [visible, setVisible] = useState(false);

    const hideDialog = () => setVisible(false);

    return (
        <>
            <Button
                type="button"
                label="Rules"
                link
                size="small"
                className="p-0 ms-2 fs-8 align-baseline"
                onClick={() => setVisible(true)}
                aria-label="Show the training rules"
            />

            <Dialog
                header="Around the Clock"
                visible={visible}
                style={{ width: '40vw' }}
                breakpoints={{ '960px': '60vw', '641px': '100vw' }}
                onHide={hideDialog}
                footer={<Button label="Got it" icon="pi pi-check" onClick={hideDialog} autoFocus />}
                draggable={false}
                resizable={false}
            >
                <p>
                    Hit every number from 1 to 20 in order, then the bull. Start the stopwatch with your first dart
                    and stop it with your last hit; there is no dartboard to enter your darts.
                </p>
                <p className="fw-semibold mb-2">Modes</p>
                <ul className="mb-0">
                    <li><strong>Single:</strong> only singles count, doubles and trebles do not. Finish on the outer bull.</li>
                    <li><strong>Double:</strong> only doubles count. Finish on the bullseye.</li>
                    <li><strong>Triple:</strong> only trebles count. There is no treble bull: finish on the bullseye.</li>
                    <li><strong>All:</strong> any ring counts. Finish on either bull.</li>
                </ul>
            </Dialog>
        </>
    );
};

export default ATCHelp;
