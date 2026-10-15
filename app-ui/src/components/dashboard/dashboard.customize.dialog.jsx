import { useEffect, useState } from 'react';
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

    const move = (index, offset) => {
        const order = [...selected];
        [order[index], order[index + offset]] = [order[index + offset], order[index]];
        setSelected(order);
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

    // shown widgets first, in their order, then the ones that can be added
    const rows = [
        ...selected.map(id => DASHBOARD_WIDGETS.find(widget => widget.id === id)),
        ...DASHBOARD_WIDGETS.filter(widget => !selected.includes(widget.id)),
    ];

    return (
        <Dialog header="Customize Dashboard" visible={visible} blockScroll onHide={onHide} draggable={false} className="m-4" style={{ width: '38rem', maxWidth: '100%' }}>
            <div className="d-flex flex-column gap-3 pt-2">
                <span className="fs-7 text-subtle">
                    Choose what the dashboard of {club.name} shows and in which order. This applies to everyone in the club.
                </span>
                <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                    {rows.map(widget => {
                        const index = selected.indexOf(widget.id);
                        const enabled = index !== -1;
                        return (
                            <li key={widget.id} className="bg-surface-raised rounded-2 px-3 py-2 d-flex align-items-center gap-3">
                                <InputSwitch
                                    inputId={`widget-${widget.id}`}
                                    checked={enabled}
                                    onChange={(e) => toggle(widget.id, e.value)}
                                />
                                <label htmlFor={`widget-${widget.id}`} className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                                    <span className={enabled ? 'text-default fw-semibold' : 'text-subtle'}>{widget.title}</span>
                                    <span className="text-faint fs-8">{widget.description}</span>
                                </label>
                                {enabled &&
                                    <span className="d-flex gap-1 flex-shrink-0">
                                        <Button type="button" icon="pi pi-arrow-up" severity="secondary" size="small" disabled={index === 0} aria-label={`Move ${widget.title} up`} onClick={() => move(index, -1)} />
                                        <Button type="button" icon="pi pi-arrow-down" severity="secondary" size="small" disabled={index === selected.length - 1} aria-label={`Move ${widget.title} down`} onClick={() => move(index, 1)} />
                                    </span>
                                }
                            </li>
                        );
                    })}
                </ul>
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
