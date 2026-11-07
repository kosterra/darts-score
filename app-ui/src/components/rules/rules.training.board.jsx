import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Avatar } from 'primereact/avatar';
import { FaMedal } from 'react-icons/fa6';

import RulesService from '../../services/rules.service';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { Lines } from '../elements/skeletons';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { replayTraining } from '../../rules/engine';
import { boardKeyOf, boardOf, placesOf } from '../../rules/trainings';
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

// the rows shown first, and how many more each "Show more" adds
const PAGE = 10;

const VIEWS = [
    { label: t('Top 10'), value: 'top' },
    // each player once, with their best
    { label: t('Personal bests'), value: 'best' },
    // the latest attempts of everyone, newest first
    { label: t('Newest'), value: 'recent' },
];

// a value of a setting on a filter pill: the number alone where the label is "20 attempts", else the label ("T20")
const pillLabel = (entry) => (String(entry.label).startsWith(String(entry.value)) ? String(entry.value) : entry.label);

/**
 * The scoreboard of a training in the club: the best attempts whoever played
 * them (the first view), every player's best, or the latest attempts; ten at
 * first, ten more at a time. Only attempts with the same settings are compared
 * (see boardOf): pills choose them, at first those of the setup ("settings").
 * "highlight" marks the attempt just saved: it shows a few rows below its place
 * and moves up to it, in view (on a phone the board is scrolled to first). An
 * attempt opens to what every double took, for the trainings around the board
 * (from its darts).
 */
const RulesTrainingBoard = ({ definition, version = 0, highlight = null, settings = {} }) => {
    const [entries, setEntries] = useState(null);
    // the settings whose attempts are shown, those of the setup until the pills choose others
    const setupKey = boardKeyOf(definition, settings);
    const [board, setBoard] = useState(() => boardOf(definition, settings));
    useEffect(() => setBoard(boardOf(definition, settings)),
        // a change of the setup (or another training) shows its board
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [definition.id, setupKey]);
    const boardKey = boardKeyOf(definition, board);
    const boardOptions = (definition.boards ?? []).map(key => definition.options.find(option => option.key === key));
    const [view, setView] = useState('top');
    const [shown, setShown] = useState(PAGE);
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
    // the better score first; the same score by the training's own tiebreak (Bob's 27: further on the board)
    const better = (a, b) => (higher ? b.score - a.score : a.score - b.score) || (definition.tiebreak?.(a, b) ?? 0);
    const lists = useMemo(() => {
        const best = new Map();
        const shown = (entries ?? []).filter(entry => boardKeyOf(definition, entry.settings) === boardKey);
        shown.forEach(entry => {
            const known = best.get(entry.player?.id);
            if (!known || better(entry, known) < 0) best.set(entry.player?.id, entry);
        });
        // the same score: the earlier attempt first
        return {
            top: [...shown].sort((a, b) => better(a, b) || new Date(a.createdAt) - new Date(b.createdAt)),
            best: [...best.values()].sort(better),
            recent: shown,
        };
    // better follows from the definition
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries, higher, definition, boardKey]);
    const all = lists[view];
    const rows = all.slice(0, shown);
    const ranked = view !== 'recent';
    // the same score shares a place (as on the Around the Clock board)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const places = useMemo(() => (ranked ? placesOf(all, better) : []), [all, ranked]);

    // the attempt just saved, once it is loaded: in a list that has it (Best only when it
    // is the player's best), first a few rows below its place, then up to it
    useLayoutEffect(() => {
        const saved = highlight && entries?.find(entry => entry.id === highlight);
        if (!saved || arrived.current === highlight) return;
        // on the board of its settings first
        if (boardKeyOf(definition, saved.settings) !== boardKey) {
            setBoard(boardOf(definition, saved.settings));
            return;
        }
        arrived.current = highlight;
        // in the list shown when it made it there, else among the latest
        if (view !== 'recent' && !lists[view].slice(0, shown).some(entry => entry.id === highlight)) setView('recent');
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
    // only when an attempt arrives (view and the best follow from the entries), on its board
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries, highlight, boardKey]);

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
                <SelectButton value={view} options={VIEWS} onChange={(e) => { if (e.value) { setView(e.value); setShown(PAGE); setPhase(null); } }} className="p-selectbutton-pills rules-board-views" aria-label={t('Scoreboard')} />
            </div>
            {/* the settings that change what a score means: a board each, as the modes of Around the Clock */}
            {boardOptions.length > 0 &&
                <div className="atc-filters rules-board-filters">
                    {boardOptions.map(option => (
                        <div key={option.key} className="atc-filter-group">
                            <span className="atc-filter-label">{option.label}</span>
                            <SelectButton
                                value={board[option.key]}
                                options={option.values.map(entry => ({ label: pillLabel(entry), value: entry.value, title: entry.label }))}
                                onChange={(e) => { if (e.value !== null && e.value !== undefined) { setBoard({ ...board, [option.key]: e.value }); setShown(PAGE); setPhase(null); setOpen(null); } }}
                                className="p-selectbutton-pills pills-inline"
                                aria-label={option.label}
                            />
                        </div>
                    ))}
                </div>}
            {entries === null
                ? <Lines count={4} />
                : rows.length === 0
                    ? <span className="text-faint fs-8">{entries.length && boardOptions.length ? t('Nobody has played it with these settings yet.') : t('Nobody has played this training yet.')}</span>
                    // as the scoreboard of Around the Clock: the podium as medals, the player with the date, the result
                    : <ol className="atc-rows">
                        {visible.map((entry) => {
                            const player = entry.player ?? {};
                            const rank = places[rows.indexOf(entry)];
                            const podium = ranked && rank <= 3;
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
                                        // the place in Top 10 and Best; the latest attempts carry the training's sign
                                        : ranked
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
                                        <span className="atc-row-detail">{formatDate(entry.createdAt, { year: 'short' })}</span>
                                    </span>
                                    <span className="atc-row-time rules-board-score">
                                        {definition.format(entry.score)}
                                        {/* how far a failed attempt got (Bob's 27: "out at D6"), what ranks it among the same points */}
                                        {definition.entryNote?.(entry) && <span className="rules-board-note">{definition.entryNote(entry)}</span>}
                                    </span>
                                    {opens && <i className={`pi pi-chevron-${open === entry.id ? 'up' : 'down'} rules-board-chevron`} aria-hidden="true" />}
                                </li>
                                {doubles && <li className="rules-board-doubles"><RulesDoubles cells={doubles} label={definition.doublesLabel} /></li>}
                                </Fragment>
                            );
                        })}
                    </ol>}
            {all.length > rows.length &&
                <div className="d-flex justify-content-center mt-2">
                    <Button label={t('Show {{count}} more', { count: Math.min(PAGE, all.length - rows.length) })} icon="pi pi-angle-down" text size="small" onClick={() => setShown(count => count + PAGE)} />
                </div>}
        </Panel>
        </div>
    );
};

export default RulesTrainingBoard;
