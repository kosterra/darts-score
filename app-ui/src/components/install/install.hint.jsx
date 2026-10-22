import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';

import { canInstall, install, isInstalled, isIosSafari, onInstallChange } from '../../utils/install';
import { t } from '../../utils/i18n';

const DISMISSED_KEY = 'darts-score.installHint.dismissed';
const dismissed = () => {
    try {
        return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
        return false;
    }
};

/**
 * A small card on the start page and the dashboard: Oche can go on the home
 * screen like an app. With the browser's offer it installs with one tap; on
 * an iPhone or iPad it says how (Share → Add to Home Screen). Gone once the
 * app is installed or the card is closed.
 */
const InstallHint = () => {
    const { pathname } = useLocation();
    const [, refresh] = useState(0);
    const [closed, setClosed] = useState(dismissed);

    useEffect(() => onInstallChange(() => refresh(count => count + 1)), []);

    const ios = isIosSafari();
    if (closed || pathname !== '/' || isInstalled() || (!canInstall() && !ios)) return null;

    const close = () => {
        try {
            localStorage.setItem(DISMISSED_KEY, '1');
        } catch {
            // without storage it comes back next time
        }
        setClosed(true);
    };

    return (
        <aside className="install-hint" aria-label={t('Install Oche')}>
            <img src="/icons/icon-192.png" alt="" width="44" height="44" />
            <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
                <strong className="text-default fs-7">{t('Oche on your home screen')}</strong>
                <span className="text-subtle fs-8">
                    {ios
                        ? <><i className="pi pi-upload me-1" aria-hidden="true" />{t('Tap Share, then Add to Home Screen: Oche opens full screen, like an app.')}</>
                        : t('Install it like an app: it opens full screen, without the browser around it.')}
                </span>
                {!ios && <div className="d-flex gap-2 mt-1">
                    <Button label={t('Install')} icon="pi pi-download" size="small" onClick={() => install().then(close)} />
                    <Button label={t('Not now')} size="small" severity="secondary" text onClick={close} />
                </div>}
            </div>
            <button type="button" className="install-hint-close" onClick={close} aria-label={t('Close')}>
                <i className="pi pi-times" aria-hidden="true" />
            </button>
        </aside>
    );
};

export default InstallHint;
