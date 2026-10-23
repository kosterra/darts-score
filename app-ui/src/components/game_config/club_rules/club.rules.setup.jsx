import { useState } from 'react';
import { SelectButton } from 'primereact/selectbutton';
import { InputSwitch } from 'primereact/inputswitch';

import { SETTING_HINTS, SETTING_LABELS, settingOptions, valueLabel } from '../../../utils/club.rules.labels';
import { t } from '../../../utils/i18n';

/**
 * The mark of a setting the club locked: shown next to its title.
 */
export const ClubRuleMark = () => (
    <span className="club-rule-mark" title={t('A rule of the club: only the club admins change it.')}>
        <i className="pi pi-lock" aria-hidden="true" />{t('Club rule')}
    </span>
);

/**
 * A setting's title, with the mark when the club locked it.
 */
export const SettingTitle = ({ children, locked }) => (
    <p className="setting-title d-flex align-items-center justify-content-center gap-2 flex-wrap">
        {children}
        {locked && <ClubRuleMark />}
    </p>
);

/**
 * The house rules of a game in its setup: each a row of choices (only those
 * the club offers), or its value with the mark when the club locked it.
 * Only the rules with a choice to make or a value other than the app's are shown.
 * club: from useClubGameRules; settings, onChange(key, value)
 */
export const HouseRules = ({ game, club, settings, onChange }) => {
    const rows = club.houseRules.filter(setting => {
        const offered = club.options(setting.key, setting.values);
        return (offered.length > 1 && !club.locked(setting.key)) || settings[setting.key] !== setting.default;
    });
    // closed while the usual rules apply: one line says which
    const unusual = rows.some(setting => settings[setting.key] !== setting.default);
    const [open, setOpen] = useState(unusual);
    if (!rows.length) return null;
    const line = rows.map(setting => `${SETTING_LABELS[setting.key]}: ${valueLabel(game, setting.key, settings[setting.key])}`).join(' · ');
    return (
        <div className="setting-box">
            <button type="button" className="house-rules-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
                <span className="d-flex flex-column align-items-start" style={{ minWidth: 0 }}>
                    <span className="text-default fw-semibold fs-7">{t('House rules')}{!unusual && <span className="text-faint fw-normal"> · {t('as usual')}</span>}</span>
                    {!open && <span className="text-faint fs-8 text-start">{line}</span>}
                </span>
                <i className={`pi ${open ? 'pi-chevron-up' : 'pi-chevron-down'}`} aria-hidden="true" />
            </button>
            {open && rows.map(setting => {
                const locked = club.locked(setting.key);
                return (
                    <div key={setting.key} className="mb-3">
                        <SettingTitle locked={locked}>{SETTING_LABELS[setting.key]}</SettingTitle>
                        <div className="d-flex flex-column align-items-center gap-2">
                            {locked
                                ? <span className="club-rule-value">{valueLabel(game, setting.key, settings[setting.key])}</span>
                                : <SelectButton
                                    value={settings[setting.key]}
                                    onChange={(e) => e.value !== null && e.value !== undefined && onChange(setting.key, e.value)}
                                    options={settingOptions(game, setting.key, club.options(setting.key, setting.values))}
                                    className="p-selectbutton-pills flex-wrap justify-content-center pills-wrap-text"
                                    aria-label={SETTING_LABELS[setting.key]}
                                />}
                            {SETTING_HINTS[setting.key] && <span className="text-faint fs-8 text-center">{SETTING_HINTS[setting.key]}</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * Whether the game is friendly: left out of the club's leaderboards, records
 * and Hall of Shame. A choice when the club lets the players make it;
 * otherwise only shown when a friendly format of the club set it.
 */
export const FriendlyGame = ({ club, value, onChange }) => {
    if (!club.friendlyChoice && !value) return null;
    return (
        <div className="setting-box">
            <div className="d-flex align-items-center justify-content-center gap-3">
                <InputSwitch inputId="friendly-game" checked={Boolean(value)} onChange={(e) => onChange(e.value)} disabled={!club.friendlyChoice} />
                <label htmlFor="friendly-game" className="text-default fs-7">{t('Friendly game')}</label>
                {!club.friendlyChoice && <ClubRuleMark />}
            </div>
            <p className="text-faint fs-8 text-center mt-2 mb-0">{t('It counts for the players\' own statistics, but not for the club\'s leaderboards, records and Hall of Shame.')}</p>
        </div>
    );
};

/**
 * A setup for a game the club does not play.
 */
export const NotPlayedHere = ({ title }) => (
    <div className="text-center d-flex flex-column align-items-center gap-2 p-4">
        <i className="pi pi-ban fs-3 text-faint" aria-hidden="true" />
        <span className="text-default fw-semibold">{t('Your club does not play {{game}}.', { game: title })}</span>
        <span className="text-subtle fs-7">{t('The club admins choose the games of the club under Edit club → Game rules.')}</span>
    </div>
);
