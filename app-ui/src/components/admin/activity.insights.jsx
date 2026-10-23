import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';

import AdminService from '../../services/admin.service';
import { ClubRanking, KindList, TimeBars } from './installation.parts';
import { formatNumber, scrollToList } from './installation.utils';
import { KpiHero } from '../stats/players/kpi';
import { gameTitle, trainingIcon, trainingTitle } from './kind.titles';
import { t, tn } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { ACCENT } from '../../utils/palette';

const GREEN = ACCENT.green;

// what differs between the games and the trainings
const OF = {
    games: {
        load: AdminService.loadGamesInsights,
        header: () => t('Games of all clubs at a glance'),
        total: () => t('Games'),
        active: () => t('Clubs playing'),
        clubs: () => t('Clubs playing most'),
        popular: () => t('Popular games'),
        titleOf: gameTitle,
        iconOf: (kind) => kind,
    },
    trainings: {
        load: AdminService.loadTrainingsInsights,
        header: () => t('Trainings of all clubs at a glance'),
        total: () => t('Trainings'),
        active: () => t('Clubs training'),
        clubs: () => t('Clubs training most'),
        popular: () => t('Popular trainings'),
        titleOf: trainingTitle,
        iconOf: trainingIcon,
    },
};

/**
 * The games or trainings of every club at a glance, for the global admins,
 * above their list (which only shows the clubs picked): how many, lately,
 * running and left running, the last twelve weeks, the clubs by how much
 * they play (a click picks the club for the list) and the kinds played most.
 * what: 'games' or 'trainings'; onPickClub(clubId)
 */
const ActivityInsights = ({ what, onPickClub }) => {
    const of = OF[what];
    const [insights, setInsights] = useState(null);

    useEffect(() => {
        of.load().then(setInsights).catch(error => console.error(`Failed to load the ${what} insights`, error));
    }, [of, what]);

    if (!insights?.total) return null;
    const clubOf = (id) => insights.clubsById?.[id];
    const isGames = what === 'games';

    return (
        <div className="d-flex flex-column gap-4 mb-4">
            <Panel header={of.header()}>
                <div className="kpi-headline">
                    <KpiHero label={of.total()} value={formatNumber(insights.total)} color={GREEN} />
                    <KpiHero label={t('In the last 30 days')} value={formatNumber(insights.last30Days)} color={GREEN} />
                    {isGames
                        ? <KpiHero
                            label={t('Running now')}
                            value={formatNumber(insights.running)}
                            detail={insights.stuck ? tn(insights.stuck, '{{count}} left for over a week', '{{count}} left for over a week') : null}
                            color={GREEN}
                        />
                        : <KpiHero label={t('Players training')} value={formatNumber(insights.players)} detail={t('in the last 30 days')} color={GREEN} />}
                    <KpiHero label={of.active()} value={formatNumber(insights.activeClubs)} detail={t('in the last 30 days')} color={GREEN} />
                </div>
                <div className="mt-4">
                    <TimeBars
                        bars={insights.weeks}
                        label={t('The last 12 weeks')}
                        finishedLabel={isGames ? t('and finished') : null}
                        countLabel={(bar) => isGames
                            ? t('{{count}} started, {{finished}} finished', { count: bar.count, finished: bar.finished })
                            : tn(bar.count, '{{count}} training', '{{count}} trainings')}
                    />
                </div>
            </Panel>

            <div className="row g-4">
                <div className="col-12 col-xl-7">
                    <Panel header={of.clubs()} className="h-100">
                        <ClubRanking
                            pickLabel={t('Show this club in the list')}
                            onPick={(entry) => { onPickClub(entry.id); scrollToList(); }}
                            entries={insights.clubs.map(club => ({
                                id: club.clubId,
                                club: clubOf(club.clubId),
                                value: club.last30Days,
                                label: <><strong className="text-default">{formatNumber(club.last30Days)}</strong>{' '}{t('in the last 30 days')}</>,
                                line: <>
                                    {t('{{count}} in all', { count: formatNumber(club.total) })}
                                    {club.players > 0 && <> · {tn(club.players, '{{count}} player lately', '{{count}} players lately')}</>}
                                    {club.lastAt && <> · {t('last {{date}}', { date: formatDate(club.lastAt) })}</>}
                                    {club.stuck > 0 && <span className="text-warning"> · {tn(club.stuck, '{{count}} left running', '{{count}} left running')}</span>}
                                </>,
                            }))}
                        />
                    </Panel>
                </div>
                <div className="col-12 col-xl-5">
                    <Panel header={of.popular()} className="h-100">
                        <KindList entries={insights.popular} titleOf={of.titleOf} iconOf={of.iconOf} />
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default ActivityInsights;
