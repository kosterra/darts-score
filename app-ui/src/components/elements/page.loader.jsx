import { useEffect, useState } from 'react';
import { BounceLoader } from 'react-spinners';
import { t } from '../../utils/i18n';

// a quick page shows no loader at all
const SHOW_AFTER_MS = 300;

/**
 * While a page or its data loads. full: the start of the app, with the big
 * "L●ading"; otherwise a small, quiet loader that only shows when the wait
 * is noticeable. Padding, not margins: a margin would push the page's dark
 * filter down and the page wider than the window.
 */
const PageLoader = ({ full = false }) => {
    const [shown, setShown] = useState(full);
    useEffect(() => {
        if (full) return undefined;
        const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS);
        return () => clearTimeout(timer);
    }, [full]);

    if (full) {
        return (
            <div className="container-fluid py-5">
                <div className="d-flex justify-content-center align-items-center">
                    <span className="display-2 me-2 fw-semibold text-default">{t('L')}</span>
                    <BounceLoader color="#528b6e" size="60px" />
                    <span className="display-2 ms-2 fw-semibold text-default">{t('ading')}</span>
                </div>
            </div>
        );
    }
    return (
        <div className="page-loader" role="status" aria-live="polite">
            {shown && <>
                <BounceLoader color="#528b6e" size="28px" />
                <span className="text-faint fs-7">{t('Loading…')}</span>
            </>}
        </div>
    );
};

export default PageLoader;
