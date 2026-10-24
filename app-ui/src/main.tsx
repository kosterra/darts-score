import React from 'react';
import ReactDOM from 'react-dom/client';
import { addLocale, locale as primeLocale, updateLocaleOption } from 'primereact/api';
import dayjs from 'dayjs';
import 'dayjs/locale/de-ch';
import 'dayjs/locale/fr-ch';
import 'dayjs/locale/it-ch';
import 'dayjs/locale/es';
import { initLanguage } from './utils/i18n';
import { listenForInstallOffer, registerServiceWorker } from './utils/install';
import { initAppearance } from './utils/appearance';
import { PRIMEREACT_LOCALES } from './locales/primereact';

// the look kept on this device, before anything shows
initAppearance();

// installable on the home screen: the browser's offer can come before the app is shown
listenForInstallOffer();
registerServiceWorker();

// the language is chosen and its texts loaded before the app: every text of
// the app, also those set up when a part of it loads, comes in that language
const language = await initLanguage();

// calendars start the week on Monday, as in Switzerland and most of Europe
updateLocaleOption('firstDayOfWeek', 1, 'en');
if (PRIMEREACT_LOCALES[language]) {
    addLocale(language, PRIMEREACT_LOCALES[language]);
    primeLocale(language);
}
dayjs.locale({ de: 'de-ch', fr: 'fr-ch', it: 'it-ch', es: 'es' }[language] ?? 'en');

const { default: App } = await import('./App');

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
