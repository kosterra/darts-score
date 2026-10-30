import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';

import { CLUB_WIDGETS, DEFAULT_LAYOUT, SCOPES, WIDGET_HEIGHTS, WIDGET_SIZES, resolveLayout, scopeOf } from './dashboard.widgets';
import { DashboardCell, DashboardGrid } from './dashboard.grid';
import { t } from '../../utils/i18n';

// a widget lies across (nearly) the whole row: it is moved before or after it by height, not by side
const FULL_ROW = 0.9;
// near the top or bottom of the window the page scrolls along while dragging, the closer the faster
const SCROLL_EDGE = 90;
const SCROLL_SPEED = 18;
// how long the widgets glide to their new place
const GLIDE_MS = 180;
// the copy that follows the pointer is at most this wide, so it never hides the dashboard
const GHOST_MAX_WIDTH = 360;

// a widget's content is drawn once: dragging moves it, but it is not drawn again
// (the charts and lists would make the dragging slow), only when its width changes
// whether a widget shows only the user's own figures or the whole club
const ScopeTag = ({ widget }) => {
    const scope = scopeOf(widget);
    return <span className={`dashboard-scope is-${scope}`} title={SCOPES[scope].hint}>{SCOPES[scope].label}</span>;
};

const TileContent = memo(
    function TileContent({ widget, renderWidget }) {
        return <div className="dashboard-tile-content" inert>{renderWidget(widget)}</div>;
    },
    (before, after) => before.widget.id === after.widget.id && before.widget.size === after.widget.size && before.widget.height === after.widget.height,
);

/**
 * One widget while the dashboard is arranged: the bar to drag it by, its
 * width, its height and remove, over its content. Drawn again only when its width or
 * whether it is dragged changes, not each time the widgets change places.
 * actions: a ref with { start, key, resize, remove }, the same over time.
 */
const EditorTile = memo(
    function EditorTile({ widget, dragged, actions, renderWidget, tileRef }) {
        return (
            <DashboardCell widget={widget} cellRef={tileRef}>
                <div className={`dashboard-tile ${dragged ? 'is-dragged' : ''}`}>
                    <div className="dashboard-tile-bar">
                        <button
                            type="button"
                            className="dashboard-tile-handle"
                            aria-label={t('Move {{title}}: drag, or use the arrow keys', { title: widget.title })}
                            title={t('Drag to move')}
                            onPointerDown={(event) => actions.current.start(event, widget.id)}
                            onKeyDown={(event) => actions.current.key(event, widget.id)}
                        >
                            <i className="pi pi-arrows-alt" aria-hidden="true" />
                            <span className="text-truncate">{widget.title}</span>
                            <ScopeTag widget={widget} />
                        </button>
                        {/* the width and the height, each after its arrow */}
                        <span className="dashboard-tile-choice dashboard-tile-width" title={t('Width')}>
                            <i className="pi pi-arrows-h" aria-hidden="true" />
                            <SelectButton
                                value={widget.size}
                                options={WIDGET_SIZES}
                                optionLabel="label"
                                optionValue="value"
                                itemTemplate={(option) => <span title={option.title}>{option.label}</span>}
                                onChange={(event) => event.value && actions.current.resize(widget.id, event.value)}
                                className="p-selectbutton-pills dashboard-tile-sizes"
                                aria-label={t('Width of {{title}}', { title: widget.title })}
                            />
                        </span>
                        <span className="dashboard-tile-choice" title={t('Height')}>
                            <i className="pi pi-arrows-v" aria-hidden="true" />
                            <SelectButton
                                value={widget.height ?? 'auto'}
                                options={WIDGET_HEIGHTS}
                                optionLabel="label"
                                optionValue="value"
                                itemTemplate={(option) => <span title={option.title}>{option.label}</span>}
                                onChange={(event) => event.value && actions.current.setHeight(widget.id, event.value)}
                                className="p-selectbutton-pills dashboard-tile-sizes"
                                aria-label={t('Height of {{title}}', { title: widget.title })}
                            />
                        </span>
                        <Button type="button" icon="pi pi-times" text size="small" className="dashboard-tile-remove" aria-label={t('Remove {{title}}', { title: widget.title })} title={t('Remove')} onClick={() => actions.current.remove(widget.id)} />
                    </div>
                    {/* shown as it is, but it does not react while the dashboard is arranged */}
                    <TileContent widget={widget} renderWidget={renderWidget} />
                </div>
            </DashboardCell>
        );
    },
    (before, after) => before.widget.id === after.widget.id && before.widget.size === after.widget.size
        && before.widget.height === after.widget.height && before.widget.title === after.widget.title && before.dragged === after.dragged,
);

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The dashboard while it is arranged: each widget with a bar to drag it by
 * (mouse, pen or finger; or the arrow keys on the handle), its width (S, M,
 * L, Full), its height (auto, or capped) and a button to remove it; below, the widgets not shown yet, to
 * add. layout: [{ id, size }], onChange(layout). renderWidget(widget) draws a
 * widget as on the dashboard; it does not react while being arranged. pool:
 * the widgets that can be added; fallback: the layout of an empty one.
 *
 * While dragging, a copy of the widget's bar follows the pointer and the
 * widget itself shows where it will land; the others glide out of the way.
 * The places are worked out at most once a frame, from where the widgets
 * stand (not where they are gliding), so they never jump back and forth.
 */
const DashboardEditor = ({ layout, onChange, renderWidget, shameBadges = true, pool = CLUB_WIDGETS, fallback = DEFAULT_LAYOUT }) => {
    const gridRef = useRef(null);
    const ghostRef = useRef(null);
    const tileRefs = useRef(new Map());
    const refCallbacks = useRef(new Map());
    const [dragged, setDragged] = useState(null);
    // where the pointer is while dragging, and whether it moved since the last frame
    const pointer = useRef(null);
    // where the widgets stood before they changed places, to let them glide from there
    const before = useRef(null);
    // where the widgets stand while dragging: measured at the start and after each change of
    // places, not on every move (that would lay the dashboard out again each frame)
    const stands = useRef(null);

    const widgets = resolveLayout(layout, { shameBadges, fallback });
    const ids = widgets.map(widget => widget.id);
    const shown = new Set(ids);
    const available = pool.filter(widget => !shown.has(widget.id) && (shameBadges || widget.kind !== 'hallOfShame'));

    // the place of each widget in the grid, without the gliding (offsets ignore transforms)
    const positions = () => new Map([...tileRefs.current].map(([id, element]) => [id, { left: element.offsetLeft, top: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight }]));

    // the height is kept only when one was chosen (auto is the usual)
    const asLayout = (list) => list.map(widget => ({ id: widget.id, size: widget.size, ...(widget.height && widget.height !== 'auto' ? { height: widget.height } : {}) }));
    const moveTo = (id, index) => {
        const moved = widgets.find(widget => widget.id === id);
        const rest = widgets.filter(widget => widget.id !== id);
        const at = Math.max(0, Math.min(index, rest.length));
        before.current = stands.current ?? positions();
        onChange(asLayout([...rest.slice(0, at), moved, ...rest.slice(at)]));
    };
    const resize = (id, size) => onChange(asLayout(widgets.map(widget => widget.id === id ? { ...widget, size } : widget)));
    const setHeight = (id, height) => onChange(asLayout(widgets.map(widget => widget.id === id ? { ...widget, height } : widget)));
    const remove = (id) => onChange(asLayout(widgets.filter(widget => widget.id !== id)));
    const add = (widget) => onChange([...asLayout(widgets), { id: widget.id, size: widget.size }]);

    // the widgets glide from where they stood to their new place
    useLayoutEffect(() => {
        const first = before.current;
        before.current = null;
        if (!first) return;
        // all read first, then all written: one layout for every widget, not one each
        const last = positions();
        if (stands.current) stands.current = last;
        if (reducedMotion()) return;
        const moving = [...tileRefs.current].flatMap(([id, element]) => {
            const from = first.get(id);
            const to = last.get(id);
            return from && to && (from.left !== to.left || from.top !== to.top) ? [[element, from.left - to.left, from.top - to.top]] : [];
        });
        if (!moving.length) return;
        for (const [element, dx, dy] of moving) {
            element.style.transition = 'none';
            element.style.transform = `translate(${dx}px, ${dy}px)`;
        }
        // the starting points are laid out once, then everything glides to its place
        gridRef.current?.getBoundingClientRect();
        for (const [element] of moving) {
            element.style.transition = `transform ${GLIDE_MS}ms ease-out`;
            element.style.transform = '';
        }
    });

    // the widget under the pointer: the dragged one goes before it or after it
    const place = (id, x, y) => {
        const grid = gridRef.current?.getBoundingClientRect();
        if (!grid) return;
        const inGrid = { x: x - grid.left, y: y - grid.top };
        stands.current ??= positions();
        const where = stands.current;
        const others = ids.filter(other => other !== id);
        for (const [index, other] of others.entries()) {
            const rect = where.get(other);
            if (!rect || inGrid.x < rect.left || inGrid.x > rect.left + rect.width || inGrid.y < rect.top || inGrid.y > rect.top + rect.height) continue;
            const isBefore = rect.width >= grid.width * FULL_ROW ? inGrid.y < rect.top + rect.height / 2 : inGrid.x < rect.left + rect.width / 2;
            const target = isBefore ? index : index + 1;
            if (ids.indexOf(id) !== target) moveTo(id, target);
            return;
        }
    };

    // the drag follows the pointer on the whole window: moving the widget in the page
    // would drop a capture on its handle
    const start = (event, id) => {
        event.preventDefault();
        const rect = tileRefs.current.get(id)?.getBoundingClientRect();
        const width = Math.min(rect?.width ?? GHOST_MAX_WIDTH, GHOST_MAX_WIDTH);
        // the copy keeps the spot of the handle under the pointer
        pointer.current = { x: event.clientX, y: event.clientY, dx: Math.min(event.clientX - (rect?.left ?? event.clientX), width - 24), dy: event.clientY - (rect?.top ?? event.clientY), moved: false };
        setDragged({ id, width, title: widgets.find(widget => widget.id === id)?.title ?? '' });
    };
    const key = (event, id) => {
        const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
        if (!step) return;
        event.preventDefault();
        moveTo(id, ids.indexOf(id) + step);
    };
    // the same object over time, with what the widgets call now: the tiles are not drawn again for it
    const actions = useRef(null);
    actions.current = { start, key, resize, setHeight, remove };
    const placeRef = useRef(place);
    placeRef.current = place;

    // a ref callback per widget that stays the same, so a tile is not drawn again for it
    const refOf = (id) => {
        if (!refCallbacks.current.has(id)) {
            refCallbacks.current.set(id, (element) => (element ? tileRefs.current.set(id, element) : tileRefs.current.delete(id)));
        }
        return refCallbacks.current.get(id);
    };

    const draggedId = dragged?.id ?? null;
    // while dragging: the copy follows the pointer at once; once a frame the places are worked
    // out, and near the top or bottom of the window the page scrolls along
    useEffect(() => {
        if (!draggedId) return undefined;
        const follow = () => {
            const at = pointer.current;
            if (at && ghostRef.current) ghostRef.current.style.transform = `translate(${at.x - at.dx}px, ${at.y - at.dy}px)`;
        };
        follow();
        const move = (event) => {
            pointer.current = { ...pointer.current, x: event.clientX, y: event.clientY, moved: true };
            follow();
        };
        const end = () => {
            pointer.current = null;
            stands.current = null;
            setDragged(null);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        let frame;
        const step = () => {
            const at = pointer.current;
            if (at) {
                const speed = at.y < SCROLL_EDGE ? -SCROLL_SPEED * (1 - at.y / SCROLL_EDGE)
                    : at.y > window.innerHeight - SCROLL_EDGE ? SCROLL_SPEED * (1 - (window.innerHeight - at.y) / SCROLL_EDGE) : 0;
                if (speed) window.scrollBy(0, speed);
                if (speed || at.moved) {
                    at.moved = false;
                    placeRef.current(draggedId, at.x, at.y);
                }
            }
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
        };
    }, [draggedId]);

    return (
        <>
            {widgets.length === 0 && <p className="text-subtle fs-7">{t('No widgets on the dashboard. Add some below.')}</p>}
            <DashboardGrid gridRef={gridRef}>
                {widgets.map(widget => (
                    <EditorTile
                        key={widget.id}
                        widget={widget}
                        dragged={draggedId === widget.id}
                        actions={actions}
                        renderWidget={renderWidget}
                        tileRef={refOf(widget.id)}
                    />
                ))}
            </DashboardGrid>
            {/* the copy of the dragged widget's bar, under the pointer */}
            {dragged &&
                <div className="dashboard-drag-ghost" ref={ghostRef} style={{ width: dragged.width }} aria-hidden="true">
                    <i className="pi pi-arrows-alt" />
                    <span className="text-truncate">{dragged.title}</span>
                </div>}

            {available.length > 0 && (
                <section className="mt-5">
                    <p className="game-setup-section-title">{t('Add widgets')}</p>
                    <p className="text-faint fs-8 mt-0">
                        {t('Every widget shows the club chosen at the top.')}{' '}
                        <span className="dashboard-scope is-you">{SCOPES.you.label}</span>{' '}{t('only your own games, trainings and requests there;')}{' '}
                        <span className="dashboard-scope is-club">{SCOPES.club.label}</span>{' '}{t('the whole club.')}
                    </p>
                    <ul className="dashboard-available list-unstyled m-0">
                        {available.map(widget => (
                            <li key={widget.id} className="dashboard-available-item">
                                <div className="d-flex flex-column flex-grow-1 min-w-0">
                                    <span className="d-flex align-items-center gap-2 min-w-0">
                                        <span className="text-default fs-7 fw-semibold text-truncate">{widget.title}</span>
                                        <ScopeTag widget={widget} />
                                    </span>
                                    <span className="text-faint fs-8">{widget.description}</span>
                                </div>
                                <Button type="button" label={t('Add')} icon="pi pi-plus" size="small" severity="secondary" onClick={() => add(widget)} aria-label={t('Add {{title}}', { title: widget.title })} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
};

export default DashboardEditor;
