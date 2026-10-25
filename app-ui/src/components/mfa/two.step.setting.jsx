import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Password } from 'primereact/password';

import AuthService from '../../services/auth.service';
import { useAuth } from '../../utils/auth.context';
import { formatDate } from '../../utils/dates';
import { t } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';
import MfaSetup from './mfa.setup';
import RecoveryCodes from './recovery.codes';
import { announceMfaChange } from './mfa.events';

/**
 * Two-step login on the profile (Account → Security): set it up, new
 * recovery codes, forget the trusted devices, or turn it off (not while the
 * installation requires it).
 */
const TwoStepSetting = ({ onSaved, onError }) => {
    const { user, setUser } = useAuth();
    const [state, setState] = useState(null);
    // what is open: 'setup', 'codes' (asking for a code for new recovery codes), 'off'
    const [open, setOpen] = useState(null);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [codes, setCodes] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        AuthService.mfaStatus().then(setState).catch(() => setState({ enabled: false }));
    }, []);

    // the reminder to set it up leads here (/profile#two-step)
    const { hash } = useLocation();
    const title = useRef(null);
    useEffect(() => {
        if (!state || hash !== '#two-step') return undefined;
        title.current?.scrollIntoView({ block: 'start' });
        // once more when what is above it has loaded and moved it
        const later = setTimeout(() => title.current?.scrollIntoView({ block: 'start' }), 600);
        return () => clearTimeout(later);
    }, [state, hash]);

    if (!state) return <Lines count={2} />;

    const close = () => { setOpen(null); setCode(''); setPassword(''); setError(''); };
    const changed = (mfa) => {
        setState(mfa);
        setUser({ ...user, mfaEnabled: mfa.enabled });
        announceMfaChange();
    };
    const run = async (action) => {
        setBusy(true);
        setError('');
        try {
            await action();
        } catch (err) {
            setError(err.message);
        }
        setBusy(false);
    };
    const newCodes = (event) => {
        event.preventDefault();
        run(async () => {
            const answer = await AuthService.mfaRecoveryCodes(code);
            setCodes(answer.recoveryCodes);
            changed(answer.mfa);
            close();
        });
    };
    const turnOff = (event) => {
        event.preventDefault();
        run(async () => {
            const answer = await AuthService.mfaDisable(password, code);
            changed(answer.mfa);
            close();
            onSaved?.(t('Two-step login is off'));
        });
    };
    const forget = () => AuthService.mfaForgetDevices()
        .then(() => onSaved?.(t('Every device asks for the code again')))
        .catch((err) => onError?.(t('Not saved'), err));
    const codeInput = (
        <InputText id="two-step-code" value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder={t('Code of the app')} aria-label={t('Code of the app')} className="mfa-code" required />
    );

    return (
        <>
            <p className="setting-title" id="two-step" ref={title}>{t('Two-step login')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-3 pt-1">
                    {!state.enabled && open !== 'setup' &&
                        <>
                            <span className="fs-7 text-subtle">{t('After the password, Legmate also asks for a code of an app on your phone: a stolen password alone is not enough to log in.')}</span>
                            {state.required &&
                                <Message severity="warn" text={state.setupDue ? t('This installation requires it: set it up by {{date}}.', { date: formatDate(state.setupDue) }) : t('This installation requires it: you set it up at your next login.')} className="w-100 justify-content-start" />}
                            <div className="d-flex justify-content-end">
                                <Button type="button" label={t('Set up')} icon="pi pi-lock" size="small" onClick={() => setOpen('setup')} />
                            </div>
                        </>}
                    {!state.enabled && open === 'setup' &&
                        <MfaSetup
                            email={user.email}
                            onSaved={onSaved}
                            onCancel={close}
                            onDone={(answer) => { changed(answer.mfa); close(); onSaved?.(t('Two-step login is on')); }}
                        />}

                    {state.enabled &&
                        <>
                            <span className="text-default"><i className="pi pi-lock text-success me-2" aria-hidden="true" />{t('On since {{date}}.', { date: formatDate(state.enabledAt) })}{' '}<span className="text-subtle">{t('Recovery codes left: {{count}}', { count: state.recoveryLeft })}</span></span>
                            {state.recoveryLeft <= 3 && <Message severity="warn" text={t('Only a few recovery codes are left: make new ones.')} className="w-100 justify-content-start" />}
                            {codes && <RecoveryCodes codes={codes} email={user.email} onSaved={onSaved} />}
                            {open === 'codes' &&
                                <form onSubmit={newCodes} className="d-flex flex-column gap-2">
                                    <span className="fs-7 text-subtle">{t('New recovery codes: the old ones stop working. Enter a code of your app to go on.')}</span>
                                    {codeInput}
                                    {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                                    <div className="d-flex justify-content-end gap-2">
                                        <Button type="button" label={t('Cancel')} size="small" severity="secondary" text onClick={close} />
                                        <Button type="submit" label={t('New recovery codes')} icon="pi pi-refresh" size="small" loading={busy} />
                                    </div>
                                </form>}
                            {open === 'off' &&
                                <form onSubmit={turnOff} className="d-flex flex-column gap-2">
                                    <span className="fs-7 text-subtle">{t('Turn off two-step login: enter your password and a code of your app.')}</span>
                                    <Password inputId="two-step-password" value={password} onChange={(e) => setPassword(e.target.value)} feedback={false} placeholder={t('Current password')} aria-label={t('Current password')} autoComplete="current-password" className="w-100" inputClassName="w-100" required />
                                    {codeInput}
                                    {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                                    <div className="d-flex justify-content-end gap-2">
                                        <Button type="button" label={t('Cancel')} size="small" severity="secondary" text onClick={close} />
                                        <Button type="submit" label={t('Turn off')} icon="pi pi-unlock" size="small" severity="danger" loading={busy} />
                                    </div>
                                </form>}
                            {!open &&
                                <div className="d-flex justify-content-end flex-wrap gap-2">
                                    {state.required
                                        ? <span className="text-faint fs-8 align-self-center">{t('Required on this installation: it cannot be turned off.')}</span>
                                        : <Button type="button" label={t('Turn off')} icon="pi pi-unlock" size="small" severity="danger" text onClick={() => { setCodes(null); setOpen('off'); }} />}
                                    <Button type="button" label={t('Forget trusted devices')} icon="pi pi-mobile" size="small" severity="secondary" onClick={forget} />
                                    <Button type="button" label={t('New recovery codes')} icon="pi pi-refresh" size="small" severity="secondary" onClick={() => { setCodes(null); setOpen('codes'); }} />
                                </div>}
                        </>}
                </div>
            </div>
        </>
    );
};

export default TwoStepSetting;
