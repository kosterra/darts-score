import { useCallback, useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import dayjs from 'dayjs';

import ClubService from '../../services/club.service';
import ClubLogo from '../elements/club.logo';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import CountryFlag from '../elements/country.flag';
import { formatDate } from '../../utils/dates';

// after a declined request, asking the same club again waits this long (as the API)
const ASK_AGAIN_AFTER_DAYS = 7;

const JOIN_POLICY_LABELS = { open: t('Open to join'), approval: t('Admins accept') };

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
                onSuccess(t('Welcome'), t('You are a member of {{name}} now, as {{value}}.', { name: club.name, value: result.player?.nickname ?? nickname }));
            } else {
                onSuccess(t('Request sent'), t('The admins of {{name}} decide. You get a notification with their answer.', { name: club.name }));
            }
            await load(search.trim());
        } catch (error) {
            onError(t('Join {{name}}', { name: club.name }), error);
        } finally {
            setBusy(false);
        }
    };

    const withdraw = async (clubId, clubName) => {
        try {
            await ClubService.withdrawJoinRequest(clubId);
            onSuccess(t('Request taken back'), clubName);
            await load(search.trim());
        } catch (error) {
            onError(t('Take the request back'), error);
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
        if (club.isMember) return <Tag value={t('Your club')} severity="success" />;
        if (club.request?.status === 'open') {
            return <>
                <span className="text-faint fs-8">{t('Asked')}{' '}{formatDate(club.request.at)}{t(', waiting for the admins')}</span>
                <Button label={t('Take back')} size="small" severity="secondary" text onClick={() => withdraw(club.id, club.name)} />
            </>;
        }
        const again = askAgainOn(club.request);
        if (club.joinPolicy === 'approval' && again && again.isAfter(dayjs())) {
            return <span className="text-faint fs-8">{t('Declined. You can ask again from')}{' '}{formatDate(again)}.</span>;
        }
        return club.joinPolicy === 'open'
            ? <Button label={t('Join')} icon="pi pi-sign-in" size="small" onClick={() => setJoining({ club, nickname: '', message: '' })} />
            : <Button label={t('Ask to join')} icon="pi pi-send" size="small" severity="secondary" onClick={() => setJoining({ club, nickname: '', message: '' })} />;
    };

    const needsNickname = data && !data.nickname;
    const validNickname = !needsNickname || /^[\p{L}\s'-]{3,25}$/u.test(joining?.nickname.trim() ?? '');

    return (
        <Panel header={t('Join a club')} className="mt-4">
            <div className="my-clubs-top">
                <p className="text-subtle fs-7 m-0">
                    {t('Clubs that take new members. An open club you join at once; elsewhere the admins accept you first.')}
                    {data?.nickname
                        ? <>{' '}{t('You play there as')}{' '}<span className="text-default fw-semibold">{data.nickname}</span>{t(', with your statistics and badges.')}</>
                        : t(' You choose your nickname when you join.')}
                </p>
                <span className="p-input-icon-left">
                    <i className="pi pi-search" aria-hidden="true" />
                    <InputText value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search clubs')} aria-label={t('Search clubs')} maxLength={50} style={{ minWidth: '14rem' }} />
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
                                    <span className="text-faint fs-8">{t('Asked')}{' '}{formatDate(request.at)}{' '}{t('as')}{' '}{request.nickname}{t(', waiting for the admins')}</span>
                                </div>
                                <div className="my-club-actions">
                                    <Button label={t('Take back')} size="small" severity="secondary" text onClick={() => withdraw(request.club, request.clubName)} />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            }

            {failed && <p className="text-subtle fs-7 m-0">{t('The clubs could not be loaded. Please reload the page.')}</p>}
            {data && clubs.length === 0 &&
                <p className="text-subtle fs-7 py-3 text-center m-0">
                    {search.trim() ? t('No club called like "{{trim}}" takes new members.', { trim: search.trim() }) : t('No club takes new members on their own yet. Ask a club admin to add you, or create your own club.')}
                </p>
            }
            <ul className="my-clubs list-unstyled m-0">
                {clubs.map(club => (
                    <li key={club.id} className="my-club">
                        <div className="my-club-head">
                            <ClubLogo club={club} size="md" />
                            <div className="my-club-title">
                                <div className="d-flex flex-wrap align-items-center gap-2">
                                    <span className="text-default fw-semibold fs-6 text-break">{club.name}{' '}<CountryFlag code={club.country} /></span>
                                    <Tag value={JOIN_POLICY_LABELS[club.joinPolicy]} severity={club.joinPolicy === 'open' ? 'success' : 'info'} />
                                </div>
                                <span className="text-faint fs-8">{club.playerCount} {club.playerCount === 1 ? t('player') : t('players')}</span>
                                {club.description && <span className="text-subtle fs-8 text-break">{club.description}</span>}
                            </div>
                            <div className="my-club-actions">{joining?.club.id === club.id ? null : action(club)}</div>
                        </div>
                        {/* joining opens in place, under the club */}
                        {joining?.club.id === club.id &&
                            <form onSubmit={join} className="my-club-join d-flex flex-column gap-3">
                                <p className="text-subtle fs-7 m-0">
                                    {joining.club.joinPolicy === 'open'
                                        ? t('You are a member at once and can play in the club right away. Its admins are told who joined.')
                                        : t('The admins of the club are asked and decide. You get a notification with their answer.')}
                                </p>
                                {needsNickname
                                    ? <label className="d-flex flex-column gap-1">
                                        <span className="text-subtle fs-8">{t('Nickname')}</span>
                                        <InputText value={joining.nickname} onChange={(event) => setJoining({ ...joining, nickname: event.target.value })} minLength={3} maxLength={25} required autoFocus />
                                        <span className="text-faint fs-8">{t('How the club and the games call you, 3 to 25 letters.')}</span>
                                    </label>
                                    : <p className="text-subtle fs-7 m-0">{t('You play as')}{' '}<span className="text-default fw-semibold">{data.nickname}</span>{t(', with your statistics, badges and flights.')}</p>
                                }
                                {joining.club.joinPolicy === 'approval' &&
                                    <label className="d-flex flex-column gap-1">
                                        <span className="text-subtle fs-8">{t('A few words for the admins (optional)')}</span>
                                        <InputTextarea value={joining.message} onChange={(event) => setJoining({ ...joining, message: event.target.value })} rows={3} maxLength={300} autoResize placeholder={t('Who you are, when you play')} />
                                    </label>
                                }
                                <div className="d-flex justify-content-end gap-2">
                                    <Button type="button" label={t('Cancel')} size="small" severity="secondary" onClick={() => setJoining(null)} />
                                    <Button type="submit" label={joining.club.joinPolicy === 'open' ? t('Join') : t('Ask to join')} icon={joining.club.joinPolicy === 'open' ? 'pi pi-sign-in' : 'pi pi-send'} size="small" loading={busy} disabled={!validNickname} />
                                </div>
                            </form>
                        }
                    </li>
                ))}
            </ul>

        </Panel>
    );
};

export default ClubDirectory;
