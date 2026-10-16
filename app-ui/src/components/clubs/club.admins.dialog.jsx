import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';

import ClubService from '../../services/club.service';
import { useAuth } from '../../utils/auth.context';

const EMPTY_ADMIN = { email: '', firstname: '', lastname: '', password: '' };

/**
 * Lists the admins of a club and lets an admin add or remove others.
 */
const ClubAdminsDialog = ({ club, onHide, onChange }) => {
    const { user, mailEnabled } = useAuth();

    const [newAdmin, setNewAdmin] = useState(EMPTY_ADMIN);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const onFieldChange = (field) => (event) => setNewAdmin({ ...newAdmin, [field]: event.target.value });

    const onAdd = async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await ClubService.addAdmin(club.id, newAdmin);
            setNewAdmin(EMPTY_ADMIN);
            await onChange();
        } catch (err) {
            setError(err.message);
        }
        setSubmitting(false);
    };

    const onRemove = async (admin) => {
        setError('');
        try {
            await ClubService.removeAdmin(club.id, admin.id);
            await onChange();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Dialog header={club ? `Admins of ${club.name}` : ''} visible={!!club} blockScroll onHide={onHide} draggable={false} className="m-4" style={{ width: '36rem', maxWidth: '100%' }}>
            {club &&
                <div className="d-flex flex-column gap-3 pt-2">
                    {club.admins.map(admin => (
                        <div key={admin.id} className="d-flex justify-content-between align-items-center gap-3 border-bottom border-default pb-2">
                            <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                                <span className="text-default fw-semibold text-break">
                                    {admin.firstname} {admin.lastname}{admin.id === user.id && <span className="text-faint fw-normal"> (you)</span>}
                                </span>
                                <span className="text-subtle fs-7 text-break">{admin.email}</span>
                            </div>
                            {club.admins.length > 1 &&
                                <Button
                                    icon="pi pi-times"
                                    severity="danger"
                                    size="small"
                                    aria-label={`Remove ${admin.email} as admin`}
                                    onClick={() => onRemove(admin)}
                                />
                            }
                        </div>
                    ))}

                    <form onSubmit={onAdd} className="d-flex flex-column gap-3 pt-2">
                        <span className="text-default fw-semibold">Add an admin</span>
                        <span className="fs-7 text-subtle">
                            For someone who already has an account the email is enough. Otherwise fill in the name too and a new account is created
                            {mailEnabled
                                ? '; leave the password empty to send them a mail to choose their own.'
                                : ' with the initial password you enter.'}
                        </span>
                        <InputText id="club-admin-email" type="email" value={newAdmin.email} onChange={onFieldChange('email')} placeholder="Email" aria-label="Email" required />
                        <div className="d-flex flex-wrap gap-3">
                            <InputText id="club-admin-firstname" value={newAdmin.firstname} onChange={onFieldChange('firstname')} placeholder="Firstname (new account)" aria-label="Firstname" className="flex-grow-1" />
                            <InputText id="club-admin-lastname" value={newAdmin.lastname} onChange={onFieldChange('lastname')} placeholder="Lastname (new account)" aria-label="Lastname" className="flex-grow-1" />
                        </div>
                        <Password
                            inputId="club-admin-password"
                            autoComplete="new-password"
                            value={newAdmin.password}
                            onChange={onFieldChange('password')}
                            placeholder={mailEnabled ? 'Initial password (optional)' : 'Initial password (new account)'}
                            aria-label="Initial password"
                            feedback={false}
                            className="w-100"
                            inputClassName="w-100"
                        />
                        {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                        <div className="d-flex justify-content-end gap-3">
                            <Button type="button" label="Close" severity="secondary" size="small" onClick={onHide} />
                            <Button type="submit" label="Add admin" icon="pi pi-user-plus" size="small" loading={submitting} />
                        </div>
                    </form>
                </div>
            }
        </Dialog>
    );
};

export default ClubAdminsDialog;
