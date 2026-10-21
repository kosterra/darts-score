import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';

import AdminService from '../../services/admin.service';
import { AppBannerStrip } from '../banner/app.banner';
import { announceBannerChange } from '../banner/banner.events';
import { t } from '../../utils/i18n';

const MAX_LENGTH = 200;

// soft colours that suit the dark app, from "just so you know" to "careful"
const PRESETS = [
    { label: t('Orange'), color: '#f2b07e' },
    { label: t('Gold'), color: '#d4c783' },
    { label: t('Blue'), color: '#8fc3df' },
    { label: t('Green'), color: '#7ecca5' },
    { label: t('Lavender'), color: '#c3a9e6' },
    { label: t('Red'), color: '#e8957e' },
];

/**
 * The banner on top of every page, e.g. to mark a test environment: on or
 * off, its text and its colour, with a preview.
 */
const BannerSettings = ({ onSaved }) => {
    const [banner, setBanner] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        AdminService.loadBannerSettings().then(setBanner).catch(err => setError(err.message));
    }, []);

    if (!banner) return error ? <Message severity="error" text={error} /> : null;

    const set = (changes) => setBanner({ ...banner, ...changes });

    const save = async () => {
        setError('');
        setSaving(true);
        try {
            setBanner(await AdminService.saveBanner(banner));
            announceBannerChange();
            onSaved?.(banner.enabled ? t('The banner is shown on every page.') : t('The banner is switched off.'));
        } catch (err) {
            setError(err.message);
        }
        setSaving(false);
    };

    return (
        <Panel header={t('Banner')}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('A message on top of every page, for everyone, also on the public start page and the login. Use it e.g. to mark a test environment, so everyone knows test data is welcome here.')}
                </span>

                <label htmlFor="banner-enabled" className="d-flex align-items-center gap-2 text-default">
                    <InputSwitch inputId="banner-enabled" checked={banner.enabled} onChange={(e) => set({ enabled: e.value })} />
                    {t('Show the banner')}
                </label>

                <div className="d-flex flex-column gap-1">
                    <label htmlFor="banner-text" className="text-subtle fs-7">{t('Text')}</label>
                    <InputText
                        id="banner-text"
                        value={banner.text}
                        maxLength={MAX_LENGTH}
                        onChange={(e) => set({ text: e.target.value })}
                        placeholder={t('Test environment – feel free to add test data')}
                    />
                    <span className="text-faint fs-8 align-self-end">{banner.text.length} / {MAX_LENGTH}</span>
                </div>

                <div className="d-flex flex-column gap-2">
                    <span className="text-subtle fs-7">{t('Colour')}</span>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        {PRESETS.map(preset => (
                            <button
                                key={preset.color}
                                type="button"
                                className={`banner-swatch ${banner.color.toLowerCase() === preset.color ? 'is-selected' : ''}`}
                                style={{ background: preset.color }}
                                onClick={() => set({ color: preset.color })}
                                aria-label={preset.label}
                                title={preset.label}
                            />
                        ))}
                        <label className="banner-custom-color" title={t('Your own colour')}>
                            <input type="color" value={banner.color} onChange={(e) => set({ color: e.target.value })} aria-label={t('Your own colour')} />
                            <span className="text-faint fs-8">{banner.color}</span>
                        </label>
                    </div>
                </div>

                <div className="d-flex flex-column gap-1">
                    <span className="text-subtle fs-7">{t('Preview')}</span>
                    <div className="rounded-2 overflow-hidden">
                        <AppBannerStrip text={banner.text || t('Test environment – feel free to add test data')} color={banner.color} />
                    </div>
                    {!banner.enabled && <span className="text-faint fs-8">{t('Switched off: nobody sees it.')}</span>}
                </div>

                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <div className="d-flex justify-content-end">
                    <Button label={t('Save')} icon="pi pi-save" size="small" loading={saving} onClick={save} />
                </div>
            </div>
        </Panel>
    );
};

export default BannerSettings;
