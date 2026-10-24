import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';

import { canInstall, install, isInstalled, isIosSafari, onInstallChange } from '../../utils/install';
import { t } from '../../utils/i18n';

const isAndroid = () => /Android/i.test(window.navigator.userAgent);

/**
 * Oche as an app on this device, on the profile: whether it is installed, the
 * browser's offer to install it with one tap, or how to do it by hand on an
 * iPhone or iPad, on Android or on a computer. Always here, also after the
 * hint of the start page was closed.
 */
const AppInstallSetting = () => {
    const [, refresh] = useState(0);
    useEffect(() => onInstallChange(() => refresh(count => count + 1)), []);

    const installed = isInstalled();
    const offered = canInstall();
    // browsers only install from a secure address (https, or the computer itself)
    const how = !window.isSecureContext && !isIosSafari()
        ? t('Installing needs a secure address (https://). This one is not, so the browser only offers a shortcut that opens in the browser. Ask whoever runs this installation for an https address.')
        : isIosSafari()
        ? t('In Safari tap Share (the square with the arrow), then Add to Home Screen.')
        : isAndroid()
            ? t('In Chrome open the menu (⋮) and tap Install app, or Add to Home screen.')
            : t('In Chrome or Edge click the install icon at the right end of the address bar, or Install in the browser\'s menu.');

    return (
        <>
            <p className="game-setup-section-title">{t('This device')}</p>
            <p className="setting-title">{t('Oche as an app')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2 pt-1">
                    {installed
                        ? <span className="text-subtle fs-7"><i className="pi pi-check-circle text-success me-2" aria-hidden="true" />{t('You use Oche as an app here: it opens full screen from its icon.')}</span>
                        : <>
                            <span className="text-subtle fs-7">{t('On the home screen Oche opens full screen like an app, without the address bar, and stays logged in.')}</span>
                            {offered
                                ? <div><Button type="button" label={t('Install')} icon="pi pi-download" size="small" onClick={() => install()} /></div>
                                : <span className="text-faint fs-8">{how}</span>}
                        </>}
                </div>
            </div>
        </>
    );
};

export default AppInstallSetting;
