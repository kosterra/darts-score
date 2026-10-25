import { useEffect } from 'react';

/**
 * The title of a public page in the browser's tab, as the server sends it
 * for the previews (app-api/src/utils/page.meta.js): "Darts A–Z – Oche".
 * Back to "Oche" when the page is left. full: the whole title as it is.
 */
const usePageTitle = (title, { full = false } = {}) => {
    useEffect(() => {
        document.title = !title ? 'Oche' : full ? title : `${title} – Oche`;
        return () => { document.title = 'Oche'; };
    }, [title, full]);
};

export default usePageTitle;
