import { useEffect, useRef, useState } from 'react';
import { Panel } from 'primereact/panel';
import { Message } from 'primereact/message';

import AdminService from '../../services/admin.service';
import SaveStatus from '../elements/save.status';
import SettingSwitch from '../elements/setting.switch';
import StatTile from '../stats/players/stat.tile';
import useAutoSave from '../../utils/use.auto.save';
import { locale, t } from '../../utils/i18n';

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

/**
 * The public start page: whether there is one at all (off: visitors see the
 * login first), and the numbers of the installation (clubs, players, games
 * played, games this week) only once they speak for it. Each switch is
 * saved at once.
 */
const StartPageSettings = () => {
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState('');
    // what was switched so far, sent together (the newest save wins)
    const chosen = useRef({});
    const startSave = useAutoSave((changes) => AdminService.saveStartPageSettings(changes));

    useEffect(() => {
        AdminService.loadStartPageSettings().then(setSettings).catch(err => setError(err.message));
    }, []);

    if (!settings) return error ? <Message severity="error" text={error} /> : null;

    // shown at once, saved at once; the numbers stay as they were loaded
    const save = (changes) => {
        chosen.current = { ...chosen.current, ...changes };
        setSettings(current => ({ ...current, ...changes }));
        startSave.change(chosen.current, { now: true });
    };
    const toggle = (showNumbers) => save({ showNumbers });
    const togglePublic = (publicSite) => save({ publicSite });

    return (
        <Panel header={t('Start page')} icons={<SaveStatus {...startSave} className="me-2" />}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('The public page everyone sees before logging in. A few clubs and games make a small number: show the numbers once they speak for Legmate.')}{' '}{t('Saved as you go.')}
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
                    id="start-page-public"
                    title={t('Public start page')}
                    hint={settings.publicSite
                        ? t('Visitors see the page about Legmate: what it does, the ways to play, the public clubs and live games.')
                        : t('Off: visitors see the login first, e.g. for an installation of your own clubs only. Darts A–Z, privacy, contact, quick games and darts evenings stay open.')}
                    checked={settings.publicSite}
                    onChange={togglePublic}
                />
                <SettingSwitch
                    id="start-page-numbers"
                    title={t('Numbers of the installation')}
                    hint={settings.showNumbers
                        ? t('Clubs, players, games played and games this week are shown at the top of the start page.')
                        : t('Hidden: the start page shows no numbers of the installation. The public clubs keep their own figures.')}
                    checked={settings.showNumbers}
                    onChange={toggle}
                />
            </div>
        </Panel>
    );
};

export default StartPageSettings;
