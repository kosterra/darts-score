import { useEffect, useState } from 'react';

import PublicService from '../../services/public.service';
import { BANNER_CHANGED, textColorOn } from './banner.events';

/**
 * A strip on top of every page with a message from the global admins, e.g.
 * "Test environment – feel free to add test data". Shown only while it is
 * switched on.
 */
const AppBanner = () => {
    const [banner, setBanner] = useState(null);

    useEffect(() => {
        const load = () => PublicService.loadBanner().then(setBanner).catch(() => setBanner(null));
        load();
        window.addEventListener(BANNER_CHANGED, load);
        return () => window.removeEventListener(BANNER_CHANGED, load);
    }, []);

    if (!banner?.enabled) return null;

    return <AppBannerStrip text={banner.text} color={banner.color} />;
};

/**
 * The strip itself, also used as the preview while editing it.
 */
export const AppBannerStrip = ({ text, color }) => (
    <div className="app-banner" role="status" style={{ background: color, color: textColorOn(color) }}>
        <i className="pi pi-info-circle" aria-hidden="true" />
        <span>{text}</span>
    </div>
);

export default AppBanner;
