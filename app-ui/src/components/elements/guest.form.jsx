import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import PlayerService from '../../services/player.service';
import { t } from '../../utils/i18n';

/**
 * Adds a guest for the game being set up. Guests do not become club members.
 * The name is asked for in place: the card (or button) turns into a small
 * form. No <form> of its own, since it lives inside the setup.
 *
 * trigger(open): what opens it, a button when not given
 */
const GuestForm = ({ onGuestAdd, trigger }) => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const close = () => {
        setOpen(false);
        setName('');
        setError('');
    };

    const add = async () => {
        if (name.trim().length < 2) {
            setError(t('A name has 2 to 25 letters.'));
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            onGuestAdd(await PlayerService.createGuest(name.trim()));
            close();
        } catch (err) {
            setError(err.message);
        }
        setSubmitting(false);
    };

    if (!open) {
        return trigger
            ? trigger(() => setOpen(true))
            : <Button type="button" label={t('Guest')} icon="pi pi-plus" severity="secondary" aria-label={t('Add a guest for this game')} onClick={() => setOpen(true)} />;
    }

    return (
        <div className="player-pick-card is-guest is-editing" role="group" aria-label={t('Add guest')}>
            <span className="player-pick-detail">{t('Plays this game only, not added to the club')}</span>
            <InputText
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); add(); }
                    if (e.key === 'Escape') close();
                }}
                placeholder={t('Name of the guest')}
                aria-label={t('Name of the guest')}
                maxLength={25}
                autoFocus
                className="w-100"
            />
            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
            <div className="d-flex gap-2 justify-content-center">
                <Button type="button" icon="pi pi-times" severity="secondary" size="small" text aria-label={t('Cancel')} onClick={close} />
                <Button type="button" label={t('Add')} icon="pi pi-user-plus" size="small" loading={submitting} onClick={add} />
            </div>
        </div>
    );
};

export default GuestForm;
