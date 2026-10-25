import { useEffect, useState } from 'react';

import PublicService from '../services/public.service';

// asked once per visit: whether the installation shows its start page to everyone
let site = null;
const loadSite = () => {
    site ??= PublicService.loadSite().then(loaded => loaded?.publicSite !== false).catch(() => true);
    return site;
};

/**
 * Whether the installation has a public start page (true), or opens with the
 * login (false; System settings → Start page); null while it is asked.
 */
const usePublicSite = () => {
    const [publicSite, setPublicSite] = useState(null);
    useEffect(() => {
        let alive = true;
        loadSite().then(value => alive && setPublicSite(value));
        return () => { alive = false; };
    }, []);
    return publicSite;
};

export default usePublicSite;
