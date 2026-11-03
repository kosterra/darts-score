import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Avatar } from 'primereact/avatar';
import { FaMedal } from 'react-icons/fa6';

import RulesService from '../../services/rules.service';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { Lines } from '../elements/skeletons';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { replayTraining } from '../../rules/engine';
import { rulesIcon } from './rules.icons';
import RulesDoubles from './rules.doubles';

const MEDALS = ['gold', 'silver', 'bronze'];

// the attempt just saved shows this many rows below its place first, then moves up to it
const SLIDE_ROWS = 3;
// how long it shows there before it moves
const ENTER_MS = 700;
// the time a smooth scroll to the board takes, before the attempt starts to move
const SCROLL_MS = 500;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const VIEWS = [
    { label: t('Best'), value: 'best' },
    { label: t('Recent'), value: 'recent' },
];

/**
 * The scoreboard of a training in the club: every player's best, or the
 * latest attempts. "highlight" marks the attempt just saved: it shows a few
 * rows below its place and moves up to it, in view (on a phone the board is
 * scrolled to first). An attempt opens to what every double took, for the
 * trainings around the board (from its darts).
 */
const RulesTrainingBoard = ({ definition, version = 0, highlight = null }) => {
    const [entries, setEntries] = useState(null);
    const [view, setView] = useState('best');
    // the attempt just saved: 'enter' below its place, then 'slide' up to it
    const [phase, setPhase] = useState(null);
    // the attempt showing its doubles
    const [open, setOpen] = useState(null);
    const boardRef = useRef(null);
    const rowRefs = useRef(new Map());
    const positions = useRef(new Map());
    const animateNext = useRef(false);
    const arrived = useRef(null);
    const timer = useRef(null);
    useEffect(() => () => clearTimeout(timer.current), []);

    useEffect(() => {
        let current = true;
        RulesService.loadTrainings(definition.id)
            .then(loaded => { if (current) setEntries(loaded); })
            .catch(() => { if (current) setEntries([]); });
        return () => { current = false; };
    }, [definition.id, version]);

    const higher = definition.higherIsBetter !== false;
    const better = (a, b) => (higher ? b.score - a.score : a.score - b.score);
    const bestRows = useMemo(() => {
        const best = new Map();
        (entries ?? []).forEach(entry => {
            const known = best.get(entry.player?.id);
            if (!known || better(entry, known) < 0) best.set(entry.player?.id, entry);
        });
        return [...best.values()].sort(better).slice(0, 15);
    // better follows from the definition
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries, higher]);
    const rows = view === 'best' ? bestRows : (entries ?? []).slice(0, 15);

    // the attempt just saved, once it is loaded: in a list that has it (Best only when it
    // is the player's best), first a few rows below its place, then up to it
    useLayoutEffect(() => {
        if (!highlight || arrived.current === highlight || !entries?.some(entry => entry.id === highlight)) return;
        arrived.current = highlight;
        if (view === 'best' && !bestRows.some(entry => entry.id === highlight)) setView('recent');
        // on a narrow screen the scoreboard is further down: bring it into view first
        const board = boardRef.current?.getBoundingClientRect();
        const away = board && (board.top < 0 || board.top > window.innerHeight * 0.5);
        if (away) boardRef.current.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        if (reducedMotion()) return;
        setPhase('enter');
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            animateNext.current = true;
            setPhase('slide');
        }, ENTER_MS + (away ? SCROLL_MS : 0));
    // only when an attempt arrives (view and the best follow from the entries)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries, highlight]);

    const visible = useMemo(() => {
        if (phase !== 'enter') return rows;
        const index = rows.findIndex(entry => entry.id === highlight);
        if (index < 0) return rows;
        const others = rows.filter(entry => entry.id !== highlight);
        return [...others.slice(0, index + SLIDE_ROWS), rows[index], ...others.slice(index + SLIDE_ROWS)];
    }, [rows, phase, highlight]);

    // every row slides from where it was to where it is now (FLIP), as on the Around the Clock board
    useLayoutEffect(() => {
        const now = new Map([...rowRefs.current].filter(([, element]) => element).map(([id, element]) => [id, element.offsetTop]));
        if (animateNext.current) {
            animateNext.current = false;
            const distance = Math.abs((positions.current.get(highlight) ?? 0) - (now.get(highlight) ?? 0));
            const duration = Math.min(1600, 500 + distance * 1.5);
            let moving = null;
            now.forEach((top, id) => {
                const before = positions.current.get(id);
                if (before === undefined || before === top) return;
                const animation = rowRefs.current.get(id).animate?.(
                    [{ transform: `translateY(${before - top}px)` }, { transform: 'none' }],
                    { duration, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' }
                );
                if (id === highlight) moving = animation;
            });
            const land = () => {
                setPhase(null);
                rowRefs.current.get(highlight)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
            };
            if (moving) moving.onfinish = land;
            else land();
        }
        positions.current = now;
    });

    const canOpen = Boolean(definition.doubles);
    const doublesOf = (entry) => (entry.darts?.length ? definition.doubles(replayTraining(definition, entry).state) : null);
    const toggle = (entry) => canOpen && entry.darts?.length && setOpen(open === entry.id ? null : entry.id);
    const Icon = rulesIcon(definition.id);

    return (
        // as tall as the setup beside it once there is a list; empty it stays its own small height
        <div ref={boardRef} className={`atc-panel-anchor ${rows.length ? 'h-100' : ''}`}>
        <Panel header={t('Scoreboard')} className={rows.length ? 'h-100' : ''}>
            <div className="d-flex justify-content-center mb-3">
                <SelectButton value={view} options={VIEWS} onChange={(e) => { if (e.value) { setView(e.value); setPhase(null); } }} className="p-selectbutton-pills" aria-label={t('Scoreboard')} />
            </div>
            {entries === null
                ? <Lines count={4} />
                : rows.length === 0
                    ? <span className="text-faint fs-8">{t('Nobody has played this training yet.')}</span>
                    // as the scoreboard of Around the Clock: the podium as medals, the player with the date, the result
                    : <ol className="atc-rows">
                        {visible.map((entry) => {
                            const player = entry.player ?? {};
                            const rank = rows.indexOf(entry) + 1;
                            const podium = view === 'best' && rank <= 3;
                            const arriving = entry.id === highlight && phase;
                            const opens = canOpen && entry.darts?.length > 0;
                            const doubles = open === entry.id ? doublesOf(entry) : null;
                            return (
                                <Fragment key={entry.id}>
                                <li
                                    ref={(element) => { if (element) rowRefs.current.set(entry.id, element); else rowRefs.current.delete(entry.id); }}
                                    className={`atc-row ${entry.id === highlight ? 'is-latest' : ''} ${arriving ? 'is-arriving' : ''} ${arriving === 'enter' ? 'is-entering' : ''} ${opens ? 'is-openable' : ''}`}
                                    // the doubles of the attempt open under it
                                    {...(opens ? { role: 'button', tabIndex: 0, 'aria-expanded': open === entry.id, onClick: () => toggle(entry), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(entry); } } } : {})}
                                >
                                    {podium
                                        ? <span className={`badge-medal badge-medal-sm badge-${MEDALS[rank - 1]} atc-medal`} role="img" aria-label={t('Place {{place}}', { place: rank })}><FaMedal aria-hidden="true" /></span>
                                        // the place in Best; the latest attempts carry the training's sign
                                        : view === 'best'
                                            ? <span className="atc-rank">{rank}</span>
                                            : <span className="atc-rank rules-board-icon" aria-hidden="true"><Icon /></span>}
                                    <Avatar
                                        image={resolvePlayerImg(player.profileImg)}
                                        label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname ?? player.nickname ?? '?', player.lastname ?? '')}
                                        shape="circle"
                                        className="avatar-sm flex-shrink-0"
                                    />
                                    <span className="atc-row-player">
                                        <span className="atc-row-name">
                                            {player.nickname ?? t('Unknown player')}
                                            {entry.id === highlight && <span className="atc-row-new">{t('New')}</span>}
                                        </span>
                                        <span className="atc-row-detail">{formatDate(entry.createdAt)}</span>
                                    </span>
                                    <span className="atc-row-time">{definition.format(entry.score)}</span>
                                    {opens && <i className={`pi pi-chevron-${open === entry.id ? 'up' : 'down'} rules-board-chevron`} aria-hidden="true" />}
                                </li>
                                {doubles && <li className="rules-board-doubles"><RulesDoubles cells={doubles} label={definition.doublesLabel} /></li>}
                                </Fragment>
                            );
                        })}
                    </ol>}
        </Panel>
        </div>
    );
};

export default RulesTrainingBoard;
