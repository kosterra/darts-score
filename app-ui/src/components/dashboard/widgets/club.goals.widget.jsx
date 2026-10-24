import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';

import StatsService from '../../../services/stats.service';
import ClubMedal from '../../badges/club.medal';
import { Lines } from '../../elements/skeletons';
import { ClubGoalList, ClubProgress } from '../../badges/club.badges';
import { formatDate } from '../../../utils/dates';
import { locale, t } from '../../../utils/i18n';

const NEXT_SHOWN = 3;
const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

/**
 * The club's goals with how far each is; without goals, the club badges it is
 * closest to, and the latest it earned.
 */
const ClubGoalsWidget = ({ widget }) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        StatsService.loadClubOwnBadges().then(setData).catch(error => console.error('Failed to load the club badges', error));
    }, []);

    // the next tier of each series, closest first (the firsts and years are not "on the way")
    const next = (data?.badges ?? [])
        .filter((badge, index, all) => !badge.earned && badge.target > 1 && badge.group !== 'clubAnniversary'
            && !all.slice(0, index).some(other => other.group === badge.group && !other.earned))
        .sort((a, b) => b.progress / b.target - a.progress / a.target)
        .slice(0, NEXT_SHOWN);
    const latest = (data?.badges ?? []).filter(badge => badge.earned).sort((a, b) => new Date(b.earned.earnedAt) - new Date(a.earned.earnedAt))[0];

    return (
        <Panel header={widget.title} className="h-100">
            {!data
                ? <Lines count={3} />
                : <div className="d-flex flex-column gap-4">
                    {(data.goals ?? []).length > 0
                        ? <ClubGoalList goals={data.goals ?? []} />
                        : <ul className="list-unstyled m-0 d-flex flex-column gap-3">
                            {next.map(badge => (
                                <li key={badge.id} className="d-flex align-items-center gap-3">
                                    <ClubMedal badge={badge} locked size="sm" />
                                    <span className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                                        <span className="d-flex justify-content-between gap-2">
                                            <span className="text-default fs-7 fw-semibold text-truncate">{badge.title}</span>
                                            <span className="text-subtle fs-8 tabular-nums text-nowrap">{formatNumber(badge.progress)} / {formatNumber(badge.target)}</span>
                                        </span>
                                        <ClubProgress value={badge.progress} target={badge.target} label={badge.title} />
                                    </span>
                                </li>
                            ))}
                        </ul>}
                    {latest &&
                        <div className="d-flex align-items-center gap-3">
                            <ClubMedal badge={latest} size="sm" />
                            <span className="d-flex flex-column min-w-0">
                                <span className="text-faint fs-8">{t('Latest club badge')}{' · '}{formatDate(latest.earned.earnedAt)}</span>
                                <span className="text-default fs-7 fw-semibold text-truncate">{latest.title}</span>
                            </span>
                        </div>}
                    <Link to="/badges#club" className="fs-8">{t('All club badges')}</Link>
                </div>}
        </Panel>
    );
};

export default ClubGoalsWidget;
