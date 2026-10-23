import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { FaTrophy } from 'react-icons/fa6';

import ClubLogo from '../elements/club.logo';
import GameTypeIcon from '../elements/game.type.icon';
import { formatNumber } from './installation.utils';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { ACCENT, PODIUM } from '../../utils/palette';

const SHOWN = 10;


/**
 * The clubs ranked by a number, for the global admins' overviews: the first
 * ten (a search and Show all with more), a trophy for the first three and a
 * bar. A click picks the club for the list below (onPick).
 * entries: [{ id, club, value, label, line }], best first
 */
export const ClubRanking = ({ entries, onPick, barClass = 'is-green', pickLabel }) => {
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);
    const term = search.trim().toLowerCase();
    const shown = term ? entries.filter(entry => entry.club?.name?.toLowerCase().includes(term)) : showAll ? entries : entries.slice(0, SHOWN);
    const placeOf = (entry) => entries.findIndex(other => other.value === entry.value) + 1;
    const top = entries[0]?.value || 1;

    if (!entries.length) return <span className="text-faint fs-7">{t('Nothing yet.')}</span>;
    return (
        <>
            {entries.length > SHOWN &&
                <span className="p-input-icon-left w-100 mb-3">
                    <i className="pi pi-search" />
                    <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search clubs')} aria-label={t('Search clubs')} className="w-100" />
                </span>}
            {shown.length === 0
                ? <span className="text-faint fs-7">{t('No club matches “')}{search}”.</span>
                : <ol className="badge-ranking list-unstyled m-0">
                    {shown.map(entry => {
                        const place = placeOf(entry);
                        const podium = entry.value > 0 && place <= 3 ? PODIUM[place - 1] : null;
                        return (
                            <li key={entry.id}>
                                <button
                                    type="button"
                                    className="badge-ranking-row is-button"
                                    style={{ '--podium': podium ?? 'transparent' }}
                                    onClick={() => onPick?.(entry)}
                                    title={pickLabel}
                                >
                                    <span className="badge-ranking-place" aria-label={t('Place {{place}}', { place })}>
                                        {podium ? <FaTrophy style={{ color: podium }} aria-hidden="true" /> : place}
                                    </span>
                                    <ClubLogo club={entry.club} size="sm" className="flex-shrink-0" />
                                    <span className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                                        <span className="d-flex align-items-baseline justify-content-between gap-2">
                                            <span className="text-default fw-semibold text-truncate">{entry.club?.name ?? t('Deleted club')}</span>
                                            <span className="text-subtle fs-8 text-nowrap">{entry.label}</span>
                                        </span>
                                        <span className={`badge-ranking-bar ${barClass}`} aria-hidden="true"><span style={{ width: `${entry.value / top * 100}%` }} /></span>
                                        {entry.line && <span className="text-faint fs-8">{entry.line}</span>}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>}
            {!term && !showAll && entries.length > SHOWN &&
                <Button type="button" label={t('Show all {{length}} clubs', { length: entries.length })} icon="pi pi-chevron-down" size="small" text className="mt-3" onClick={() => setShowAll(true)} />}
        </>
    );
};

/**
 * Bars over time, e.g. the last twelve weeks: all of them faint, the
 * finished ones (when given) strong. weeks: [{ start, count, finished }]
 */
export const TimeBars = ({ bars, label, finishedLabel, countLabel }) => {
    const most = Math.max(1, ...bars.map(bar => bar.count));
    const withFinished = finishedLabel && bars.some(bar => bar.finished !== undefined);
    return (
        <>
            <div className="quick-games-days" style={{ gridTemplateColumns: `repeat(${bars.length}, 1fr)` }} aria-label={label}>
                {bars.map(bar => (
                    <span key={bar.start} className="quick-games-day" title={`${formatDate(bar.start)}: ${countLabel(bar)}`}>
                        <span className={withFinished ? 'is-started' : 'is-finished'} style={{ height: `${(bar.count / most) * 100}%` }} />
                        {withFinished && <span className="is-finished" style={{ height: `${((bar.finished ?? 0) / most) * 100}%` }} />}
                    </span>
                ))}
            </div>
            <div className="d-flex justify-content-between gap-2 text-faint fs-8 mt-1">
                <span>{formatDate(bars[0]?.start, { year: 'none' })}</span>
                {withFinished &&
                    <span>{t('started')}{' '}<span className="quick-games-key is-started" />{' '}{finishedLabel}{' '}<span className="quick-games-key is-finished" /></span>}
                <span>{t('now')}</span>
            </div>
        </>
    );
};

/**
 * Kinds of games or trainings by how often they are played: the icon, the
 * name, the count with the last 30 days and a bar.
 * entries: [{ kind, count, last30Days }]; titleOf(kind), iconOf(kind)
 */
export const KindList = ({ entries, titleOf, iconOf = (kind) => kind }) => {
    const most = entries[0]?.count || 1;
    return (
        <ul className="training-popular list-unstyled m-0">
            {entries.map(entry => (
                <li key={entry.kind}>
                    <GameTypeIcon type={iconOf(entry.kind)} />
                    <span className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                        <span className="d-flex align-items-baseline justify-content-between gap-2">
                            <span className="text-default fs-7 fw-semibold text-truncate">{titleOf(entry.kind)}</span>
                            <span className="text-subtle fs-8 text-nowrap"><strong className="text-default">{formatNumber(entry.count)}</strong>{entry.last30Days ? ` · ${t('{{count}} lately', { count: entry.last30Days })}` : ''}</span>
                        </span>
                        <span className="badge-ranking-bar is-green" aria-hidden="true"><span style={{ width: `${entry.count / most * 100}%` }} /></span>
                    </span>
                </li>
            ))}
        </ul>
    );
};

/**
 * How something spreads: a label, a count and a bar each, e.g. the roles or
 * the languages. entries: [{ key, label, count, icon (a PrimeIcons class) }]
 */
export const SpreadList = ({ entries }) => {
    const most = Math.max(1, ...entries.map(entry => entry.count));
    return (
        <ul className="training-popular list-unstyled m-0">
            {entries.map(entry => (
                <li key={entry.key}>
                    {entry.icon && <span className="players-level-mark" style={{ '--level-color': ACCENT.green }} aria-hidden="true"><i className={entry.icon} /></span>}
                    <span className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                        <span className="d-flex align-items-baseline justify-content-between gap-2">
                            <span className="text-default fs-7 fw-semibold text-truncate">{entry.label}</span>
                            <strong className="text-default fs-8">{formatNumber(entry.count)}</strong>
                        </span>
                        <span className="badge-ranking-bar is-green" aria-hidden="true"><span style={{ width: `${entry.count / most * 100}%` }} /></span>
                    </span>
                </li>
            ))}
        </ul>
    );
};

const CHIPS = 12;

/**
 * A few records to look after as chips (a title and a hint above), each
 * picked with a click (onPick), e.g. into the search of the list.
 * items: [{ id, label, avatar }]
 */
export const ChipGroup = ({ title, hint, items, onPick }) => items.length > 0 && (
    <div className="d-flex flex-column gap-2">
        <span className="d-flex flex-column">
            <span className="text-default fs-7 fw-semibold">{title}</span>
            {hint && <span className="text-faint fs-8">{hint}</span>}
        </span>
        <div className="players-chips">
            {items.slice(0, CHIPS).map(item => (
                <button key={item.id} type="button" onClick={() => onPick(item)}>
                    {item.avatar}
                    {item.label}
                </button>
            ))}
            {items.length > CHIPS && <span className="text-faint fs-8 align-self-center">{t('and {{count}} more', { count: items.length - CHIPS })}</span>}
        </div>
    </div>
);
