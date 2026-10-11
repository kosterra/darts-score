import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import PlayerService from '../../services/player.service';

/**
 * Adds a guest for the game being set up. Guests do not become club members.
 */
const GuestForm = ({ onGuestAdd }) => {
    const [showDialog, setShowDialog] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const close = () => {
        setShowDialog(false);
        setName('');
        setError('');
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        // the dialog renders outside the game setup form, but submit events still bubble up through React
        event.stopPropagation();
        setError('');
        setSubmitting(true);
        try {
            onGuestAdd(await PlayerService.createGuest(name));
            close();
        } catch (err) {
            setError(err.message);
        }
        setSubmitting(false);
    };

    return (
        <div>
            <Dialog header="Add Guest" visible={showDialog} blockScroll onHide={close} draggable={false} className="m-4" style={{ width: '28rem', maxWidth: '100%' }}>
                <form onSubmit={onSubmit} className="d-flex flex-column gap-3 pt-2">
                    <span className="fs-7 text-subtle">
                        A guest plays in this game only. They are not added to the club and are not offered for later games.
                    </span>
                    <InputText id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name of the guest" aria-label="Name of the guest" minLength={2} maxLength={25} required autoFocus />
                    {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                    <div className="d-flex justify-content-end gap-3">
                        <Button type="button" label="Cancel" severity="secondary" size="small" onClick={close} />
                        <Button type="submit" label="Add guest" icon="pi pi-user-plus" size="small" loading={submitting} />
                    </div>
                </form>
            </Dialog>
            <Button type="button" label="Guest" icon="pi pi-plus" severity="secondary" aria-label="Add a guest for this game" onClick={() => setShowDialog(true)} />
        </div>
    );
};

export default GuestForm;
