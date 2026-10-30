import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';

import TournamentService from '../../../services/tournament.service';
import DeletionRequestService from '../../../services/deletion.request.service';
import IntegrityService from '../../../services/integrity.service';
import CalendarService from '../../../services/calendar.service';
import { dayKey } from '../../../rules/calendar';
import { useAuth } from '../../../utils/auth.context';
import { playerInClub, useMyPlayers } from '../../../utils/use.my.players';
import { playPath } from '../../../utils/game.paths';
import { gameTitle } from '../../admin/kind.titles';
import { roundName } from '../../tournaments/tournament.words';
import { formatDateTime } from '../../../utils/dates';
import { t, tn } from '../../../utils/i18n';

/**
 * What waits for the player: tonight's club night (whether they come, right
 * here, and the way to the club evening), a tournament to enter or a match
 * of theirs to play, their games left running, deletion requests waiting for
 * their answer; for the club's admins also new requests to join and what fair
 * play found. Nothing waiting: a short word saying so.
 * runningGames and players: from the club's statistics.
 */
const UpNextWidget = ({ widget, runningGames = [], players }) => {
    const navigate = useNavigate();
    const { activeClub, isClubAdmin } = useAuth();
    const myPlayer = playerInClub(useMyPlayers(), activeClub?.id);
    const me = myPlayer?.id ?? null;
    const [tournaments, setTournaments] = useState([]);
    const [requests, setRequests] = useState([]);
    const [fairPlay, setFairPlay] = useState(null);
    const [busy, setBusy] = useState('');
    const [tonight, setTonight] = useState(null);
    const today = dayKey(new Date());

    useEffect(() => {
        TournamentService.loadTournaments({ active: true }).then(data => setTournaments(data.tournaments)).catch(() => setTournaments([]));
        CalendarService.loadCalendar(today, today).then(data => setTonight(data.clubNights?.[0] ?? null)).catch(() => setTonight(null));
        DeletionRequestService.loadOpen().then(setRequests).catch(() => setRequests([]));
        if (isClubAdmin) IntegrityService.loadSummary(false).then(setFairPlay).catch(() => setFairPlay(null));
    }, [isClubAdmin, activeClub?.id, today]);

    const nameOf = (id) => players?.get(id)?.nickname ?? t('Unknown');
    const answer = async (tournament, status) => {
        setBusy(`${tournament.id}-${status}`);
        try {
            const updated = await TournamentService.answer(tournament.id, status);
            setTournaments(list => list.map(entry => (entry.id === updated.id ? updated : entry)));
        } catch {
            // the tournament's page says why
        }
        setBusy('');
    };

    const comeTonight = async (value) => {
        setBusy(`night-${value}`);
        try {
            const data = await CalendarService.answer(tonight.day, value, { from: today, to: today });
            setTonight(data.clubNights?.[0] ?? null);
        } catch {
            // the calendar says why
        }
        setBusy('');
    };

    const items = [];
    // tonight's club night, until it is over (one going on past midnight all day)
    const now = new Date().toTimeString().slice(0, 5);
    if (tonight && !(tonight.end && tonight.end > tonight.start && now >= tonight.end)) {
        const hours = tonight.end ? `${tonight.start}–${tonight.end}` : tonight.start;
        if (tonight.cancelled) {
            items.push({ key: 'night', icon: 'pi-ban', title: t('Tonight\'s club night is cancelled'), detail: tonight.cancelled.reason || '' });
        } else {
            const coming = tonight.coming.length
                ? `${t('{{count}} coming', { count: tonight.coming.length })}: ${tonight.coming.map(entry => entry.nickname).join(', ')}`
                : t('Nobody said yet');
            items.push({
                key: 'night', icon: 'pi-users',
                title: t('Club night tonight, {{hours}}', { hours }),
                detail: [tonight.note, coming].filter(Boolean).join(' · '),
                // not answered yet: whether they come; else the way to the evening's games and table
                actions: me && !tonight.me
                    ? (
                        <>
                            <Button type="button" label={t('I\'m coming')} icon="pi pi-check" size="small" loading={busy === 'night-yes'} onClick={() => comeTonight('yes')} />
                            <Button type="button" label={t('Not this time')} size="small" severity="secondary" text loading={busy === 'night-no'} onClick={() => comeTonight('no')} />
                        </>
                    )
                    : <Link to={`/club-night/${tonight.day}`} className={`p-button p-button-sm text-decoration-none ${tonight.me === 'no' ? 'p-button-secondary' : ''}`}><i className="pi pi-users me-2" aria-hidden="true" />{t('Club evening')}</Link>,
            });
        }
    }
    for (const tournament of tournaments) {
        if (tournament.status === 'registration' && tournament.me?.status === 'invited') {
            items.push({
                key: `t-${tournament.id}`, icon: 'pi-sitemap',
                title: t('Will you play {{name}}?', { name: tournament.name }),
                detail: t('Registration until {{date}}', { date: formatDateTime(tournament.closesAt) }),
                actions: (
                    <>
                        <Button type="button" label={t('I\'m in')} icon="pi pi-check" size="small" loading={busy === `${tournament.id}-in`} onClick={() => answer(tournament, 'in')} />
                        <Button type="button" label={t('Not this time')} size="small" severity="secondary" text loading={busy === `${tournament.id}-out`} onClick={() => answer(tournament, 'out')} />
                    </>
                ),
            });
        }
        const match = me && tournament.matches?.find(entry => entry.players.includes(me) && ['ready', 'running'].includes(entry.status));
        if (match) {
            const opponent = match.players.find(id => id && id !== me);
            items.push({
                key: `m-${tournament.id}`, icon: 'pi-sitemap',
                title: t('Your match in {{name}}: against {{opponent}}', { name: tournament.name, opponent: tournament.players?.[opponent]?.nickname ?? '?' }),
                detail: roundName(match.size),
                actions: <Link to={`/tournaments/${tournament.id}`} className="p-button p-button-sm text-decoration-none"><i className="pi pi-play me-2" />{match.status === 'running' ? t('Go on') : t('To the bracket')}</Link>,
            });
        }
    }
    for (const game of runningGames.filter(entry => me && entry.players?.some(player => player.player === me))) {
        const others = game.players.map(player => player.player).filter(id => id !== me);
        items.push({
            key: `g-${game.id}`, icon: 'pi-play-circle',
            title: others.length ? t('{{game}} against {{names}}', { game: gameTitle(game.type), names: others.map(nameOf).join(', ') }) : gameTitle(game.type),
            detail: t('Still running · started {{date}}', { date: formatDateTime(game.playedAt) }),
            actions: <Button type="button" icon="pi pi-play" label={t('Go on')} size="small" onClick={() => navigate(playPath(game.type, game.id))} />,
        });
    }
    for (const request of requests.filter(entry => me && entry.players?.some(player => player.player === me && !player.answer))) {
        items.push({
            key: `d-${request.id}`, icon: 'pi-flag',
            title: t('{{name}} asks to delete a game you played', { name: request.byName ?? '?' }),
            detail: request.summary ?? '',
            actions: <Link to={`/games?deletion=${request.id}`} className="p-button p-button-sm p-button-secondary text-decoration-none">{t('Answer')}</Link>,
        });
    }
    if (isClubAdmin && activeClub?.openJoinRequests > 0) {
        items.push({
            key: 'join', icon: 'pi-user-plus',
            title: tn(activeClub.openJoinRequests, '{{count}} request to join the club', '{{count}} requests to join the club'),
            detail: t('Accept or decline them under Players.'),
            actions: <Link to="/players" className="p-button p-button-sm p-button-secondary text-decoration-none">{t('Players')}</Link>,
        });
    }
    if (isClubAdmin && fairPlay?.open > 0) {
        items.push({
            key: 'fairplay', icon: 'pi-exclamation-triangle',
            title: tn(fairPlay.open, '{{count}} game to look at under Fair play', '{{count}} games to look at under Fair play'),
            detail: fairPlay.impossible > 0 ? tn(fairPlay.impossible, '{{count}} of them cannot be real', '{{count}} of them cannot be real') : t('Worth a look'),
            actions: <Link to="/fair-play" className="p-button p-button-sm p-button-secondary text-decoration-none">{t('Fair play')}</Link>,
        });
    }

    return (
        <Panel header={widget.title} className="h-100">
            {!items.length && <p className="text-subtle fs-7 m-0">{t('Nothing waiting for you. Time to throw a few darts!')}</p>}
            <ul className="list-unstyled m-0 up-next-list">
                {items.map(item => (
                    <li key={item.key} className="up-next">
                        <span className="up-next-icon" aria-hidden="true"><i className={`pi ${item.icon}`} /></span>
                        <span className="d-flex flex-column min-w-0 flex-grow-1">
                            <span className="text-default fw-semibold">{item.title}</span>
                            {item.detail && <span className="text-faint fs-8">{item.detail}</span>}
                        </span>
                        <span className="d-flex flex-wrap align-items-center gap-1 flex-shrink-0">{item.actions}</span>
                    </li>
                ))}
            </ul>
        </Panel>
    );
};

export default UpNextWidget;
