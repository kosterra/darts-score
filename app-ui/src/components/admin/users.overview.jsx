import { useMemo } from 'react';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';
import dayjs from 'dayjs';

import { ChipGroup, SpreadList, TimeBars } from './installation.parts';
import { formatNumber, scrollToList } from './installation.utils';
import { KpiHero } from '../stats/players/kpi';
import { INACTIVE_DAYS, usersOverview } from '../../utils/admin.overviews';
import { LANGUAGES, t, tn } from '../../utils/i18n';

const GREEN = '#7ecca5';
const initials = (user) => `${user.firstname?.[0] ?? ''}${user.lastname?.[0] ?? ''}`.toUpperCase() || '?';

/**
 * The users at a glance, above their list: how many, new and active lately,
 * blocked; the registrations of the last twelve weeks; what they are and
 * their languages; and the accounts to look after (never used, unused for
 * half a year, without a club), each picked into the search with a click.
 * onPick(user)
 */
const UsersOverview = ({ users, onPick }) => {
    const overview = useMemo(() => usersOverview(users), [users]);

    if (!overview.total) return null;
    const languageOf = (code) => (code === 'browser' ? t('As the browser') : LANGUAGES.find(language => language.code === code)?.label ?? code);
    const chip = (user) => ({
        id: user.id,
        label: `${user.firstname} ${user.lastname}`,
        avatar: <Avatar label={initials(user)} shape="circle" className="avatar-xs bg-surface-high flex-shrink-0" />,
    });
    const pick = (item) => { onPick(users.find(user => user.id === item.id)); scrollToList(); };
    const toLookAfter = overview.neverLoggedIn.length + overview.inactive.length + overview.withoutClub.length;

    return (
        <div className="d-flex flex-column gap-4 mb-4">
            <Panel header={t('Users at a glance')}>
                <div className="kpi-headline">
                    <KpiHero label={t('Users')} value={formatNumber(overview.total)} color={GREEN} />
                    <KpiHero label={t('New in the last 30 days')} value={formatNumber(overview.newLately)} color={GREEN} />
                    <KpiHero
                        label={t('Logged in lately')}
                        value={formatNumber(overview.activeLately)}
                        detail={t('in the last 30 days')}
                        color={GREEN}
                    />
                    <KpiHero label={t('Blocked')} value={formatNumber(overview.blocked)} color={GREEN} />
                </div>
                <div className="mt-4">
                    <TimeBars
                        bars={overview.weeks}
                        label={t('Registrations per week, the last 12 weeks')}
                        countLabel={(bar) => tn(bar.count, '{{count}} registration', '{{count}} registrations')}
                    />
                    <p className="text-faint fs-8 mt-2 mb-0">{t('Registrations per week, the last 12 weeks.')}</p>
                </div>
            </Panel>

            <div className="row g-4">
                <div className="col-12 col-lg-6">
                    <Panel header={t('Who they are')} className="h-100">
                        <SpreadList entries={[
                            { key: 'globalAdmin', label: t('Global admins'), count: overview.roles.globalAdmin, icon: 'pi pi-shield' },
                            { key: 'clubAdmin', label: t('Admins of a club'), count: overview.roles.clubAdmin, icon: 'pi pi-building' },
                            { key: 'player', label: t('Players of a club'), count: overview.roles.player, icon: 'pi pi-user' },
                            { key: 'noClub', label: t('No club yet'), count: overview.roles.noClub, icon: 'pi pi-question-circle' },
                        ]} />
                    </Panel>
                </div>
                <div className="col-12 col-lg-6">
                    <Panel header={t('Languages')} className="h-100">
                        <SpreadList entries={overview.languages.map(language => ({ key: language.code, label: languageOf(language.code), count: language.count, icon: 'pi pi-language' }))} />
                    </Panel>
                </div>
            </div>

            {toLookAfter > 0 &&
                <Panel header={t('To look after')}>
                    <div className="d-flex flex-column gap-4">
                        <ChipGroup
                            title={tn(overview.neverLoggedIn.length, '{{count}} account never used', '{{count}} accounts never used')}
                            hint={t('Registered, but never logged in. The oldest first.')}
                            items={overview.neverLoggedIn.map(chip)}
                            onPick={pick}
                        />
                        <ChipGroup
                            title={tn(overview.inactive.length, '{{count}} account unused for half a year', '{{count}} accounts unused for half a year')}
                            hint={t('The last login more than {{days}} days ago, e.g. {{date}}.', { days: INACTIVE_DAYS, date: dayjs(overview.inactive[0]?.lastLoginAt).format('DD.MM.YYYY') })}
                            items={overview.inactive.map(chip)}
                            onPick={pick}
                        />
                        <ChipGroup
                            title={tn(overview.withoutClub.length, '{{count}} account without a club', '{{count}} accounts without a club')}
                            hint={t('Neither a player nor an admin of a club yet.')}
                            items={overview.withoutClub.map(chip)}
                            onPick={pick}
                        />
                    </div>
                    <p className="text-faint fs-8 mt-3 mb-0">{t('A click shows the account in the list below.')}</p>
                </Panel>
            }
        </div>
    );
};

export default UsersOverview;
