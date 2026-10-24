import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';

import AdminService from '../../services/admin.service';
import { KpiHero } from '../stats/players/kpi';
import { TimeBars } from './installation.parts';
import { formatNumber } from './installation.utils';
import { OverviewSkeleton } from '../elements/skeletons';
import { formatDate } from '../../utils/dates';
import { t, tn } from '../../utils/i18n';
import { ACCENT } from '../../utils/palette';

const GREEN = ACCENT.green;
const WEEKS = 12;

// the change against the week before: "+12 %", "±0 %", "+3" (from nothing)
const changeOf = (now, before) => {
    if (!before) return now ? `+${formatNumber(now)}` : null;
    const percent = Math.round(((now - before) / before) * 100);
    return percent === 0 ? '±0 %' : `${percent > 0 ? '+' : ''}${percent} %`;
};

/**
 * For global admins: the use of the app per week (Monday to Sunday). Last
 * week's figures against the week before, the current week so far, the last
 * twelve weeks as bars and as a table. The same comes by mail on Mondays.
 */
const UsagePage = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        AdminService.loadUsage(WEEKS).then(setData).catch(err => setError(err.message));
    }, []);

    if (!data) return error ? <Message severity="error" text={error} /> : <OverviewSkeleton title={t('Last week')} />;
    const [current, last, before] = data.weeks;
    const rangeOf = (week) => `${formatDate(week.start, { year: 'none' })} – ${formatDate(new Date(new Date(week.end).getTime() - 1), { year: 'none' })}`;
    const detail = (key, pick = (week) => week[key]) => {
        const change = changeOf(pick(last), pick(before));
        return [change && t('{{change}} against the week before', { change }), t('this week so far: {{count}}', { count: formatNumber(pick(current)) })].filter(Boolean).join(' · ');
    };
    // oldest first, for the bars
    const bars = (pick) => [...data.weeks].reverse().map(week => ({ start: week.start, count: pick(week) }));
    const tracked = (week) => week.tracked || week.activeUsers > 0;

    return (
        <div className="d-flex flex-column gap-4">
            <Panel header={`${t('Last week')} · ${rangeOf(last)}`}>
                <div className="kpi-headline">
                    <KpiHero label={t('Active users')} value={tracked(last) ? formatNumber(last.activeUsers) : '–'} detail={detail('activeUsers')} color={GREEN} />
                    <KpiHero label={t('Logins')} value={tracked(last) ? formatNumber(last.logins) : '–'} detail={detail('logins')} color={GREEN} />
                    <KpiHero label={t('Games started')} value={formatNumber(last.games.total)} detail={detail('games', (week) => week.games.total)} color={GREEN} />
                    <KpiHero label={t('New accounts')} value={formatNumber(last.newUsers)} detail={detail('newUsers')} color={GREEN} />
                </div>
                {last.mailLimitDays > 0 &&
                    <Message
                        severity="warn"
                        className="w-100 justify-content-start mt-3"
                        text={t('The daily mail limit was reached on {{count}} of 7 days; {{held}} mails were held back. See System settings → Mail server.', { count: last.mailLimitDays, held: last.mailsHeldBack })}
                    />}
                <p className="text-faint fs-8 mt-3 mb-0">
                    {data.since
                        ? t('Active users (accounts that used the app) and logins are counted since {{date}}; games, trainings, accounts and clubs from the start.', { date: formatDate(data.since) })
                        : t('Active users (accounts that used the app) and logins are counted from now on; games, trainings, accounts and clubs from the start.')}
                    {' '}{t('The report comes by mail on Mondays; choose it under')}{' '}<Link to="/profile#notifications">{t('Profile → Notifications')}</Link>.
                </p>
            </Panel>

            <Panel header={t('The last {{count}} weeks', { count: WEEKS })}>
                <div className="row g-4">
                    <div className="col-12 col-lg-6">
                        <span className="text-subtle fs-7 d-block mb-2">{t('Active users per week')}</span>
                        <TimeBars bars={bars(week => week.activeUsers)} label={t('Active users per week')} countLabel={(bar) => tn(bar.count, '{{count}} active user', '{{count}} active users')} />
                    </div>
                    <div className="col-12 col-lg-6">
                        <span className="text-subtle fs-7 d-block mb-2">{t('Games started per week')}</span>
                        <TimeBars bars={bars(week => week.games.total)} label={t('Games started per week')} countLabel={(bar) => tn(bar.count, '{{count}} game', '{{count}} games')} />
                    </div>
                </div>
                <div className="usage-table-wrap mt-4">
                    <table className="usage-table">
                        <thead>
                            <tr>
                                <th>{t('Week')}</th>
                                <th>{t('Active users')}</th>
                                <th>{t('Logins')}</th>
                                <th>{t('Games')}</th>
                                <th>{t('Clubs that played')}</th>
                                <th>{t('Trainings')}</th>
                                <th>{t('Quick games')}</th>
                                <th>{t('New accounts')}</th>
                                <th>{t('New clubs')}</th>
                                <th>{t('New players')}</th>
                                <th>{t('Mails')}</th>
                                <th>{t('Mail limit reached')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.weeks.map(week => (
                                <tr key={week.start} className={week.current ? 'is-current' : ''}>
                                    <td>{rangeOf(week)}{week.current && <span className="text-faint ms-2">{t('so far')}</span>}</td>
                                    <td>{tracked(week) ? formatNumber(week.activeUsers) : '–'}</td>
                                    <td>{tracked(week) ? formatNumber(week.logins) : '–'}</td>
                                    <td>{formatNumber(week.games.total)}</td>
                                    <td>{formatNumber(week.activeClubs)}</td>
                                    <td>{formatNumber(week.trainings)}</td>
                                    <td>{formatNumber(week.quickGames)}</td>
                                    <td>{formatNumber(week.newUsers)}</td>
                                    <td>{formatNumber(week.newClubs)}</td>
                                    <td>{formatNumber(week.newPlayers)}</td>
                                    <td>{formatNumber(week.mails)}</td>
                                    <td className={week.mailLimitDays ? 'text-danger' : ''}>{week.mailLimitDays ? tn(week.mailLimitDays, '{{count}} day', '{{count}} days') : '–'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
};

export default UsagePage;
