import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';

import ClubService from '../../services/club.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';

/**
 * For the club admins, above the players: who asks to join the club, with
 * their nickname and a few words, to accept or decline. Accepting makes them
 * a player of the club with a login. onDecided(accepted) after each decision.
 */
const JoinRequests = ({ onDecided }) => {
    const toast = useRef(null);
    const panel = useRef(null);
    const [searchParams] = useSearchParams();
    const { activeClub, refreshClubs } = useAuth();
    const [requests, setRequests] = useState([]);
    const [busy, setBusy] = useState(null);

    const load = useCallback(async () => {
        try {
            setRequests(await ClubService.loadJoinRequests(activeClub.id));
        } catch {
            setRequests([]);
        }
    }, [activeClub.id]);
    useEffect(() => { load(); }, [load]);

    // a notification leads here with ?requests=1
    const linked = searchParams.has('requests');
    useEffect(() => {
        if (linked && requests.length) panel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, [linked, requests.length]);

    const decide = async (request, accept) => {
        setBusy(request.id);
        try {
            await ClubService.decideJoinRequest(activeClub.id, request.id, accept);
            toast.current?.show({
                severity: accept ? 'success' : 'info',
                summary: accept ? t('{{nickname}} joined the club', { nickname: request.nickname }) : t('Request declined'),
                detail: accept ? t('{{name}} plays as {{nickname}} and is told so.', { name: request.name, nickname: request.nickname }) : t('{{name}} is told so.', { name: request.name }),
                life: 3500,
            });
            await load();
            refreshClubs().catch(() => {});
            onDecided?.(accept);
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: t('Join request'), detail: error.message, life: 4000 });
            await load();
        } finally {
            setBusy(null);
        }
    };

    // the toast stays when the last request is decided and the list goes
    return (
        <>
        <Toast ref={toast} position="bottom-right" />
        {requests.length > 0 &&
        <div ref={panel} className="mb-4">
            <Panel header={t('Requests to join ({{length}})', { length: requests.length })}>
                <p className="text-subtle fs-7 mt-0 mb-3">
                    {t('They have an account and ask to play in')}{' '}{activeClub.name}{t('. Accepted, they are a player of the club with their login; a player they have in another club comes along with the statistics.')}
                </p>
                <ul className="my-clubs list-unstyled m-0">
                    {requests.map(request => (
                        <li key={request.id} className="my-club">
                            <div className="my-club-head">
                                <div className="my-club-title">
                                    <div className="d-flex flex-wrap align-items-baseline gap-2">
                                        <span className="text-default fw-semibold">{request.name}</span>
                                        <span className="text-subtle fs-7">{t('as')}{' '}{request.nickname}</span>
                                    </div>
                                    <span className="text-faint fs-8">{request.email && `${request.email} · `}{t('asked')}{' '}{formatDate(request.at, { time: true })}</span>
                                    {request.message && <span className="text-subtle fs-7 text-break">“{request.message}”</span>}
                                </div>
                                <div className="my-club-actions">
                                    <Button label={t('Decline')} size="small" severity="secondary" onClick={() => decide(request, false)} disabled={busy === request.id} />
                                    <Button label={t('Accept')} icon="pi pi-check" size="small" onClick={() => decide(request, true)} loading={busy === request.id} />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </Panel>
        </div>
        }
        </>
    );
};

export default JoinRequests;
