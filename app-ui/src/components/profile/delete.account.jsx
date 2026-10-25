import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Password } from 'primereact/password';
import { SelectButton } from 'primereact/selectbutton';

import AuthService from '../../services/auth.service';
import { useAuth } from '../../utils/auth.context';
import { t, tn } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';

// a step for a club is ready: handed over to someone, or its name typed to delete it
const stepReady = (club, step) => (step?.action === 'handover'
    ? Boolean(step.to)
    : step?.action === 'delete' && (step.name ?? '').trim().toLowerCase() === club.name.trim().toLowerCase());

/**
 * A club the account is the only admin of: handed over to a member with a
 * login, or deleted with everything in it, its name typed to be sure.
 */
const ClubStep = ({ club, step, onChange }) => {
    const canHandOver = club.candidates.length > 0;
    return (
        <div className="delete-account-club d-flex flex-column gap-2">
            <span className="text-default fw-semibold">{club.name}</span>
            <SelectButton
                value={step?.action ?? null}
                options={[{ label: t('Hand it over'), value: 'handover', disabled: !canHandOver }, { label: t('Delete the club'), value: 'delete' }]}
                optionDisabled="disabled"
                onChange={(event) => {
                    if (event.value === 'handover') onChange({ club: club.id, action: 'handover', to: club.candidates.length === 1 ? club.candidates[0].id : null });
                    else if (event.value === 'delete') onChange({ club: club.id, action: 'delete', name: '' });
                }}
                aria-label={t('What happens to {{club}}', { club: club.name })}
                className="p-selectbutton-pills flex-wrap"
            />
            {!canHandOver &&
                <span className="text-faint fs-8">{t('Nobody else in this club has a login to take it over.')}</span>}
            {step?.action === 'handover' &&
                <>
                    <Dropdown value={step.to} options={club.candidates} optionLabel="name" optionValue="id" placeholder={t('Who takes it over?')} aria-label={t('Who takes it over?')} onChange={(event) => onChange({ ...step, to: event.value })} className="w-100" filter={club.candidates.length > 8} />
                    <span className="text-faint fs-8">{t('They become the admin of the club, with its players, games and settings, and are told by notification and mail.')}</span>
                </>}
            {step?.action === 'delete' &&
                <>
                    <span className="fs-8 text-danger">
                        {club.members > 0
                            ? tn(club.members, 'The club is deleted for good with all its games, trainings and tournaments; {{count}} member loses them.', 'The club is deleted for good with all its games, trainings and tournaments; its {{count}} members lose them.')
                            : t('The club is deleted for good with all its games, trainings and tournaments.')}
                    </span>
                    <InputText value={step.name} onChange={(event) => onChange({ ...step, name: event.target.value })} placeholder={t('Type {{club}} to delete it', { club: club.name })} aria-label={t('Type {{club}} to delete it', { club: club.name })} className="w-100" />
                </>}
        </div>
    );
};

/**
 * Deleting the own account, at the end of the profile's Account part: the
 * login, settings and notifications go; the players stay in their clubs
 * under an anonymous name, so the games of the others stay whole. The clubs
 * the account is the only admin of are handed over or deleted on the way.
 * With the password (and a code when two-step login is on) and a confirmation.
 */
const DeleteAccount = () => {
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [understood, setUnderstood] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    // what stands before it: the only global admin, the clubs only this account runs
    const [steps, setSteps] = useState(null);
    const [plan, setPlan] = useState({});

    useEffect(() => {
        if (!open || steps) return;
        AuthService.deletionSteps().then(setSteps).catch(err => setError(err.message));
    }, [open, steps]);

    const clubs = steps?.clubs ?? [];
    const clubsReady = clubs.every(club => stepReady(club, plan[club.id]));

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await AuthService.deleteAccount(password, user.mfaEnabled ? code : undefined, clubs.map(club => plan[club.id]));
            // the session is gone: back to the start page
            await logout();
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    };

    return (
        <>
            <p className="game-setup-section-title">{t('Delete account')}</p>
            <p className="setting-title" id="delete-account">{t('Delete your account')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-3 pt-1">
                    <span className="fs-7 text-subtle">
                        {t('Your login, your settings and your notifications are deleted. Your players stay in their clubs under an anonymous name (e.g. Anon 7F3A), without your name, picture and date of birth, so the games and statistics of the others stay whole. This cannot be undone.')}
                    </span>
                    {!open &&
                        <div className="d-flex justify-content-end">
                            <Button type="button" label={t('Delete account …')} icon="pi pi-trash" size="small" severity="danger" outlined onClick={() => setOpen(true)} />
                        </div>}
                    {open && !steps && !error && <Lines count={2} />}
                    {open && steps?.globalAdmin && <Message severity="warn" text={steps.globalAdmin} className="w-100 justify-content-start" />}
                    {open && steps && !steps.globalAdmin &&
                        <form onSubmit={submit} className="d-flex flex-column gap-3">
                            {clubs.length > 0 &&
                                <div className="d-flex flex-column gap-3">
                                    <span className="fs-7 text-default">
                                        {tn(clubs.length, 'You are the only admin of this club. Hand it over to another member or delete it:', 'You are the only admin of these clubs. Hand each over to another member or delete it:')}
                                    </span>
                                    {clubs.map(club => <ClubStep key={club.id} club={club} step={plan[club.id]} onChange={(step) => setPlan(current => ({ ...current, [club.id]: step }))} />)}
                                </div>}
                            <Password inputId="delete-account-password" value={password} onChange={(e) => setPassword(e.target.value)} feedback={false} placeholder={t('Current password')} aria-label={t('Current password')} autoComplete="current-password" className="w-100" inputClassName="w-100" required />
                            {user.mfaEnabled &&
                                <InputText value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder={t('Code of the app')} aria-label={t('Code of the app')} className="mfa-code" required />}
                            <label htmlFor="delete-account-understood" className="d-flex align-items-start gap-2">
                                <Checkbox inputId="delete-account-understood" checked={understood} onChange={(e) => setUnderstood(Boolean(e.checked))} />
                                <span className="fs-7">{t('I understand that my account is deleted for good and my players stay only anonymously.')}</span>
                            </label>
                            {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                            <div className="d-flex justify-content-end gap-2">
                                <Button type="button" label={t('Cancel')} size="small" severity="secondary" text onClick={() => { setOpen(false); setPassword(''); setCode(''); setUnderstood(false); setError(''); setSteps(null); setPlan({}); }} />
                                <Button type="submit" label={t('Delete my account')} icon="pi pi-trash" size="small" severity="danger" loading={busy} disabled={!understood || !password || !clubsReady} />
                            </div>
                        </form>}
                </div>
            </div>
        </>
    );
};

export default DeleteAccount;
