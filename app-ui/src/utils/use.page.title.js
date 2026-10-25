import { useEffect } from 'react';

import { BRAND } from './project';

/**
 * The title of a public page in the browser's tab, as the server sends it
 * for the previews (app-api/src/utils/page.meta.js): "Darts A–Z – Legmate".
 * Back to "Legmate" when the page is left. full: the whole title as it is.
 */
const usePageTitle = (title, { full = false } = {}) => {
    useEffect(() => {
        document.title = !title ? BRAND : full ? title : `${title} – ${BRAND}`;
        return () => { document.title = BRAND; };
    }, [title, full]);
};

export default usePageTitle;
