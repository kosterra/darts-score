import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { FaMedal } from 'react-icons/fa6';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import dayjs from 'dayjs';

import Confetti from '../badges/confetti';
import ATCConfigOptions from './atc.config.options';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { LISTS, PERIODS, formatScore, ordinal, scoreboardRows } from '../../utils/atc.scoreboard';

// rows shown before "Show all"
const SHOWN_ROWS = 10;
// a training arriving below the top ten: the podium, then this many places around it
const PODIUM = 3;
const AROUND = 2;
// how long a new time shows at the bottom before it moves up to its place
const ENTER_MS = 700;

const MEDALS = ['gold', 'silver', 'bronze'];

const SCORINGS = [
    { label: 'Time', value: 'Time' },
    { label: 'Darts', value: 'Darts' },
];
const MODES = ATCConfigOptions.modeOptions.values.map(({ value }) => ({ label: value, value }));

// whether the filters are open, per device
const FILTERS_KEY = 'oche.atcScoreboardFilters';
const readFiltersOpen = () => {
    try {
        return localStorage.getItem(FILTERS_KEY) === 'open';
    } catch {
        return false;
    }
};
const writeFiltersOpen = (open) => {
    try {
        localStorage.setItem(FILTERS_KEY, open ? 'open' : 'closed');
    } catch {
        // storage unavailable: the filters start folded next time
    }
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ScoreboardRow = ({ row, rowRef, latest, phase, podium, showDate }) => {
    const { entry, rank } = row;
    const player = entry.player ?? {};
    return (
        <li
            ref={rowRef}
            className={`atc-row ${latest ? 'is-latest' : ''} ${phase === 'enter' || phase === 'slide' ? 'is-arriving' : ''} ${phase === 'enter' ? 'is-entering' : ''}`}
        >
            {rank <= 3
                // the podium as medals, like the badges
                ? <span className={`badge-medal badge-medal-sm badge-${MEDALS[rank - 1]} atc-medal ${podium ? 'badge-pop' : ''}`} role="img" aria-label={`${ordinal(rank)} place`} title={`${ordinal(rank)} place`}>
                    <FaMedal aria-hidden="true" />
                </span>
                : <span className="atc-rank" aria-label={`${ordinal(rank)} place`}>{rank}</span>
            }
            <Avatar
                image={resolvePlayerImg(player.profileImg)}
                label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname ?? player.nickname ?? '?', player.lastname ?? '')}
                shape="circle"
                className="avatar-sm flex-shrink-0"
            />
            <span className="atc-row-player">
                <span className="atc-row-name">{player.nickname || 'Unknown player'}</span>
                <span className="atc-row-detail">{showDate ? dayjs(entry.createdAt).format('DD.MM.YYYY HH:mm') : dayjs(entry.createdAt).format('HH:mm')}</span>
            </span>
            <span className="atc-row-time">{formatScore(entry)}</span>
        </li>
    );
};

/**
 * The scoreboard of a mode: each player's best (or every attempt) of today,
 * this month or all time. The times just saved show up at the bottom and move
 * up to their places; on the podium they are celebrated.
 *
 * entries: every training of the mode and scoring
 * noun: what the entries are called in the empty list, e.g. "times"
 * arrival: { ids } of the trainings just saved, or null
 * view, onViewChange: { period, list, mode, scoring }; mode and scoring pick the
 *   trainings, which the page loads into entries
 * defaults: { mode, scoring } of the setup; with best per player and all time the
 *   view nobody has to change, the filter button shows a dot otherwise
 * myPlayerId: the player of the logged-in user in this club, for "Mine"
 * onArrived(rows): once the new trainings reached their places (only those listed)
 */
const ATCScoreboard = ({ entries, noun = 'times', arrival, view, onViewChange, defaults, myPlayerId, onArrived }) => {
    // the filters are folded away unless this device left them open
    const [filtersOpen, setFiltersOpen] = useState(() => readFiltersOpen());
    const [expanded, setExpanded] = useState(false);
    // the trainings just saved: 'enter' at the bottom, then 'slide' up, then 'landed'
    const [phase, setPhase] = useState(null);
    const [celebrate, setCelebrate] = useState(false);

    const boardRef = useRef(null);
    const rowRefs = useRef(new Map());
    const positions = useRef(new Map());
    const animateNext = useRef(false);
    const arrived = useRef(onArrived);
    arrived.current = onArrived;

    const rows = useMemo(() => scoreboardRows(entries, { ...view, myPlayerId }), [entries, view, myPlayerId]);
    const lists = myPlayerId ? LISTS : LISTS.filter(option => option.value !== 'mine');
    const arrivingIds = useMemo(() => new Set(arrival?.ids ?? []), [arrival]);
    const arrivingRows = useMemo(() => rows.filter(({ entry }) => arrivingIds.has(entry.id)), [rows, arrivingIds]);
    const latestId = useMemo(() => entries.reduce((latest, entry) => !latest || new Date(entry.createdAt) > new Date(latest.createdAt) ? entry : latest, null)?.id, [entries]);

    // new trainings: first at the bottom, then up to their places; before the browser
    // paints, so a row never flashes at its place first
    useLayoutEffect(() => {
        if (!arrival) return undefined;
        if (!arrivingRows.length) {
            setPhase(null);
            arrived.current([]);
            return undefined;
        }
        setExpanded(false);
        // on a narrow screen the scoreboard is further down: bring it into view first
        const board = boardRef.current?.getBoundingClientRect();
        if (board && (board.top < 0 || board.top > window.innerHeight * 0.5)) {
            boardRef.current.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        }
        // no movement: straight to their places (which reports the arrival)
        if (reducedMotion()) {
            setPhase('landed');
            return undefined;
        }
        setPhase('enter');
        const timer = setTimeout(() => {
            animateNext.current = true;
            setPhase('slide');
        }, ENTER_MS);
        return () => clearTimeout(timer);
    // only when new trainings arrive (the entries with them are loaded by then)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [arrival]);

    // the rows shown: the first ten (or all); a new training further down shows the
    // podium and the places around it instead, so it moves up in view and not at
    // the far end of a long list
    const around = useMemo(() => {
        if (expanded || !arrivingRows.some(row => rows.indexOf(row) >= SHOWN_ROWS)) return null;
        const keep = new Set(rows.slice(0, PODIUM));
        arrivingRows.forEach(row => {
            const index = rows.indexOf(row);
            rows.slice(Math.max(0, index - AROUND), index + AROUND + 1).forEach(near => keep.add(near));
        });
        return rows.filter(row => keep.has(row));
    }, [rows, expanded, arrivingRows]);
    const visible = useMemo(() => {
        const list = around ?? (expanded ? rows : rows.slice(0, SHOWN_ROWS));
        return phase === 'enter' ? [...list.filter(row => !arrivingIds.has(row.entry.id)), ...arrivingRows] : list;
    }, [rows, expanded, around, arrivingRows, arrivingIds, phase]);
    // the gap in the list: before the first row that does not follow the one above
    const gapBefore = (row, index) => index > 0 && rows.indexOf(row) !== rows.indexOf(visible[index - 1]) + 1 && phase !== 'enter';

    // every row slides from where it was to where it is now (FLIP)
    useLayoutEffect(() => {
        const now = new Map([...rowRefs.current].filter(([, element]) => element).map(([id, element]) => [id, element.offsetTop]));
        if (animateNext.current) {
            animateNext.current = false;
            const distanceOf = (id) => Math.abs((positions.current.get(id) ?? 0) - (now.get(id) ?? 0));
            const farthest = [...arrivingIds].sort((a, b) => distanceOf(b) - distanceOf(a))[0];
            const duration = Math.min(1800, 500 + distanceOf(farthest) * 1.5);
            let moving = null;
            now.forEach((top, id) => {
                const before = positions.current.get(id);
                if (before === undefined || before === top) return;
                const animation = rowRefs.current.get(id).animate(
                    [{ transform: `translateY(${before - top}px)` }, { transform: 'none' }],
                    { duration, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' }
                );
                if (id === farthest) moving = animation;
            });
            const land = () => {
                setPhase('landed');
                // make sure the new card is in view once it has landed
                rowRefs.current.get(farthest)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
            };
            if (moving) moving.onfinish = land;
            else land();
        }
        positions.current = now;
    });

    useEffect(() => {
        if (phase !== 'landed' || !arrivingRows.length) return undefined;
        arrived.current(arrivingRows);
        if (!arrivingRows.some(row => row.rank <= 3) || reducedMotion()) return undefined;
        setCelebrate(true);
        const timer = setTimeout(() => setCelebrate(false), 4600);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    const setView = (change) => {
        setExpanded(false);
        setPhase(null);
        onViewChange({ ...view, ...change });
    };

    const toggleFilters = () => {
        setFiltersOpen(!filtersOpen);
        writeFiltersOpen(!filtersOpen);
    };

    const defaultView = { period: 'all', list: 'best', mode: defaults.mode, scoring: defaults.scoring };
    const filtered = Object.keys(defaultView).some(key => view[key] !== defaultView[key]);
    const summary = [
        view.mode,
        view.scoring === 'Darts' ? 'fewest darts' : 'against the clock',
        PERIODS.find(option => option.value === view.period)?.label.toLowerCase(),
        view.list === 'mine' ? 'my attempts' : LISTS.find(option => option.value === view.list)?.label.toLowerCase(),
    ].join(' · ');

    const header = (
        <div className="p-panel-header atc-scoreboard-header">
            <span className="p-panel-title">
                <span>Scoreboard</span>
                <span className="text-faint fs-8 fw-normal">{summary}</span>
            </span>
            <span className="atc-filter-toggle">
                <Button
                    type="button"
                    icon="pi pi-filter"
                    severity="secondary"
                    className={filtersOpen ? 'is-open' : ''}
                    aria-label={filtersOpen ? 'Hide the filters' : 'Show the filters'}
                    aria-expanded={filtersOpen}
                    title="Filter"
                    onClick={toggleFilters}
                />
                {filtered && <span className="atc-filter-dot" aria-label="Filtered" />}
            </span>
        </div>
    );

    return (
        <div ref={boardRef} className="atc-panel-anchor">
        <Panel headerTemplate={() => header} className="atc-scoreboard">
            {filtersOpen &&
                <div className="atc-filters">
                    <div className="atc-filter-group">
                        <span className="atc-filter-label">Scoring</span>
                        <SelectButton value={view.scoring} options={SCORINGS} onChange={(e) => e.value && setView({ scoring: e.value })} className="p-selectbutton-pills pills-inline" aria-label="Scoring" />
                    </div>
                    <div className="atc-filter-group">
                        <span className="atc-filter-label">Mode</span>
                        <SelectButton value={view.mode} options={MODES} onChange={(e) => e.value && setView({ mode: e.value })} className="p-selectbutton-pills pills-inline" aria-label="Mode" />
                    </div>
                    <div className="atc-filter-group">
                        <span className="atc-filter-label">Period</span>
                        <SelectButton value={view.period} options={PERIODS} onChange={(e) => e.value && setView({ period: e.value })} className="p-selectbutton-pills pills-inline" aria-label="Period" />
                    </div>
                    <div className="atc-filter-group">
                        <span className="atc-filter-label">Show</span>
                        <SelectButton value={view.list} options={lists} onChange={(e) => e.value && setView({ list: e.value })} className="p-selectbutton-pills pills-inline" aria-label="Listed" />
                    </div>
                    {filtered &&
                        <div className="atc-filter-reset">
                            <Button type="button" label="Reset" icon="pi pi-filter-slash" size="small" link className="p-0" onClick={() => setView(defaultView)} />
                        </div>
                    }
                </div>
            }

            {rows.length
                ? (
                    <ol className="atc-rows">
                        {visible.map((row, index) => (
                            <Fragment key={row.entry.id}>
                                {gapBefore(row, index) && <li className="atc-rows-gap" aria-hidden="true">⋯</li>}
                                <ScoreboardRow
                                    row={row}
                                    rowRef={(element) => { if (element) rowRefs.current.set(row.entry.id, element); else rowRefs.current.delete(row.entry.id); }}
                                    latest={row.entry.id === latestId && dayjs(row.entry.createdAt).isSame(dayjs(), 'day')}
                                    phase={arrivingIds.has(row.entry.id) ? phase : null}
                                    podium={arrivingIds.has(row.entry.id) && phase === 'landed' && row.rank <= 3}
                                    showDate={view.period !== 'today'}
                                />
                            </Fragment>
                        ))}
                    </ol>
                )
                : <div className="text-faint fs-7 text-center py-4">
                    {view.list === 'mine'
                        ? `You have no ${noun} here${view.period === 'today' ? ' today' : view.period === 'month' ? ' this month' : ''} yet.`
                        : view.period === 'today' ? `No ${noun} today yet. Be the first!` : view.period === 'month' ? `No ${noun} this month yet.` : `No ${noun} yet.`}
                </div>
            }

            {rows.length > (around ? around.length : SHOWN_ROWS) && !expanded &&
                <div className="text-center mt-2">
                    <Button type="button" label={`Show all ${rows.length}`} icon="pi pi-chevron-down" size="small" text onClick={() => setExpanded(true)} />
                </div>
            }
            {celebrate && <Confetti className="atc-scoreboard-confetti" />}
        </Panel>
        </div>
    );
};

export default ATCScoreboard;
