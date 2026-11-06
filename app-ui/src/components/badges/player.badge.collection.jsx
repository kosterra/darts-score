import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';

import StatsService from '../../services/stats.service';

import BadgeMedal from './badge.medal';
import ShameMedal from './shame.medal';
import { BadgesSkeleton } from '../elements/skeletons';
import FlightCollection from '../flights/flight.collection';
import { FaCheck, FaHourglassHalf, FaLock, FaSoap } from 'react-icons/fa6';
import { locale, t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value);
// how many of the nearest badges show on top
const NEXT_UP = 6;

// how close the next badge of a series is, from 0 to 1 (fewer is better: the target against the best so far)
const closeness = (badge) => {
    if (!badge || !(badge.progress > 0)) return 0;
    if (badge.lower) return Math.min(1, badge.target / badge.progress);
    return badge.target > 1 ? Math.min(1, badge.progress / badge.target) : 0;
};

// the progress towards a badge: a bar with the numbers, or the best so far where fewer is better
const NextProgress = ({ badge }) => (badge.lower
    ? badge.progress > 0 && <span className="text-faint fs-8">{t('Your best so far:')}{' '}{formatNumber(badge.progress)}{' '}{t('darts')}</span>
    : badge.target > 1 &&
        <span className="d-flex align-items-center gap-2">
            <ProgressBar value={Math.round(badge.progress / badge.target * 100)} showValue={false} className="flex-grow-1" style={{ height: '0.35rem' }} />
            <span className="text-faint fs-8 tabular-nums text-nowrap">{formatNumber(badge.progress)} / {formatNumber(badge.target)}</span>
        </span>);

/**
 * One series of badges (e.g. 180s) as a card: the latest medal beside its name
 * and what is next with how far it is, then the whole ladder of the series
 * (earned in gold with a tick, the next with an hourglass, the later ones
 * locked; each with what it takes on hover).
 */
const BadgeSeries = ({ badges }) => {
    const next = badges.find(badge => !badge.earned);
    const latest = [...badges].reverse().find(badge => badge.earned);

    return (
        <li className={`badge-series-card ${latest ? '' : 'is-locked'}`}>
            <span className="d-flex align-items-center gap-3 min-w-0">
                <BadgeMedal badge={latest ?? badges[0]} locked={!latest} size="sm" />
                <span className="d-flex flex-column min-w-0">
                    <span className="text-default fs-7 fw-semibold text-truncate">{badges[0].groupTitle}</span>
                    <span className="text-faint fs-8">
                        {badges.length === 1
                            ? badges[0].description
                            : next ? <>{t('Next:')}{' '}{next.title} · {next.description}</> : t('All earned')}
                    </span>
                </span>
            </span>
            {next && <NextProgress badge={next} />}
            {badges.length > 1 &&
                <ol className="club-ladder list-unstyled m-0" aria-label={t('All steps')}>
                    {badges.map(badge => (
                        <li key={badge.id} className={badge.earned ? 'is-earned' : badge === next ? 'is-next' : ''} title={badge.description}>
                            {badge.earned ? <FaCheck aria-hidden="true" /> : badge === next ? <FaHourglassHalf aria-hidden="true" /> : <FaLock aria-hidden="true" />}
                            {badge.title}
                        </li>
                    ))}
                </ol>}
        </li>
    );
};

/**
 * The badges a player is closest to: the next of each series they started,
 * nearest first.
 */
const NextUp = ({ series }) => {
    const nearest = series
        .map(badges => badges.find(badge => !badge.earned))
        .filter(badge => closeness(badge) > 0)
        .sort((a, b) => closeness(b) - closeness(a))
        .slice(0, NEXT_UP);
    if (!nearest.length) return null;
    return (
        <section className="d-flex flex-column gap-3">
            <h3 className="stats-section-title mb-0">{t('Next up')}</h3>
            <ul className="badge-next-up list-unstyled m-0">
                {nearest.map(badge => (
                    <li key={badge.id} className="badge-series-card" title={badge.description}>
                        <span className="d-flex align-items-center gap-3 min-w-0">
                            <BadgeMedal badge={badge} locked size="sm" />
                            <span className="d-flex flex-column min-w-0">
                                <span className="text-default fs-7 fw-semibold text-truncate">{badge.title}</span>
                                <span className="text-faint fs-8 text-truncate">{badge.description}</span>
                            </span>
                        </span>
                        <NextProgress badge={badge} />
                    </li>
                ))}
            </ul>
        </section>
    );
};

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);


/**
 * A shame badge the player has right now: a card that stands out, with since
 * when and the good deed that washes it off.
 */
const ShameCard = ({ badge }) => (
    <li className="shame-card">
        <ShameMedal badge={badge} />
        <div className="d-flex flex-column gap-1 min-w-0">
            <span className="d-flex flex-wrap align-items-center gap-2">
                <span className="text-default fw-semibold">{badge.title}</span>
                <span className="shame-label">{t('Since')}{' '}{formatDate(badge.lastAt)}</span>
                {badge.count > 1 && <span className="shame-times">{badge.count}{' '}{t('times')}</span>}
            </span>
            <span className="text-faint fs-8">{badge.description}</span>
            <span className="shame-wash"><FaSoap aria-hidden="true" />{' '}{t('Wash it off:')}{' '}{lowerFirst(badge.wash)}</span>
        </div>
    </li>
);

/**
 * A shame badge the player does not have right now: washed off, or never had.
 */
const ShameEntry = ({ badge }) => (
    <li className={`shame-entry ${badge.count > 0 ? 'is-washed' : 'is-never'}`}>
        <ShameMedal badge={badge} size="sm" washed />
        <div className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
            {/* the badge with Never on the right, or under it when it was washed off (and how often) */}
            <span className="d-flex align-items-start justify-content-between gap-2">
                <span className="shame-entry-title">{badge.title}</span>
                {!(badge.count > 0) && <span className="shame-never">{t('Never')}</span>}
            </span>
            {badge.count > 0 &&
                <span className="d-flex flex-wrap align-items-center gap-2">
                    <span className="shame-label is-washed">{t('Washed off')}{' '}{formatDate(badge.washedAt)}</span>
                    {badge.count > 1 && <span className="shame-times">{badge.count}{' '}{t('times')}</span>}
                </span>}
            <span className="text-faint fs-8">{badge.description}</span>
        </div>
    </li>
);

/**
 * The player's Hall of Shame, always above the badges: what is on them right
 * now, then the rest. With nothing on them it is a single line that opens the
 * whole list on request.
 */
const HallOfShameSection = ({ shame, name }) => {
    const [open, setOpen] = useState(false);
    const active = shame.filter(badge => badge.active);
    const others = shame.filter(badge => !badge.active);
    const showList = active.length > 0 || open;
    return (
        <section id="hall-of-shame" className="d-flex flex-column gap-3" style={{ scrollMarginTop: '1rem' }}>
            <div className="d-flex flex-wrap align-items-center column-gap-4 row-gap-2">
                <h2 className="fs-4 fw-semibold text-default m-0">{t('Hall of Shame')}</h2>
                <span className="text-subtle">{active.length ? t('{{length}} on {{name}} right now', { length: active.length, name: name }) : t('Nothing on {{name}} right now', { name: name })}</span>
                {active.length === 0 &&
                    <Button
                        type="button"
                        label={open ? t('Hide') : t('Show all {{length}}', { length: shame.length })}
                        icon={open ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
                        iconPos="right"
                        text
                        size="small"
                        aria-expanded={open}
                        onClick={() => setOpen(!open)}
                    />
                }
            </div>
            {showList &&
            <Panel header={active.length ? t('Right now') : t('All shame badges')}>
                <p className="text-faint fs-7 mt-0 mb-3">
                    {t('What nobody wants to throw. These badges add no XP. Each one stays on the player until they wash it off with its good deed, and in the club it belongs to whoever got it last.')}
                </p>
                {active.length > 0 &&
                    <>
                        <ul className="shame-cards list-unstyled m-0">
                            {active.map(badge => <ShameCard key={badge.id} badge={badge} />)}
                        </ul>
                        <h3 className="shame-others-title">{t('The others')}</h3>
                    </>
                }
                <ul className="shame-others list-unstyled m-0">
                    {/* the ones they had first, then those they never had */}
                    {[...others.filter(badge => badge.count > 0), ...others.filter(badge => !(badge.count > 0))].map(badge => <ShameEntry key={badge.id} badge={badge} />)}
                </ul>
            </Panel>
            }
        </section>
    );
};

/**
 * One player's badge collection, by category and series, with how much of it
 * they have collected, and their flights and barrels. Part of the player's
 * profile.
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

    if (failed) return <p className="text-subtle">{t('The badges could not be loaded.')}</p>;
    // a quiet line: the statistics above show the page's loader at the same time
    if (!data) return <BadgesSkeleton />;

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

    const name = data.player?.nickname ?? t('the player');

    return (
        <div className="d-flex flex-column gap-4">
            {data.shame && <HallOfShameSection shame={data.shame} name={name} />}
            {/* one panel as the other parts of the profile, the categories as its sections */}
            <Panel header={t('Badges')}>
                <div className="d-flex flex-column gap-4">
                    <div className="d-flex flex-wrap align-items-center column-gap-4 row-gap-2">
                        <span className="text-subtle">{data.earnedCount}{' '}{t('of')}{' '}{data.total}{' '}{t('collected')}</span>
                        <ProgressBar value={Math.round(data.earnedCount / data.total * 100)} showValue={false} style={{ height: '0.5rem', width: '16rem', maxWidth: '100%' }} />
                    </div>
                    <NextUp series={categories.flatMap(category => category.series)} />
                    {categories.map(category => (
                        <section key={category.category} className="d-flex flex-column gap-3">
                            <h3 className="stats-section-title mb-0">{category.title} · {category.earned} / {category.total}</h3>
                            <ul className="badge-series-grid list-unstyled m-0">
                                {category.series.map(badges => <BadgeSeries key={badges[0].group} badges={badges} />)}
                            </ul>
                        </section>
                    ))}
                </div>
            </Panel>
            <FlightCollection playerId={playerId} />
        </div>
    );
};

export default PlayerBadgeCollection;
