import { useRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { TiInfoLarge } from 'react-icons/ti';

import Checkout from './x01.checkout';

const CheckoutOverlay = ({ score = 501 }) => {
    const op = useRef(null);

    const toggleOverlay = (e) => {
        op.current?.toggle(e);
    };

    return (
        <div className="d-flex justify-content-center align-items-center">
            <Button
                type="button"
                severity="help"
                size="small"
                rounded
                className="p-1 me-2 fw-semibold fs-6"
                onClick={toggleOverlay}
                aria-label="Show checkout information"
            >
                <TiInfoLarge />
            </Button>

            <OverlayPanel ref={op} showCloseIcon className="p-2 bg-shade900 shadow-3">
                <Checkout score={score} />
            </OverlayPanel>
        </div>
    );
};

export default CheckoutOverlay;
