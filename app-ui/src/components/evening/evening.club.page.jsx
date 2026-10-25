import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';

import EveningService, { eveningKeyOf } from '../../services/evening.service';
import QuickLayout from '../quick/quick.layout';
import { useAuth } from '../../utils/auth.context';
import { clearPendingEvening, setPendingEvening } from '../../utils/pending.evening';
import { formatDate } from '../../utils/dates';
import { t, tn } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';

/**
 * Making a darts evening a club: logged out, the way to an account (and back
 * here afterwards); logged in, the club's name and which player of the
 * evening one is, then the club with the players and the games played.
 */
const EveningClubPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isGlobalAdmin, refreshClubs, selectClub } = useAuth();
    const [evening, setEvening] = useState(null);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [me, setMe] = useState(null);
    const [busy, setBusy] = useState(false);
    const ownDevice = Boolean(eveningKeyOf(id));

    useEffect(() => {
        if (!ownDevice) return;
        EveningService.loadEvening(id).then(loaded => {
            setEvening(loaded);
            setName(loaded.name || t('Darts evening of {{date}}', { date: formatDate(loaded.createdAt) }));
        }).catch(err => setError(err.message));
    }, [id, ownDevice]);

    // the account comes first: back here once it is there
    useEffect(() => {
        if (!user && ownDevice) setPendingEvening(id);
        else clearPendingEvening();
    }, [user, id, ownDevice]);

    const create = async () => {
        setBusy(true);
        setError('');
        try {
            const { club } = await EveningService.makeClub(id, { name: name.trim(), me });
            await refreshClubs();
            selectClub(club.id);
            navigate('/club', { replace: true });
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    };

    const body = () => {
        if (!ownDevice) return <Message severity="warn" className="w-100 justify-content-start" text={t('Only the device the evening was played on can make it a club.')} />;
        if (error && !evening) return <Message severity="warn" className="w-100 justify-content-start" text={error} />;
        if (!evening) return <Lines count={4} />;
        if (evening.club) return <Message severity="success" className="w-100 justify-content-start" text={t('This evening is a club already.')} />;
        if (!user) {
            return (
                <div className="d-flex flex-column gap-3">
                    <p className="m-0 text-subtle">{t('A club needs an account: register (it takes a minute) or log in, and you come back here to finish.')}</p>
                    <div className="d-flex flex-wrap gap-2">
                        <Link to="/register" className="p-button p-button-sm text-decoration-none">{t('Register')}</Link>
                        <Link to="/login" className="p-button p-button-sm p-button-secondary text-decoration-none">{t('Log in')}</Link>
                    </div>
                </div>
            );
        }
        if (isGlobalAdmin) return <Message severity="info" className="w-100 justify-content-start" text={t('Global admins look after the app and do not belong to a club. Use another account to run a club or to play.')} />;
        const played = evening.report.played;
        return (
            <div className="d-flex flex-column gap-3">
                <p className="m-0 text-subtle">
                    {tn(evening.players.length, 'The club gets {{count}} player', 'The club gets {{count}} players')}{' '}
                    {tn(played, 'and {{count}} game played tonight, in its statistics and badges.', 'and the {{count}} games played tonight, in their statistics and badges.')}{' '}
                    {t('You become its admin and can invite the others later.')}
                </p>
                <label className="d-flex flex-column gap-1" htmlFor="evening-club-name">
                    <span className="fs-7 text-default fw-semibold">{t('Name of the club')}</span>
                    <InputText id="evening-club-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
                </label>
                <div className="d-flex flex-column gap-1">
                    <span className="fs-7 text-default fw-semibold">{t('Which one is you?')}</span>
                    <SelectButton
                        value={me}
                        options={[...evening.players.map(player => ({ label: player.name, value: player.id })), { label: t('None of them'), value: null }]}
                        onChange={(event) => setMe(event.value ?? null)}
                        className="p-selectbutton-pills flex-wrap"
                    />
                    <span className="text-faint fs-8">{t('That player gets your login, with your name; the games of tonight count for you.')}</span>
                </div>
                {error && <Message severity="error" className="w-100 justify-content-start" text={error} />}
                <div className="d-flex flex-wrap justify-content-end gap-2">
                    <Link to={`/evening/${id}`} className="p-button p-button-sm p-button-text text-decoration-none">{t('Back to the evening')}</Link>
                    <Button type="button" label={t('Make the club')} icon="pi pi-check" size="small" loading={busy} disabled={!name.trim()} onClick={create} />
                </div>
            </div>
        );
    };

    return (
        <QuickLayout suffix={t('· Darts evening')}>
            <Panel header={t('Make this a club')} className="page-narrow">
                {body()}
            </Panel>
        </QuickLayout>
    );
};

export default EveningClubPage;
