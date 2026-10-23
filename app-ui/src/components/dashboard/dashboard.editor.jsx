import { memo, useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';

import { DASHBOARD_WIDGETS, WIDGET_SIZES, resolveLayout } from './dashboard.widgets';
import { t } from '../../utils/i18n';

// a widget lies across (nearly) the whole row: it is moved before or after it by height, not by side
const FULL_ROW = 0.9;
// near the top or bottom of the window the page scrolls along while dragging, the closer the faster
const SCROLL_EDGE = 90;
const SCROLL_SPEED = 18;

// a widget's content is drawn once: dragging moves it, but it is not drawn again
// (the charts and lists would make the dragging slow), only when its width changes
const TileContent = memo(
    function TileContent({ widget, renderWidget }) {
        return <div className="dashboard-tile-content" inert>{renderWidget(widget)}</div>;
    },
    (before, after) => before.widget.id === after.widget.id && before.widget.size === after.widget.size,
);

/**
 * The dashboard while it is arranged: each widget with a bar to drag it by
 * (mouse, pen or finger; or the arrow keys on the handle), its width (S, M,
 * L, Full) and a button to remove it; below, the widgets not shown yet, to
 * add. layout: [{ id, size }], onChange(layout). renderWidget(widget) draws a
 * widget as on the dashboard; it does not react while being arranged.
 */
const DashboardEditor = ({ layout, onChange, renderWidget, shameBadges = true }) => {
    const gridRef = useRef(null);
    const tileRefs = useRef(new Map());
    const [draggedId, setDraggedId] = useState(null);
    // where the pointer is while dragging, for scrolling along without it moving
    const pointer = useRef(null);

    const widgets = resolveLayout(layout, { shameBadges });
    const ids = widgets.map(widget => widget.id);
    const shown = new Set(ids);
    const available = DASHBOARD_WIDGETS.filter(widget => !shown.has(widget.id) && (shameBadges || widget.kind !== 'hallOfShame'));

    const asLayout = (list) => list.map(widget => ({ id: widget.id, size: widget.size }));
    const moveTo = (id, index) => {
        const moved = widgets.find(widget => widget.id === id);
        const rest = widgets.filter(widget => widget.id !== id);
        const at = Math.max(0, Math.min(index, rest.length));
        onChange(asLayout([...rest.slice(0, at), moved, ...rest.slice(at)]));
    };
    const resize = (id, size) => onChange(asLayout(widgets.map(widget => widget.id === id ? { ...widget, size } : widget)));
    const remove = (id) => onChange(asLayout(widgets.filter(widget => widget.id !== id)));
    const add = (widget) => onChange([...asLayout(widgets), { id: widget.id, size: widget.size }]);

    // the drag follows the pointer on the whole window: moving the widget in the page
    // would drop a capture on its handle
    const onPointerDown = (event, id) => {
        event.preventDefault();
        pointer.current = { x: event.clientX, y: event.clientY };
        setDraggedId(id);
    };

    // the widget under the pointer: the dragged one goes before it or after it
    const place = (id, x, y) => {
        const rowWidth = gridRef.current?.getBoundingClientRect().width ?? 0;
        const others = ids.filter(other => other !== id);
        for (const [index, other] of others.entries()) {
            const rect = tileRefs.current.get(other)?.getBoundingClientRect();
            if (!rect || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
            const before = rect.width >= rowWidth * FULL_ROW ? y < rect.top + rect.height / 2 : x < rect.left + rect.width / 2;
            const target = before ? index : index + 1;
            if (ids.indexOf(id) !== target) moveTo(id, target);
            return;
        }
    };
    const placeRef = useRef(place);
    placeRef.current = place;

    // while dragging: follow the pointer, and near the top or bottom of the window scroll along
    useEffect(() => {
        if (!draggedId) return undefined;
        const move = (event) => {
            pointer.current = { x: event.clientX, y: event.clientY };
            placeRef.current(draggedId, event.clientX, event.clientY);
        };
        const end = () => {
            pointer.current = null;
            setDraggedId(null);
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
                if (speed) {
                    window.scrollBy(0, speed);
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

    const onKeyDown = (event, id) => {
        const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
        if (!step) return;
        event.preventDefault();
        moveTo(id, ids.indexOf(id) + step);
    };

    return (
        <>
            {widgets.length === 0 && <p className="text-subtle fs-7">{t('No widgets on the dashboard. Add some below.')}</p>}
            <div className="row g-4" ref={gridRef}>
                {widgets.map(widget => (
                    <div
                        key={widget.id}
                        className={widget.cols}
                        ref={element => element ? tileRefs.current.set(widget.id, element) : tileRefs.current.delete(widget.id)}
                    >
                        <div className={`dashboard-tile ${draggedId === widget.id ? 'is-dragged' : ''}`}>
                            <div className="dashboard-tile-bar">
                                <button
                                    type="button"
                                    className="dashboard-tile-handle"
                                    aria-label={t('Move {{title}}: drag, or use the arrow keys', { title: widget.title })}
                                    title={t('Drag to move')}
                                    onPointerDown={(event) => onPointerDown(event, widget.id)}
                                    onKeyDown={(event) => onKeyDown(event, widget.id)}
                                >
                                    <i className="pi pi-arrows-alt" aria-hidden="true" />
                                    <span className="text-truncate">{widget.title}</span>
                                </button>
                                <SelectButton
                                    value={widget.size}
                                    options={WIDGET_SIZES}
                                    optionLabel="label"
                                    optionValue="value"
                                    itemTemplate={(option) => <span title={option.title}>{option.label}</span>}
                                    onChange={(event) => event.value && resize(widget.id, event.value)}
                                    className="p-selectbutton-pills dashboard-tile-sizes"
                                    aria-label={t('Width of {{title}}', { title: widget.title })}
                                />
                                <Button type="button" icon="pi pi-times" text rounded size="small" className="dashboard-tile-remove" aria-label={t('Remove {{title}}', { title: widget.title })} title={t('Remove')} onClick={() => remove(widget.id)} />
                            </div>
                            {/* shown as it is, but it does not react while the dashboard is arranged */}
                            <TileContent widget={widget} renderWidget={renderWidget} />
                        </div>
                    </div>
                ))}
            </div>

            {available.length > 0 && (
                <section className="mt-5">
                    <p className="game-setup-section-title">{t('Add widgets')}</p>
                    <ul className="dashboard-available list-unstyled m-0">
                        {available.map(widget => (
                            <li key={widget.id} className="dashboard-available-item">
                                <div className="d-flex flex-column flex-grow-1 min-w-0">
                                    <span className="text-default fs-7 fw-semibold">{widget.title}</span>
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
