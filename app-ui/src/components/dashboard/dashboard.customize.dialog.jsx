import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';

import ClubService from '../../services/club.service';
import { DASHBOARD_WIDGETS, resolveWidgets } from './dashboard.widgets';

/**
 * Lets a club admin choose which widgets the club dashboard shows, and in which order.
 */
const DashboardCustomizeDialog = ({ club, visible, onHide, onSaved }) => {
    const [selected, setSelected] = useState([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setSelected(resolveWidgets(club.dashboardWidgets).map(widget => widget.id));
            setError('');
        }
    }, [visible, club]);

    const toggle = (id, enabled) =>
        setSelected(enabled ? [...selected, id] : selected.filter(widgetId => widgetId !== id));

    // Reordering: grab a shown widget by its handle and drag it (mouse, pen or
    // finger), or focus the handle and use the arrow keys.
    const itemRefs = useRef(new Map());
    const [draggedId, setDraggedId] = useState(null);

    const moveTo = (id, targetIndex) => setSelected(order => {
        const rest = order.filter(widgetId => widgetId !== id);
        const index = Math.max(0, Math.min(targetIndex, rest.length));
        return [...rest.slice(0, index), id, ...rest.slice(index)];
    });

    const onHandlePointerDown = (event, id) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDraggedId(id);
    };

    const onHandlePointerMove = (event, id) => {
        if (draggedId !== id) return;
        // the dragged widget goes before the first other widget whose middle lies below the pointer
        const others = selected.filter(widgetId => widgetId !== id);
        const target = others.findIndex(widgetId => {
            const rect = itemRefs.current.get(widgetId)?.getBoundingClientRect();
            return rect && event.clientY < rect.top + rect.height / 2;
        });
        const targetIndex = target === -1 ? others.length : target;
        if (selected.indexOf(id) !== targetIndex) moveTo(id, targetIndex);
    };

    const onHandlePointerUp = () => setDraggedId(null);

    // one step per key press, also when keys come faster than the list re-renders
    const onHandleKeyDown = (event, id) => {
        const step = { ArrowUp: -1, ArrowDown: 1 }[event.key];
        if (!step) return;
        event.preventDefault();
        setSelected(order => {
            const index = order.indexOf(id);
            const target = index + step;
            if (target < 0 || target >= order.length) return order;
            const next = [...order];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    // An empty list means "the default set", so a reset club follows future defaults
    const save = async (widgetIds) => {
        setError('');
        setSaving(true);
        try {
            await ClubService.updateClub(club.id, { name: club.name, dashboardWidgets: widgetIds });
            await onSaved();
            onHide();
        } catch (err) {
            setError(err.message);
        }
        setSaving(false);
    };

    // widgets that are not shown yet and can be added at the end
    const available = DASHBOARD_WIDGETS.filter(widget => !selected.includes(widget.id));

    return (
        <Dialog header="Customize Dashboard" visible={visible} blockScroll onHide={onHide} draggable={false} className="m-4" style={{ width: '38rem', maxWidth: '100%' }}>
            <div className="d-flex flex-column gap-3 pt-2">
                <span className="fs-7 text-subtle">
                    Choose what the dashboard of {club.name} shows. Drag the widgets by their handle to change the order. This applies to everyone in the club.
                </span>
                <span className="text-default fw-semibold fs-7">Shown on the dashboard</span>
                <ul className="list-unstyled m-0 d-flex flex-column gap-2 widget-order">
                    {selected.map(id => {
                        const widget = DASHBOARD_WIDGETS.find(entry => entry.id === id);
                        return (
                            <li
                                key={id}
                                ref={element => element ? itemRefs.current.set(id, element) : itemRefs.current.delete(id)}
                                className={`widget-order-item bg-surface-raised rounded-2 px-2 py-2 d-flex align-items-center gap-3 ${draggedId === id ? 'is-dragged' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="widget-order-handle"
                                    aria-label={`Move ${widget.title}: drag, or use the arrow keys`}
                                    title="Drag to reorder"
                                    onPointerDown={(event) => onHandlePointerDown(event, id)}
                                    onPointerMove={(event) => onHandlePointerMove(event, id)}
                                    onPointerUp={onHandlePointerUp}
                                    onPointerCancel={onHandlePointerUp}
                                    onKeyDown={(event) => onHandleKeyDown(event, id)}
                                >
                                    <i className="pi pi-bars" aria-hidden="true" />
                                </button>
                                <label htmlFor={`widget-${id}`} className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                                    <span className="text-default fw-semibold">{widget.title}</span>
                                    <span className="text-faint fs-8">{widget.description}</span>
                                </label>
                                <InputSwitch inputId={`widget-${id}`} checked onChange={() => toggle(id, false)} aria-label={`Hide ${widget.title}`} />
                            </li>
                        );
                    })}
                </ul>
                {available.length > 0 && <>
                    <span className="text-default fw-semibold fs-7 mt-2">More widgets</span>
                    <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                        {available.map(widget => (
                            <li key={widget.id} className="bg-surface-raised rounded-2 px-3 py-2 d-flex align-items-center gap-3">
                                <label htmlFor={`widget-${widget.id}`} className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                                    <span className="text-subtle">{widget.title}</span>
                                    <span className="text-faint fs-8">{widget.description}</span>
                                </label>
                                <InputSwitch inputId={`widget-${widget.id}`} checked={false} onChange={() => toggle(widget.id, true)} aria-label={`Show ${widget.title}`} />
                            </li>
                        ))}
                    </ul>
                </>}
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <div className="d-flex flex-wrap justify-content-between gap-3">
                    <Button type="button" label="Reset to default" size="small" outlined disabled={saving} onClick={() => save([])} />
                    <span className="d-flex gap-3">
                        <Button type="button" label="Cancel" severity="secondary" size="small" onClick={onHide} />
                        <Button type="button" label="Save" icon="pi pi-save" size="small" loading={saving} disabled={selected.length === 0} onClick={() => save(selected)} />
                    </span>
                </div>
            </div>
        </Dialog>
    );
};

export default DashboardCustomizeDialog;
