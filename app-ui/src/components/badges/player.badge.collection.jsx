import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { ProgressBar } from 'primereact/progressbar';

import StatsService from '../../services/stats.service';
import dayjs from 'dayjs';

import BadgeMedal from './badge.medal';
import ShameMedal from './shame.medal';
import { FaSoap } from 'react-icons/fa6';

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

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);

const formatDate = (date) => dayjs(date).format('DD.MM.YYYY');

/**
 * A shame badge the player has right now: a card that stands out, with since
 * when and the good deed that washes it off.
 */
const ShameCard = ({ badge }) => (
    <li className="shame-card">
        <ShameMedal badge={badge} />
        <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
            <span className="d-flex flex-wrap align-items-center gap-2">
                <span className="text-default fw-semibold">{badge.title}</span>
                <span className="shame-label">Since {formatDate(badge.lastAt)}</span>
                {badge.count > 1 && <span className="shame-times">{badge.count} times</span>}
            </span>
            <span className="text-faint fs-8">{badge.description}</span>
            <span className="shame-wash"><FaSoap aria-hidden="true" /> Wash it off: {lowerFirst(badge.wash)}</span>
        </div>
    </li>
);

/**
 * A shame badge the player does not have right now: washed off, or never had.
 */
const ShameEntry = ({ badge }) => (
    <li className="shame-entry">
        <ShameMedal badge={badge} size="sm" washed />
        <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
            <span className="d-flex flex-wrap align-items-center gap-2">
                <span className={badge.count > 0 ? 'text-default fw-semibold' : 'text-subtle fw-semibold'}>{badge.title}</span>
                {badge.count > 0
                    ? <span className="shame-label is-washed">Washed off {formatDate(badge.washedAt)}</span>
                    : <span className="text-faint fs-8">Never</span>}
                {badge.count > 1 && <span className="shame-times">{badge.count} times</span>}
            </span>
            <span className="text-faint fs-8">{badge.description}</span>
        </div>
    </li>
);

/**
 * The player's Hall of Shame: what is on them right now, then the rest.
 */
const HallOfShameSection = ({ shame, name }) => {
    const active = shame.filter(badge => badge.active);
    const others = shame.filter(badge => !badge.active);
    return (
        <section className="d-flex flex-column gap-3">
            <div className="d-flex flex-wrap align-items-center column-gap-4 row-gap-2">
                <h2 className="fs-4 fw-semibold text-default m-0">Hall of Shame</h2>
                <span className="text-subtle">{active.length ? `${active.length} on ${name} right now` : `Nothing on ${name} right now`}</span>
            </div>
            <Panel header={active.length ? 'Right now' : 'All shame badges'}>
                <p className="text-faint fs-7 mt-0 mb-3">
                    What nobody wants to throw. These badges add no XP. Each one stays on the player until they wash it off with its good deed, and in the club it belongs to whoever got it last.
                </p>
                {active.length > 0 &&
                    <>
                        <ul className="shame-cards list-unstyled m-0">
                            {active.map(badge => <ShameCard key={badge.id} badge={badge} />)}
                        </ul>
                        <h3 className="shame-others-title">The others</h3>
                    </>
                }
                <ul className="shame-others list-unstyled m-0">
                    {others.map(badge => <ShameEntry key={badge.id} badge={badge} />)}
                </ul>
            </Panel>
        </section>
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
    // a quiet line: the statistics above show the page's loader at the same time
    if (!data) return <p className="text-faint">Loading badges…</p>;

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

    const name = data.player?.nickname ?? 'the player';
    // what is on the player right now comes first, so it is seen; a clean
    // record waits at the end
    const activeShame = data.shame?.some(badge => badge.active);
    const shame = data.shame && <HallOfShameSection shame={data.shame} name={name} />;

    return (
        <div className="d-flex flex-column gap-4">
            {activeShame && shame}
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
            {!activeShame && shame}
        </div>
    );
};

export default PlayerBadgeCollection;
