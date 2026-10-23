import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';

import StatsService from '../../services/stats.service';

import BadgeMedal from './badge.medal';
import ShameMedal from './shame.medal';
import { BadgesSkeleton } from '../elements/skeletons';
import FlightCollection from '../flights/flight.collection';
import { FaSoap } from 'react-icons/fa6';
import { locale, t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value);

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
                            <span className="text-faint fs-7">{t('Next:')}{' '}{next.title} · {next.description}</span>
                            {next.lower && next.progress > 0 &&
                                <span className="text-faint fs-8">{t('Your best so far:')}{' '}{formatNumber(next.progress)}{' '}{t('darts')}</span>
                            }
                            {!next.lower && next.target > 1 &&
                                <div className="d-flex align-items-center gap-2">
                                    <ProgressBar value={Math.round(next.progress / next.target * 100)} showValue={false} className="flex-grow-1" style={{ height: '0.35rem', maxWidth: '16rem' }} />
                                    <span className="text-faint fs-8 tabular-nums">{formatNumber(next.progress)} / {formatNumber(next.target)}</span>
                                </div>
                            }
                        </>
                    )
                    : <span className="text-subtle fs-7">{earnedCount === 1 ? t('Earned') : t('Complete')}</span>
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
    <li className="shame-entry">
        <ShameMedal badge={badge} size="sm" washed />
        <div className="d-flex flex-column gap-1 min-w-0">
            <span className="d-flex flex-wrap align-items-center gap-2">
                <span className={badge.count > 0 ? 'text-default fw-semibold' : 'text-subtle fw-semibold'}>{badge.title}</span>
                {badge.count > 0
                    ? <span className="shame-label is-washed">{t('Washed off')}{' '}{formatDate(badge.washedAt)}</span>
                    : <span className="text-faint fs-8">{t('Never')}</span>}
                {badge.count > 1 && <span className="shame-times">{badge.count}{' '}{t('times')}</span>}
            </span>
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
                    {others.map(badge => <ShameEntry key={badge.id} badge={badge} />)}
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
            <div className="d-flex flex-wrap align-items-center column-gap-4 row-gap-2">
                <h2 className="fs-4 fw-semibold text-default m-0">{t('Badges')}</h2>
                <span className="text-subtle">{data.earnedCount}{' '}{t('of')}{' '}{data.total}{' '}{t('collected')}</span>
                <ProgressBar value={Math.round(data.earnedCount / data.total * 100)} showValue={false} style={{ height: '0.5rem', width: '16rem', maxWidth: '100%' }} />
            </div>
            {categories.map(category => (
                <Panel key={category.category} header={`${category.title} · ${category.earned} / ${category.total}`}>
                    <ul className="list-unstyled m-0 d-flex flex-column">
                        {category.series.map(badges => <BadgeSeries key={badges[0].group} badges={badges} />)}
                    </ul>
                </Panel>
            ))}
            <FlightCollection playerId={playerId} />
        </div>
    );
};

export default PlayerBadgeCollection;
