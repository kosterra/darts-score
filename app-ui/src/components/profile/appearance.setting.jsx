import { SelectButton } from 'primereact/selectbutton';

import useGamePreferences from '../../utils/use.game.preferences';
import { currentAppearance, setAppearance } from '../../utils/appearance';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { ACCENT_OPTIONS } from '../../utils/accents';

// each theme with what its little preview shows: the page, a panel, text and a button
const THEME_OPTIONS = [
    { value: 'dark', label: t('Dark'), hint: t('The usual look of Oche.'), preview: { page: '#1f1f1f', panel: '#313131', text: '#d4d4d4', line: '#7a7a7a' } },
    { value: 'light', label: t('Light'), hint: t('Easy to read in daylight and on bright screens.'), preview: { page: '#e9e7e1', panel: '#f7f6f3', text: '#262626', line: '#9a978f' } },
    { value: 'auto', label: t('Like this device'), hint: t('Light or dark, as the phone or computer is set.'), preview: { page: '#1f1f1f', panel: '#f7f6f3', text: '#262626', line: '#7a7a7a', split: true } },
    { value: 'black', label: t('Pure black'), hint: t('Saves battery on phones with an OLED screen.'), preview: { page: '#000', panel: '#161616', text: '#d4d4d4', line: '#5c5c5c' } },
    { value: 'contrast', label: t('High contrast'), hint: t('Brighter text and lines, darker surfaces.'), preview: { page: '#111', panel: '#222', text: '#fff', line: '#cbcbcb' } },
];

const BACKGROUND_OPTIONS = [
    { value: 'photo', label: t('Dartboard') },
    { value: 'blurred', label: t('Blurred') },
    { value: 'plain', label: t('Plain') },
];

/**
 * How the app looks, with the account on every device: the theme, the accent
 * colour (or the club's) and the background. Shown at once and saved; part
 * of Display on the profile (Account), with the language and date format.
 */
const AppearanceSetting = ({ onSaved }) => {
    const [preferences, save] = useGamePreferences();
    const { user, activeClub } = useAuth();
    // the account's look, or the one this device uses until the account has one
    const look = user?.gamePreferences?.appearance ? preferences.appearance : currentAppearance();
    const clubAccent = ACCENT_OPTIONS.find(option => option.value === (activeClub?.accent ?? 'green'));

    const change = (changes, detail) => {
        const next = { ...look, ...changes };
        setAppearance(next);
        save({ appearance: next }).then(() => onSaved?.(detail));
    };

    return (
        <>
            <p className="setting-title">{t('Theme')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col pt-1">
                    <div className="theme-choices" role="radiogroup" aria-label={t('Theme')}>
                        {THEME_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={look.theme === option.value}
                                className={`theme-choice ${look.theme === option.value ? 'is-chosen' : ''}`}
                                onClick={() => change({ theme: option.value }, option.label)}
                            >
                                <span className={`theme-preview ${option.preview.split ? 'is-split' : ''}`} style={{ '--p-page': option.preview.page, '--p-panel': option.preview.panel, '--p-text': option.preview.text, '--p-line': option.preview.line }} aria-hidden="true">
                                    <span className="theme-preview-panel">
                                        <span className="theme-preview-title" />
                                        <span className="theme-preview-line" />
                                        <span className="theme-preview-line is-short" />
                                        <span className="theme-preview-button" />
                                    </span>
                                </span>
                                <span className="theme-choice-label">{option.label}</span>
                                <span className="theme-choice-hint">{option.hint}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <p className="setting-title">{t('Accent colour')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2 pt-1">
                    <div className="accent-choices" role="radiogroup" aria-label={t('Accent colour')}>
                        <button
                            type="button"
                            role="radio"
                            aria-checked={look.accent === null}
                            className={`accent-choice is-club ${look.accent === null ? 'is-chosen' : ''}`}
                            onClick={() => change({ accent: null }, t('The club\'s colour'))}
                            title={t('The club\'s colour')}
                        >
                            <span className="accent-swatch" style={{ '--swatch': clubAccent.color }} aria-hidden="true"><i className="pi pi-building" /></span>
                            <span className="accent-choice-label">{t('The club\'s')}</span>
                        </button>
                        {ACCENT_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={look.accent === option.value}
                                className={`accent-choice ${look.accent === option.value ? 'is-chosen' : ''}`}
                                onClick={() => change({ accent: option.value }, option.label)}
                                title={option.label}
                            >
                                <span className="accent-swatch" style={{ '--swatch': option.color }} aria-hidden="true" />
                                <span className="accent-choice-label">{option.label}</span>
                            </button>
                        ))}
                    </div>
                    <span className="text-faint fs-8">{t('Buttons and highlights. The club\'s: the colour the admins chose for the club ({{color}}).', { color: clubAccent.label })}</span>
                </div>
            </div>

            <p className="setting-title">{t('Background')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2">
                    <SelectButton
                        value={look.background}
                        options={BACKGROUND_OPTIONS}
                        onChange={(event) => event.value && change({ background: event.value }, t('Background'))}
                        className="p-selectbutton-pills flex-wrap"
                        aria-label={t('Background')}
                    />
                    <span className="text-faint fs-8">{t('Behind the pages: the dartboard photo, the photo blurred, or none (calmer, and lighter on older phones). The theme, colour and background come with your account on every device.')}</span>
                </div>
            </div>
        </>
    );
};

export default AppearanceSetting;
