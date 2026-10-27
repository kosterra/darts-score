import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaTrophy } from 'react-icons/fa';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import TournamentService from '../../services/tournament.service';
import PlayerService from '../../services/player.service';
import { useAuth } from '../../utils/auth.context';
import { calendarFormat, formatDate, formatDateTime } from '../../utils/dates';
import { t, tn } from '../../utils/i18n';
import { MIN_PLAYERS, isDecided, nextOf } from '../../rules/tournaments';
import TournamentBracket from './tournament.bracket';
import { INVITE_WORDS, STATUS_WORDS, nameOf, roundName, rulesText } from './tournament.words';
import BetaTag from './beta.tag';
import { ShirtPicture } from '../shirts/shirt.art';
import { Lines } from '../elements/skeletons';

/**
 * What can be done with a match: start it (its players or an admin, with who
 * throws first), go on with or watch a running one, see the statistics of a
 * played one, and (admins) decide it without a game.
 */
// the walk-on: both players in their shirts, as on the stage, before a match is played
const WalkOn = ({ tournament, match, club }) => (
    <div className="tournament-walk-on" aria-hidden="true">
        {match.players.map((id, index) => {
            const player = tournament.players?.[id];
            return (
                <Fragment key={id ?? index}>
                    {index === 1 && <span className="tournament-walk-on-vs">{t('vs')}</span>}
                    <span className="tournament-walk-on-player">
                        {player?.shirt && <ShirtPicture {...player.shirt} nickname={player.nickname} club={club} uid={`walk-on-${match.id}-${index}`} />}
                        <span className="text-default fw-semibold fs-7 text-truncate">{player?.nickname ?? '?'}</span>
                    </span>
                </Fragment>
            );
        })}
    </div>
);

const MatchDialog = ({ tournament, match, isAdmin, onHide, onStart, onResult, busy }) => {
    const { activeClub } = useAuth();
    const [first, setFirst] = useState(null);
    const [winner, setWinner] = useState(null);
    useEffect(() => { setFirst(match?.players?.[0] ?? null); setWinner(null); }, [match]);
    if (!match) return null;
    const round = tournament.rounds.find(entry => entry.size === match.size);
    const mine = match.players.includes(tournament.myPlayer);
    const canStart = (isAdmin || mine) && match.status === 'ready';
    const options = match.players.filter(Boolean).map(id => ({ label: nameOf(tournament, id), value: id }));
    const next = nextOf(match);
    const nextStarted = next && ['running', 'done', 'walkover'].includes(tournament.matches.find(entry => entry.id === next.id)?.status);
    const canDecide = isAdmin && match.players[0] && match.players[1] && !match.bye && (!isDecided(match) || !nextStarted);

    return (
        <Dialog header={`${roundName(match.size)} · ${options.map(option => option.label).join(' – ')}`} visible onHide={onHide} className="tournament-dialog" dismissableMask>
            <div className="d-flex flex-column gap-3">
                {match.players[0] && match.players[1] && !match.bye && ['ready', 'running'].includes(match.status) &&
                    <WalkOn tournament={tournament} match={match} club={activeClub} />}
                <span className="text-subtle fs-7">{rulesText(round?.rules)}{round?.date ? ` · ${formatDateTime(round.date)}` : ''}</span>
                {isDecided(match) &&
                    <Message severity="success" className="w-100 justify-content-start" text={match.status === 'walkover'
                        ? t('{{name}} goes on (decided by an admin).', { name: nameOf(tournament, match.winner) })
                        : t('{{name}} won.', { name: nameOf(tournament, match.winner) })} />}
                {canStart &&
                    <div className="d-flex flex-column gap-2">
                        <span className="text-default fw-semibold fs-7">{t('Who throws first?')}</span>
                        <SelectButton value={first} options={options} onChange={(event) => event.value && setFirst(event.value)} className="p-selectbutton-pills flex-wrap" />
                        <span className="text-faint fs-8">{t('E.g. who is nearer the bull with one dart each.')}</span>
                        <Button label={t('Start the match')} icon="pi pi-play" size="small" loading={busy === 'start'} onClick={() => onStart(match, first)} />
                    </div>}
                {match.status === 'running' && match.game &&
                    <Link to={`/x01/${match.game}`} className="p-button p-button-sm text-decoration-none justify-content-center"><i className="pi pi-play me-2" />{mine || isAdmin ? t('Go on with the match') : t('Watch the match')}</Link>}
                {match.status === 'done' && match.game &&
                    <Link to={`/stats/games/x01/${match.game}`} className="p-button p-button-sm p-button-secondary text-decoration-none justify-content-center"><i className="pi pi-chart-bar me-2" />{t('Statistics of the match')}</Link>}
                {!canStart && match.status === 'ready' && <span className="text-faint fs-8">{t('The players of the match or a club admin start it.')}</span>}
                {canDecide &&
                    <div className="d-flex flex-column gap-2 border-top pt-3 tournament-decide">
                        <span className="text-default fw-semibold fs-7">{t('Decide without a game')}</span>
                        <span className="text-faint fs-8">{t('A walkover, or a result played elsewhere: the winner goes on. A running game no longer counts for the tournament.')}</span>
                        <SelectButton value={winner} options={options} onChange={(event) => setWinner(event.value)} className="p-selectbutton-pills flex-wrap" />
                        <Button label={t('Goes on')} icon="pi pi-forward" size="small" severity="secondary" disabled={!winner} loading={busy === 'result'} onClick={() => onResult(match, winner)} />
                    </div>}
            </div>
        </Dialog>
    );
};

/**
 * One tournament: where it stands and what to do next. During the
 * registration the members enter or decline (admins see and change every
 * entry); once it closed the admins hold the draw; then the bracket, with
 * the matches started from it, until the winner.
 */
const TournamentPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useRef(null);
    const { isClubAdmin } = useAuth();
    const [tournament, setTournament] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [selected, setSelected] = useState(null);
    const [seeding, setSeeding] = useState('seeded');
    const [extendTo, setExtendTo] = useState(null);
    const [members, setMembers] = useState([]);
    const [revealing, setRevealing] = useState(false);

    const load = useCallback(() => TournamentService.loadTournament(id).then(setTournament).catch(err => setError(err.message)), [id]);
    useEffect(() => { load(); }, [load]);
    // the bracket follows running matches
    useEffect(() => {
        if (!['drawn', 'running'].includes(tournament?.status)) return undefined;
        const timer = setInterval(load, 30 * 1000);
        return () => clearInterval(timer);
    }, [tournament?.status, load]);
    // members who joined after the invitations, for the admins to add
    useEffect(() => {
        if (isClubAdmin && ['registration', 'closed'].includes(tournament?.status)) PlayerService.searchPlayers('').then(setMembers).catch(() => setMembers([]));
    }, [isClubAdmin, tournament?.status]);

    const run = async (key, action, done) => {
        setBusy(key);
        try {
            const result = await action();
            if (result?.id) setTournament(result);
            if (done) toast.current?.show({ severity: 'success', summary: tournament.name, detail: done, life: 3000 });
            return result;
        } catch (err) {
            toast.current?.show({ severity: 'error', summary: tournament.name, detail: err.message, life: 5000 });
            return null;
        } finally {
            setBusy('');
        }
    };

    const entries = useMemo(() => {
        const list = tournament?.entries ?? [];
        const byName = (a, b) => nameOf(tournament, a.player).localeCompare(nameOf(tournament, b.player));
        return { in: list.filter(entry => entry.status === 'in').sort(byName), invited: list.filter(entry => entry.status === 'invited').sort(byName), out: list.filter(entry => entry.status === 'out').sort(byName) };
    }, [tournament]);

    if (!tournament) return <div className="container-fluid p-4">{error ? <Message severity="error" text={error} /> : <Lines count={8} />}</div>;

    const status = STATUS_WORDS[tournament.status];
    const registration = tournament.status === 'registration';
    const closed = tournament.status === 'closed';
    const drawn = ['drawn', 'running', 'finished'].includes(tournament.status);
    const over = ['finished', 'cancelled'].includes(tournament.status);
    const notAsked = members.filter(member => !tournament.entries.some(entry => entry.player === member.id) && !member.guest);
    const playing = tournament.rounds.filter(round => !round.skipped);

    const answer = (value) => run('answer', () => TournamentService.answer(tournament.id, value), value === 'in' ? t('You are in.') : t('You are out of this one.'));
    const answerFor = (playerId, value) => run(`entry-${playerId}`, () => TournamentService.answerFor(tournament.id, playerId, value));
    const confirm = (header, message, accept, danger = false) => confirmDialog({
        header, message, icon: danger ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
        acceptLabel: header, rejectLabel: t('Cancel'),
        acceptClassName: `${danger ? 'p-button-danger ' : ''}p-button-sm`, rejectClassName: 'p-button-secondary p-button-sm',
        accept,
    });
    const draw = async () => {
        const result = await run('draw', () => TournamentService.holdDraw(tournament.id, seeding), t('The draw is done.'));
        if (result) setRevealing(true);
    };
    const start = async (match, first) => {
        const result = await run('start', () => TournamentService.startMatch(tournament.id, match.id, first));
        if (result?.game) navigate(`/x01/${result.game}`);
    };
    const decide = async (match, winner) => {
        const result = await run('result', () => TournamentService.setResult(tournament.id, match.id, winner), t('{{name}} goes on.', { name: nameOf(tournament, winner) }));
        if (result) setSelected(null);
    };

    const EntryList = ({ list, title, empty }) => (
        <div className="d-flex flex-column gap-2">
            <span className="text-subtle fs-8">{title} · {list.length}</span>
            {!list.length && <span className="text-faint fs-8">{empty}</span>}
            <ul className="list-unstyled m-0 tournament-entries">
                {list.map(entry => (
                    <li key={entry.player} className={entry.player === tournament.myPlayer ? 'is-mine' : ''}>
                        <span className="text-truncate">{nameOf(tournament, entry.player)}{entry.byAdmin && <span className="text-faint fs-9 ms-2">{t('by an admin')}</span>}</span>
                        {isClubAdmin && (registration || closed) &&
                            <span className="d-flex gap-1">
                                {entry.status !== 'in' && <Button icon="pi pi-check" text size="small" aria-label={t('Enter')} title={t('Enter')} loading={busy === `entry-${entry.player}`} onClick={() => answerFor(entry.player, 'in')} />}
                                {entry.status !== 'out' && <Button icon="pi pi-times" text size="small" severity="secondary" aria-label={t('Take out')} title={t('Take out')} loading={busy === `entry-${entry.player}`} onClick={() => answerFor(entry.player, 'out')} />}
                            </span>}
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <div className="container-fluid p-4 d-flex flex-column gap-4">
            <Panel header={tournament.name} icons={<span className="d-inline-flex align-items-center gap-2"><BetaTag /><Tag value={status.label} severity={status.severity} /></span>}>
                <div className="d-flex flex-column gap-3">
                    {tournament.description && <p className="text-subtle m-0 text-break" style={{ whiteSpace: 'pre-line', maxWidth: '70ch' }}>{tournament.description}</p>}
                    <dl className="d-flex flex-wrap column-gap-5 row-gap-2 m-0">
                        <div><dt className="text-faint fs-8 fw-normal">{t('Registration until')}</dt><dd className="text-default fw-semibold m-0">{formatDateTime(tournament.closesAt)}</dd></div>
                        <div><dt className="text-faint fs-8 fw-normal">{t('Players')}</dt><dd className="text-default fw-semibold m-0">{tournament.counts.in} / {tournament.maxPlayers}</dd></div>
                        {playing[0]?.date && <div><dt className="text-faint fs-8 fw-normal">{t('First round')}</dt><dd className="text-default fw-semibold m-0">{formatDate(playing[0].date)}</dd></div>}
                        {isClubAdmin && !drawn && <div><dt className="text-faint fs-8 fw-normal">{t('Invited')}</dt><dd className="text-default fw-semibold m-0">{INVITE_WORDS[tournament.invite ?? 'mail'].label}</dd></div>}
                        {tournament.status === 'finished' && <div><dt className="text-faint fs-8 fw-normal">{t('Winner')}</dt><dd className="text-default fw-semibold m-0">{nameOf(tournament, tournament.winner)}<FaTrophy className="ms-1 text-gold" aria-hidden="true" /></dd></div>}
                    </dl>

                    {registration && tournament.me &&
                        <div className="tournament-answer">
                            <span className="text-default fs-7">
                                {tournament.me.status === 'in' ? t('You are in.') : tournament.me.status === 'out' ? t('You are out of this one.') : t('Will you play?')}
                            </span>
                            <span className="d-flex flex-wrap gap-2">
                                {tournament.me.status !== 'in' && <Button label={t('I\'m in')} icon="pi pi-check" size="small" loading={busy === 'answer'} onClick={() => answer('in')} />}
                                {tournament.me.status !== 'out' && <Button label={t('Not this time')} icon="pi pi-times" size="small" severity="secondary" outlined loading={busy === 'answer'} onClick={() => answer('out')} />}
                            </span>
                        </div>}
                    {tournament.status === 'finished' &&
                        <div className="tournament-champion">
                            <i className="pi pi-trophy" aria-hidden="true" />
                            <span>{t('{{name}} wins {{tournament}}!', { name: nameOf(tournament, tournament.winner), tournament: tournament.name })}</span>
                        </div>}

                    {isClubAdmin && !over &&
                        <div className="d-flex flex-wrap gap-2 justify-content-end">
                            <Link to={`/tournaments/${tournament.id}/edit`} className="p-button p-button-sm p-button-text text-decoration-none"><i className="pi pi-pencil me-2" />{t('Change')}</Link>
                            {tournament.status === 'draft' &&
                                <Button label={t('Open the registration')} icon="pi pi-send" size="small" loading={busy === 'open'} onClick={() => confirm(t('Open the registration'), INVITE_WORDS[tournament.invite ?? 'mail'].opening, () => run('open', () => TournamentService.openRegistration(tournament.id), t('The members are invited.')))} />}
                            {registration &&
                                <Button label={t('Close the registration now')} icon="pi pi-lock" size="small" severity="secondary" loading={busy === 'close'} onClick={() => confirm(t('Close the registration now'), t('Nobody can enter after this; then you hold the draw.'), () => run('close', () => TournamentService.closeRegistration(tournament.id)))} />}
                            <Button label={t('Cancel the tournament')} icon="pi pi-ban" size="small" severity="danger" text loading={busy === 'cancel'} onClick={() => confirm(t('Cancel the tournament'), t('Everyone invited or entered hears that it is cancelled. This cannot be undone.'), () => run('cancel', () => TournamentService.cancelTournament(tournament.id)), true)} />
                        </div>}
                    {isClubAdmin && ['draft', 'cancelled'].includes(tournament.status) &&
                        <div className="d-flex justify-content-end">
                            <Button label={t('Delete')} icon="pi pi-trash" size="small" severity="danger" text loading={busy === 'delete'} onClick={() => confirm(t('Delete'), t('The tournament goes for good.'), async () => { if (await run('delete', () => TournamentService.deleteTournament(tournament.id))) navigate('/tournaments'); }, true)} />
                        </div>}
                </div>
            </Panel>

            {closed && isClubAdmin &&
                <Panel header={t('The draw')}>
                    {tournament.counts.in >= MIN_PLAYERS
                        ? (
                            <div className="d-flex flex-column gap-3">
                                <span className="text-subtle fs-7">{tn(tournament.counts.in, '{{count}} player entered.', '{{count}} players entered.')} {t('The draw places them in the bracket; with fewer players than places, the first seeds get a bye.')}</span>
                                <SelectButton
                                    value={seeding}
                                    options={[{ label: t('Seeded'), value: 'seeded' }, { label: t('At random'), value: 'random' }]}
                                    onChange={(event) => event.value && setSeeding(event.value)}
                                    className="p-selectbutton-pills"
                                />
                                <span className="text-faint fs-8">{seeding === 'seeded' ? t('The best quarter by the club rating are placed apart, so they do not meet early; the others are drawn at random.') : t('Everyone is drawn at random.')}</span>
                                <div className="d-flex justify-content-end">
                                    <Button label={t('Hold the draw')} icon="pi pi-sitemap" size="small" loading={busy === 'draw'} onClick={() => confirm(t('Hold the draw'), t('The bracket is final once drawn, and every player hears their first match.'), draw)} />
                                </div>
                            </div>
                        )
                        : (
                            <div className="d-flex flex-column gap-3">
                                <Message severity="warn" className="w-100 justify-content-start" text={t('Only {{count}} of at least {{min}} players entered. Extend the registration, enter members yourself, or cancel the tournament.', { count: tournament.counts.in, min: MIN_PLAYERS })} />
                                <div className="d-flex flex-wrap align-items-center gap-2">
                                    <Calendar value={extendTo} onChange={(event) => setExtendTo(event.value)} dateFormat={calendarFormat()} showTime hourFormat="24" showIcon icon="pi pi-calendar" minDate={new Date()} placeholder={t('New end of the registration')} />
                                    <Button label={t('Extend the registration')} icon="pi pi-calendar-plus" size="small" disabled={!extendTo} loading={busy === 'reopen'} onClick={() => run('reopen', () => TournamentService.reopenRegistration(tournament.id, extendTo), t('The registration is open again.'))} />
                                </div>
                            </div>
                        )}
                </Panel>}

            {drawn &&
                <Panel header={t('Bracket')}>
                    <div className={revealing ? 'bracket-reveal' : ''}>
                        <TournamentBracket tournament={tournament} onSelect={setSelected} />
                    </div>
                    <p className="text-faint fs-8 mt-3 mb-0">{t('Tap a match to start it, follow it or see its statistics. The winner goes on by itself.')}</p>
                </Panel>}

            {(registration || closed) &&
                <Panel header={t('Players')}>
                    <div className="tournament-entry-columns">
                        <EntryList list={entries.in} title={t('Entered')} empty={t('Nobody yet.')} />
                        <EntryList list={entries.invited} title={t('No answer yet')} empty={t('Everyone answered.')} />
                        <EntryList list={entries.out} title={t('Not this time')} empty={t('Nobody declined.')} />
                    </div>
                    {isClubAdmin && notAsked.length > 0 &&
                        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                            <Dropdown
                                value={null}
                                options={notAsked.map(member => ({ label: member.nickname, value: member.id }))}
                                onChange={(event) => answerFor(event.value, 'in')}
                                placeholder={t('Enter a member who joined later')}
                                filter
                            />
                        </div>}
                </Panel>}

            <Panel header={t('Rounds')}>
                <ol className="list-unstyled m-0 d-flex flex-column gap-2">
                    {(drawn ? playing : tournament.rounds).map(round => (
                        <li key={round.size} className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 tournament-schedule-row">
                            <span className="text-default fw-semibold fs-7">{roundName(round.size)}</span>
                            <span className="text-subtle fs-7">{round.date ? formatDateTime(round.date) : t('Day open')}</span>
                            <span className="text-faint fs-8 flex-grow-1 text-md-end">{rulesText(round.rules)}</span>
                        </li>
                    ))}
                </ol>
                {!drawn && <p className="text-faint fs-8 mt-3 mb-0">{t('With fewer players the first rounds are left out at the draw.')}</p>}
            </Panel>

            <p className="m-0"><Link to="/tournaments">{t('All tournaments')}</Link></p>
            <MatchDialog tournament={tournament} match={selected && tournament.matches.find(match => match.id === selected.id)} isAdmin={isClubAdmin} onHide={() => setSelected(null)} onStart={start} onResult={decide} busy={busy} />
            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default TournamentPage;
