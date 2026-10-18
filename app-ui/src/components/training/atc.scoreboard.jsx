import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import dayjs from 'dayjs';

import Confetti from '../badges/confetti';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { formatTrainingTime } from '../../utils/training.time';
import { PERIODS, scoreboardRows } from '../../utils/atc.scoreboard';

// rows shown before "Show all"
const SHOWN_ROWS = 10;
// how long a new time shows at the bottom before it moves up to its place
const ENTER_MS = 700;

const VIEWS = [
    { label: 'Best per player', value: true },
    { label: 'All attempts', value: false },
];

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ScoreboardRow = ({ row, rowRef, latest, phase, podium, showDate }) => {
    const { entry, rank } = row;
    const player = entry.player ?? {};
    return (
        <li
            ref={rowRef}
            className={`atc-row ${latest ? 'is-latest' : ''} ${phase === 'enter' || phase === 'slide' ? 'is-arriving' : ''} ${phase === 'enter' ? 'is-entering' : ''}`}
        >
            <span className={`atc-rank ${['is-gold', 'is-silver', 'is-bronze'][rank - 1] ?? ''} ${podium ? 'is-pop' : ''}`}>{rank}</span>
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
            <span className="atc-row-time">{formatTrainingTime(entry.timeMs)}</span>
        </li>
    );
};

/**
 * The scoreboard of a mode: each player's best (or every attempt) of today,
 * this month or all time. A time just saved shows up at the bottom and moves
 * up to its place; on the podium it is celebrated.
 *
 * entries: every training of the mode
 * mode: shown in the header
 * arrival: { id } of the time just saved, or null
 * view, onViewChange: { period, bestOnly }
 * onArrived(row): once the new time reached its place (row null when it is not listed)
 */
const ATCScoreboard = ({ entries, mode, arrival, view, onViewChange, onArrived }) => {
    const [expanded, setExpanded] = useState(false);
    // the time just saved: 'enter' at the bottom, then 'slide' up, then 'landed'
    const [phase, setPhase] = useState(null);
    const [celebrate, setCelebrate] = useState(false);

    const rowRefs = useRef(new Map());
    const positions = useRef(new Map());
    const animateNext = useRef(false);
    const arrived = useRef(onArrived);
    arrived.current = onArrived;

    const rows = useMemo(() => scoreboardRows(entries, view), [entries, view]);
    const arrivingRow = arrival ? rows.find(({ entry }) => entry.id === arrival.id) : null;
    const latestId = useMemo(() => entries.reduce((latest, entry) => !latest || new Date(entry.createdAt) > new Date(latest.createdAt) ? entry : latest, null)?.id, [entries]);

    // a new time: first at the bottom, then up to its place; before the browser paints,
    // so the row never flashes at its place first
    useLayoutEffect(() => {
        if (!arrival) return undefined;
        const row = rows.find(({ entry }) => entry.id === arrival.id);
        if (!row) {
            setPhase(null);
            arrived.current(null);
            return undefined;
        }
        if (row.rank > SHOWN_ROWS) setExpanded(false);
        // no movement: straight to its place (which reports the arrival)
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
    // only when a new time arrives (the entries with it are loaded by then)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [arrival]);

    // the rows shown: the first ten (or all), the new time pinned below when further down
    const visible = useMemo(() => {
        let list = expanded ? rows : rows.slice(0, SHOWN_ROWS);
        if (arrivingRow && !list.includes(arrivingRow)) list = [...list, arrivingRow];
        if (phase === 'enter' && arrivingRow) list = [...list.filter(row => row !== arrivingRow), arrivingRow];
        return list;
    }, [rows, expanded, arrivingRow, phase]);
    const pinnedBelow = arrivingRow && !expanded && arrivingRow.rank > SHOWN_ROWS;

    // every row slides from where it was to where it is now (FLIP)
    useLayoutEffect(() => {
        const now = new Map([...rowRefs.current].filter(([, element]) => element).map(([id, element]) => [id, element.offsetTop]));
        if (animateNext.current) {
            animateNext.current = false;
            const distance = Math.abs((positions.current.get(arrival?.id) ?? 0) - (now.get(arrival?.id) ?? 0));
            const duration = Math.min(1800, 500 + distance * 1.5);
            let moving = null;
            now.forEach((top, id) => {
                const before = positions.current.get(id);
                if (before === undefined || before === top) return;
                const animation = rowRefs.current.get(id).animate(
                    [{ transform: `translateY(${before - top}px)` }, { transform: 'none' }],
                    { duration, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' }
                );
                if (id === arrival?.id) moving = animation;
            });
            const land = () => setPhase('landed');
            if (moving) moving.onfinish = land;
            else land();
        }
        positions.current = now;
    });

    useEffect(() => {
        if (phase !== 'landed' || !arrivingRow) return undefined;
        arrived.current(arrivingRow);
        if (arrivingRow.rank > 3 || reducedMotion()) return undefined;
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

    const header = (
        <div className="p-panel-header">
            <span className="p-panel-title">
                <span>Scoreboard</span>
                <span className="text-faint fs-8 fw-normal">{mode}</span>
            </span>
        </div>
    );

    return (
        <Panel headerTemplate={() => header} className="atc-scoreboard">
            <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                <SelectButton value={view.period} options={PERIODS} onChange={(e) => e.value && setView({ period: e.value })} className="p-selectbutton-pills pills-inline" aria-label="Period" />
                <SelectButton value={view.bestOnly} options={VIEWS} onChange={(e) => e.value !== null && e.value !== undefined && setView({ bestOnly: e.value })} className="p-selectbutton-pills pills-inline" aria-label="Times listed" />
            </div>

            {rows.length
                ? (
                    <ol className="atc-rows">
                        {visible.map((row, index) => (
                            <Fragment key={row.entry.id}>
                                {pinnedBelow && row === arrivingRow && index > 0 && <li className="atc-rows-gap" aria-hidden="true">⋯</li>}
                                <ScoreboardRow
                                    row={row}
                                    rowRef={(element) => { if (element) rowRefs.current.set(row.entry.id, element); else rowRefs.current.delete(row.entry.id); }}
                                    latest={row.entry.id === latestId && dayjs(row.entry.createdAt).isSame(dayjs(), 'day')}
                                    phase={row === arrivingRow ? phase : null}
                                    podium={row === arrivingRow && phase === 'landed' && row.rank <= 3}
                                    showDate={view.period !== 'today'}
                                />
                            </Fragment>
                        ))}
                    </ol>
                )
                : <div className="text-faint fs-7 text-center py-4">{view.period === 'today' ? 'No times today yet. Be the first!' : view.period === 'month' ? 'No times this month yet.' : 'No times yet.'}</div>
            }

            {rows.length > SHOWN_ROWS && !expanded &&
                <div className="text-center mt-2">
                    <Button type="button" label={`Show all ${rows.length}`} icon="pi pi-chevron-down" size="small" text onClick={() => setExpanded(true)} />
                </div>
            }
            {celebrate && <Confetti className="atc-scoreboard-confetti" />}
        </Panel>
    );
};

export default ATCScoreboard;
