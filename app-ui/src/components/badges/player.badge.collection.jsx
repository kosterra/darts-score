import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { ProgressBar } from 'primereact/progressbar';

import StatsService from '../../services/stats.service';
import PageLoader from '../elements/page.loader';
import BadgeMedal from './badge.medal';

const formatNumber = (value) => new Intl.NumberFormat().format(value);

/**
 * One series of badges (e.g. 180s): its tiers side by side, and what is
 * needed for the next one.
 */
const BadgeSeries = ({ badges }) => {
    const next = badges.find(badge => !badge.earned);
    const earnedCount = badges.filter(badge => badge.earned).length;

    return (
        <li className="badge-series">
            <div className="badge-series-info">
                <span className="text-default fw-semibold">{badges[0].groupTitle}</span>
                {badges.length === 1
                    ? (
                        <span className="text-faint fs-7">{badges[0].description}</span>
                    )
                    : next
                    ? (
                        <>
                            <span className="text-faint fs-7">Next: {next.title} · {next.description}</span>
                            {next.lower && next.progress > 0 &&
                                <span className="text-faint fs-8">Your best so far: {formatNumber(next.progress)} darts</span>
                            }
                            {!next.lower && next.target > 1 &&
                                <div className="d-flex align-items-center gap-2">
                                    <ProgressBar value={Math.round(next.progress / next.target * 100)} showValue={false} className="flex-grow-1" style={{ height: '0.35rem', maxWidth: '16rem' }} />
                                    <span className="text-faint fs-8" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(next.progress)} / {formatNumber(next.target)}</span>
                                </div>
                            }
                        </>
                    )
                    : <span className="text-subtle fs-7">{earnedCount === 1 ? 'Earned' : 'Complete'}</span>
                }
            </div>
            <ul className="badge-series-tiers list-unstyled m-0">
                {badges.map(badge => (
                    <li key={badge.id} className="badge-tier" title={`${badge.title}: ${badge.description}`}>
                        <BadgeMedal badge={badge} locked={!badge.earned} />
                        <span className={`badge-tier-name fs-8 ${badge.earned ? 'text-default' : 'text-faint'}`}>{badge.title}</span>
                    </li>
                ))}
            </ul>
        </li>
    );
};

/**
 * One player's badge collection, by category and series, with how much of it
 * they have collected. Part of the player's profile.
 */
const PlayerBadgeCollection = ({ playerId, onLoaded }) => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setData(null);
        StatsService.loadPlayerBadges(playerId)
            .then(loaded => { setData(loaded); onLoaded?.(); })
            .catch(() => setFailed(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerId]);

    if (failed) return <p className="text-subtle">The badges could not be loaded.</p>;
    if (!data) return <PageLoader />;

    // category -> series -> badges, in catalogue order
    const categories = data.categories.map(({ category, title }) => {
        const series = [];
        for (const badge of data.badges.filter(b => b.category === category)) {
            if (series.at(-1)?.[0].group !== badge.group) series.push([]);
            series.at(-1).push(badge);
        }
        const badges = series.flat();
        return { category, title, series, earned: badges.filter(b => b.earned).length, total: badges.length };
    });

    return (
        <div className="d-flex flex-column gap-4">
            <div className="d-flex flex-wrap align-items-center column-gap-4 row-gap-2">
                <h2 className="fs-4 fw-semibold text-default m-0">Badges</h2>
                <span className="text-subtle">{data.earnedCount} of {data.total} collected</span>
                <ProgressBar value={Math.round(data.earnedCount / data.total * 100)} showValue={false} style={{ height: '0.5rem', width: '16rem', maxWidth: '100%' }} />
            </div>
            {categories.map(category => (
                <Panel key={category.category} header={`${category.title} · ${category.earned} / ${category.total}`}>
                    <ul className="list-unstyled m-0 d-flex flex-column">
                        {category.series.map(badges => <BadgeSeries key={badges[0].group} badges={badges} />)}
                    </ul>
                </Panel>
            ))}
        </div>
    );
};

export default PlayerBadgeCollection;
