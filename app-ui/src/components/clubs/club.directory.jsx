import { useCallback, useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import dayjs from 'dayjs';

import ClubService from '../../services/club.service';
import ClubLogo from '../elements/club.logo';
import { useAuth } from '../../utils/auth.context';

// after a declined request, asking the same club again waits this long (as the API)
const ASK_AGAIN_AFTER_DAYS = 7;

const JOIN_POLICY_LABELS = { open: 'Open to join', approval: 'Admins accept' };

/**
 * Join a club: the clubs that take new members, searchable by name. An open
 * club is joined at once; in a club whose admins accept members the user
 * asks, and waits for the answer (or takes the request back). Joining takes
 * the user's player along, with the statistics and badges; without one they
 * choose a nickname.
 */
const ClubDirectory = ({ onSuccess, onError }) => {
    const { activeClub, refreshClubs, selectClub } = useAuth();
    const [search, setSearch] = useState('');
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [pending, setPending] = useState([]);
    // the club being joined, with what the user writes: { club, nickname, message }
    const [joining, setJoining] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async (q) => {
        try {
            const [directory, mine] = await Promise.all([ClubService.loadDirectory(q), ClubService.loadMyJoinRequests()]);
            setData(directory);
            setPending(mine);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, []);

    // searching as one types, once the typing pauses
    useEffect(() => {
        const timer = setTimeout(() => load(search.trim()), search ? 300 : 0);
        return () => clearTimeout(timer);
    }, [search, load]);

    const join = async (event) => {
        event.preventDefault();
        const { club, nickname, message } = joining;
        setBusy(true);
        try {
            const result = await ClubService.joinClub(club.id, { nickname: data.nickname ? undefined : nickname.trim(), message: message.trim() || undefined });
            setJoining(null);
            if (result.status === 'member') {
                await refreshClubs();
                if (!activeClub) selectClub(club.id);
                onSuccess('Welcome', `You are a member of ${club.name} now, as ${result.player?.nickname ?? nickname}.`);
            } else {
                onSuccess('Request sent', `The admins of ${club.name} decide. You get a notification with their answer.`);
            }
            await load(search.trim());
        } catch (error) {
            onError(`Join ${club.name}`, error);
        } finally {
            setBusy(false);
        }
    };

    const withdraw = async (clubId, clubName) => {
        try {
            await ClubService.withdrawJoinRequest(clubId);
            onSuccess('Request taken back', clubName);
            await load(search.trim());
        } catch (error) {
            onError('Take the request back', error);
        }
    };

    const clubs = data?.clubs ?? [];
    const shownIds = new Set(clubs.map(club => club.id));
    // requests to clubs no longer listed (the admins closed it since, or the search hides it)
    const otherPending = pending.filter(request => !shownIds.has(request.club));
    const askAgainOn = (request) => request?.status === 'declined' && request.decidedAt
        ? dayjs(request.decidedAt).add(ASK_AGAIN_AFTER_DAYS, 'day')
        : null;

    const action = (club) => {
        if (club.isMember) return <Tag value="Your club" severity="success" />;
        if (club.request?.status === 'open') {
            return <>
                <span className="text-faint fs-8">Asked {dayjs(club.request.at).format('DD.MM.YYYY')}, waiting for the admins</span>
                <Button label="Take back" size="small" severity="secondary" text onClick={() => withdraw(club.id, club.name)} />
            </>;
        }
        const again = askAgainOn(club.request);
        if (club.joinPolicy === 'approval' && again && again.isAfter(dayjs())) {
            return <span className="text-faint fs-8">Declined. You can ask again from {again.format('DD.MM.YYYY')}.</span>;
        }
        return club.joinPolicy === 'open'
            ? <Button label="Join" icon="pi pi-sign-in" size="small" onClick={() => setJoining({ club, nickname: '', message: '' })} />
            : <Button label="Ask to join" icon="pi pi-send" size="small" severity="secondary" onClick={() => setJoining({ club, nickname: '', message: '' })} />;
    };

    const needsNickname = data && !data.nickname;
    const validNickname = !needsNickname || /^[A-Za-zéèàäöü\s'-]{3,25}$/.test(joining?.nickname.trim() ?? '');

    return (
        <Panel header="Join a club" className="mt-4">
            <div className="my-clubs-top">
                <p className="text-subtle fs-7 m-0">
                    Clubs that take new members. An open club you join at once; elsewhere the admins accept you first.
                    {data?.nickname
                        ? <> You play there as <span className="text-default fw-semibold">{data.nickname}</span>, with your statistics and badges.</>
                        : ' You choose your nickname when you join.'}
                </p>
                <span className="p-input-icon-left">
                    <i className="pi pi-search" aria-hidden="true" />
                    <InputText value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clubs" aria-label="Search clubs" maxLength={50} style={{ minWidth: '14rem' }} />
                </span>
            </div>

            {otherPending.length > 0 &&
                <ul className="my-clubs list-unstyled m-0 mb-3">
                    {otherPending.map(request => (
                        <li key={request.id} className="my-club">
                            <div className="my-club-head">
                                <ClubLogo club={{ name: request.clubName, logo: request.clubLogo }} size="md" />
                                <div className="my-club-title">
                                    <span className="text-default fw-semibold fs-6 text-break">{request.clubName}</span>
                                    <span className="text-faint fs-8">Asked {dayjs(request.at).format('DD.MM.YYYY')} as {request.nickname}, waiting for the admins</span>
                                </div>
                                <div className="my-club-actions">
                                    <Button label="Take back" size="small" severity="secondary" text onClick={() => withdraw(request.club, request.clubName)} />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            }

            {failed && <p className="text-subtle fs-7 m-0">The clubs could not be loaded. Please reload the page.</p>}
            {data && clubs.length === 0 &&
                <p className="text-subtle fs-7 py-3 text-center m-0">
                    {search.trim() ? `No club called like "${search.trim()}" takes new members.` : 'No club takes new members on their own yet. Ask a club admin to add you, or create your own club.'}
                </p>
            }
            <ul className="my-clubs list-unstyled m-0">
                {clubs.map(club => (
                    <li key={club.id} className="my-club">
                        <div className="my-club-head">
                            <ClubLogo club={club} size="md" />
                            <div className="my-club-title">
                                <div className="d-flex flex-wrap align-items-center gap-2">
                                    <span className="text-default fw-semibold fs-6 text-break">{club.name}</span>
                                    <Tag value={JOIN_POLICY_LABELS[club.joinPolicy]} severity={club.joinPolicy === 'open' ? 'success' : 'info'} />
                                </div>
                                <span className="text-faint fs-8">{club.playerCount} {club.playerCount === 1 ? 'player' : 'players'}</span>
                                {club.description && <span className="text-subtle fs-8 text-break">{club.description}</span>}
                            </div>
                            <div className="my-club-actions">{action(club)}</div>
                        </div>
                    </li>
                ))}
            </ul>

            <Dialog
                header={joining ? `${joining.club.joinPolicy === 'open' ? 'Join' : 'Ask to join'} ${joining.club.name}` : ''}
                visible={!!joining}
                onHide={() => setJoining(null)}
                blockScroll
                draggable={false}
                className="m-4"
                style={{ width: '30rem', maxWidth: '100%' }}
            >
                {joining &&
                    <form onSubmit={join} className="d-flex flex-column gap-3 pt-1">
                        <p className="text-subtle fs-7 m-0">
                            {joining.club.joinPolicy === 'open'
                                ? 'You are a member at once and can play in the club right away. Its admins are told who joined.'
                                : 'The admins of the club are asked and decide. You get a notification with their answer.'}
                        </p>
                        {needsNickname
                            ? <label className="d-flex flex-column gap-1">
                                <span className="text-subtle fs-8">Nickname</span>
                                <InputText value={joining.nickname} onChange={(event) => setJoining({ ...joining, nickname: event.target.value })} minLength={3} maxLength={25} required autoFocus />
                                <span className="text-faint fs-8">How the club and the games call you, 3 to 25 letters.</span>
                            </label>
                            : <p className="text-subtle fs-7 m-0">You play as <span className="text-default fw-semibold">{data.nickname}</span>, with your statistics, badges and flights.</p>
                        }
                        {joining.club.joinPolicy === 'approval' &&
                            <label className="d-flex flex-column gap-1">
                                <span className="text-subtle fs-8">A few words for the admins (optional)</span>
                                <InputTextarea value={joining.message} onChange={(event) => setJoining({ ...joining, message: event.target.value })} rows={3} maxLength={300} autoResize placeholder="Who you are, when you play" />
                            </label>
                        }
                        <div className="d-flex justify-content-end gap-2">
                            <Button type="button" label="Cancel" size="small" severity="secondary" onClick={() => setJoining(null)} />
                            <Button type="submit" label={joining.club.joinPolicy === 'open' ? 'Join' : 'Ask to join'} icon={joining.club.joinPolicy === 'open' ? 'pi pi-sign-in' : 'pi pi-send'} size="small" loading={busy} disabled={!validNickname} />
                        </div>
                    </form>
                }
            </Dialog>
        </Panel>
    );
};

export default ClubDirectory;
