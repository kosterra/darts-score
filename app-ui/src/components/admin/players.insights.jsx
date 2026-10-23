import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';

import AdminService from '../../services/admin.service';
import { ClubRanking, TimeBars } from './installation.parts';
import { formatNumber, scrollToList } from './installation.utils';
import { KpiHero } from '../stats/players/kpi';
import { t, tn } from '../../utils/i18n';

const GREEN = '#7ecca5';

/**
 * The players of every club at a glance, for the global admins, above their
 * list (which only shows the clubs picked): members (each person once),
 * newcomers, players in several clubs and with a login, the new players of
 * the last twelve weeks and the clubs by their members (a click picks the
 * club for the list). onPickClub(clubId)
 */
const PlayersInsights = ({ onPickClub }) => {
    const [insights, setInsights] = useState(null);

    useEffect(() => {
        AdminService.loadPlayersInsights().then(setInsights).catch(error => console.error('Failed to load the players insights', error));
    }, []);

    if (!insights?.members) return null;
    const clubOf = (id) => insights.clubsById?.[id];

    return (
        <div className="d-flex flex-column gap-4 mb-4">
            <Panel header={t('Players of all clubs at a glance')}>
                <div className="kpi-headline">
                    <KpiHero
                        label={t('Players')}
                        value={formatNumber(insights.members)}
                        detail={tn(insights.guests, '{{count}} guest besides', '{{count}} guests besides')}
                        color={GREEN}
                    />
                    <KpiHero label={t('New in the last 30 days')} value={formatNumber(insights.newLately)} color={GREEN} />
                    <KpiHero label={t('In several clubs')} value={formatNumber(insights.multiClub)} color={GREEN} />
                    <KpiHero
                        label={t('With a login')}
                        value={formatNumber(insights.withLogin)}
                        detail={t('{{percent}} % of the players', { percent: Math.round(insights.withLogin / insights.members * 100) })}
                        color={GREEN}
                    />
                </div>
            </Panel>

            <div className="row g-4">
                <div className="col-12 col-xl-7">
                    <Panel header={t('Largest clubs')} className="h-100">
                        <ClubRanking
                            pickLabel={t('Show this club in the list')}
                            onPick={(entry) => { onPickClub(entry.id); scrollToList(); }}
                            entries={insights.clubs.map(club => ({
                                id: club.clubId,
                                club: clubOf(club.clubId),
                                value: club.members,
                                label: <><strong className="text-default">{formatNumber(club.members)}</strong>{' '}{club.members === 1 ? t('member') : t('members')}</>,
                                line: <>
                                    {tn(club.guests, '{{count}} guest', '{{count}} guests')}
                                    {' · '}{tn(club.withLogin, '{{count}} with a login', '{{count}} with a login')}
                                    {club.newLately > 0 && <> · {tn(club.newLately, '{{count}} new lately', '{{count}} new lately')}</>}
                                </>,
                            }))}
                        />
                    </Panel>
                </div>
                <div className="col-12 col-xl-5">
                    <Panel header={t('New players')} className="h-100">
                        <TimeBars
                            bars={insights.weeks}
                            label={t('New players per week, the last 12 weeks')}
                            countLabel={(bar) => tn(bar.count, '{{count}} new player', '{{count}} new players')}
                        />
                        <p className="text-faint fs-8 mt-3 mb-0">{t('Per week, the last 12 weeks. Guests are not counted.')}</p>
                        {insights.withoutClub > 0 &&
                            <p className="text-warning fs-8 mt-2 mb-0">{tn(insights.withoutClub, '{{count}} player belongs to no club any more.', '{{count}} players belong to no club any more.')}</p>}
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default PlayersInsights;
