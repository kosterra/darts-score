import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { Message } from 'primereact/message';

import AdminService from '../../services/admin.service';
import SettingSwitch from '../elements/setting.switch';
import StatTile from '../stats/players/stat.tile';
import { locale, t } from '../../utils/i18n';

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

/**
 * What the public start page shows: the numbers of the installation (clubs,
 * players, games played, games this week) only once they speak for it.
 */
const StartPageSettings = ({ onSaved }) => {
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        AdminService.loadStartPageSettings().then(setSettings).catch(err => setError(err.message));
    }, []);

    if (!settings) return error ? <Message severity="error" text={error} /> : null;

    const toggle = async (showNumbers) => {
        setError('');
        try {
            const saved = await AdminService.saveStartPageSettings({ showNumbers });
            // the numbers stay as they were loaded
            setSettings(current => ({ ...current, ...saved }));
            onSaved?.(showNumbers ? t('The numbers are shown on the start page.') : t('The numbers are no longer shown on the start page.'));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Panel header={t('Start page')}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('The public page everyone sees before logging in. A few clubs and games make a small number: show the numbers once they speak for Oche.')}
                </span>
                {settings.numbers &&
                    <div className="d-flex flex-column gap-2">
                        <span className="text-faint fs-8">{t('The numbers now, as visitors would see them')}{settings.showNumbers ? '' : t(' if they were shown')}:</span>
                        <div className="row g-3">
                            {[[t('Clubs'), 'clubs'], [t('Players'), 'players'], [t('Games played'), 'gamesPlayed'], [t('Games this week'), 'gamesThisWeek']].map(([label, key]) => (
                                <div key={key} className="col-6 col-lg-3">
                                    <StatTile label={label} value={formatNumber(settings.numbers[key])} />
                                </div>
                            ))}
                        </div>
                    </div>
                }
                <SettingSwitch
                    id="start-page-numbers"
                    title={t('Numbers of the installation')}
                    hint={settings.showNumbers
                        ? t('Clubs, players, games played and games this week are shown at the top of the start page.')
                        : t('Hidden: the start page shows no numbers of the installation. The public clubs keep their own figures.')}
                    checked={settings.showNumbers}
                    onChange={toggle}
                />
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
            </div>
        </Panel>
    );
};

export default StartPageSettings;
