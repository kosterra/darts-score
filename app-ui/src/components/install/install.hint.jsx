import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';

import { canInstall, install, isInstalled, isIosSafari, onInstallChange } from '../../utils/install';
import { useMyPlayers } from '../../utils/use.my.players';
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
 * A small card on the start page and the dashboard: Legmate can go on the home
 * screen like an app. With the browser's offer it installs with one tap; on
 * an iPhone or iPad it says how (Share → Add to Home Screen). Gone once the
 * app is installed or the card is closed.
 */
// where the card shows: the start page, the dashboard and the profile; with a
// login also the user's own statistics (where My statistics and the start page lead)
const PAGES = ['/', '/dashboard', '/me', '/profile'];

const InstallHint = ({ loggedIn = false }) => {
    const { pathname } = useLocation();
    const myPlayers = useMyPlayers(loggedIn);
    const ownStatistics = (myPlayers ?? []).some(player => pathname === `/players/${player.id}`);
    const [, refresh] = useState(0);
    const [closed, setClosed] = useState(dismissed);

    useEffect(() => onInstallChange(() => refresh(count => count + 1)), []);

    const ios = isIosSafari();
    if (closed || !(PAGES.includes(pathname) || ownStatistics) || isInstalled() || (!canInstall() && !ios)) return null;

    const close = () => {
        try {
            localStorage.setItem(DISMISSED_KEY, '1');
        } catch {
            // without storage it comes back next time
        }
        setClosed(true);
    };

    return (
        <aside className="install-hint" aria-label={t('Install Legmate')}>
            <img src="/icons/icon-192.png" alt="" width="44" height="44" />
            <div className="d-flex flex-column gap-1 min-w-0">
                <strong className="text-default fs-7">{t('Legmate on your home screen')}</strong>
                <span className="text-subtle fs-8">
                    {ios
                        ? <><i className="pi pi-upload me-1" aria-hidden="true" />{t('Tap Share, then Add to Home Screen: Legmate opens full screen, like an app.')}</>
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
