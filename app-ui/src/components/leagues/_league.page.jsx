import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaTrophy } from 'react-icons/fa';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import LeagueService from '../../services/league.service';
import { useAuth } from '../../utils/auth.context';
import { calendarFormat, formatDate, formatDateTime } from '../../utils/dates';
import { t } from '../../utils/i18n';
import { dueOf, leagueTable } from '../../rules/leagues';
import { isDecided } from '../../rules/tournaments';
import { MatchCard } from '../tournaments/tournament.bracket';
import { rulesText } from '../tournaments/tournament.words';
import WalkOn from '../tournaments/tournament.walkon';
import { LEAGUE_STATUS_WORDS, asTournament, leagueName } from './league.words';
import { Lines } from '../elements/skeletons';
import DateTimeField from '../elements/date.time.field';

// the table of the league: points (2 a win), then leg difference, legs won, the match between them
const LeagueTable = ({ league }) => {
    const table = leagueTable(league.players, league.matches);
    return (
        <table className="tournament-group-table league-table">
            <thead>
                <tr>
                    <th aria-label={t('Place')} />
                    <th className="text-start">{t('Player')}</th>
                    <th title={t('Played')}>{t('P')}</th>
                    <th title={t('Won')}>{t('W')}</th>
                    <th title={t('Lost')}>{t('L')}</th>
                    <th title={t('Leg difference')}>{t('+/−')}</th>
                    <th title={t('Points')}>{t('Pts')}</th>
                </tr>
            </thead>
            <tbody>
                {table.map((row, index) => {
                    const difference = row.legsFor - row.legsAgainst;
                    return (
                        <tr key={row.player} className={`${index === 0 && row.played > 0 ? 'goes-on' : ''} ${row.player === league.myPlayer ? 'is-mine' : ''}`}>
                            <td className="tournament-group-place">{index + 1}</td>
                            <td className="text-start text-truncate tournament-group-player">{leagueName(league, row.player)}</td>
                            <td>{row.played}</td>
                            <td>{row.won}</td>
                            <td>{row.lost}</td>
                            <td>{difference > 0 ? `+${difference}` : difference}</td>
                            <td className="fw-bold">{row.points}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

// a match card with its matchday (or the day it was moved to) below
const LeagueMatch = ({ league, match, onSelect, withDay = false }) => (
    <div className="league-match">
        <MatchCard tournament={asTournament(league)} match={match} onSelect={onSelect} />
        {(match.date || withDay) && !isDecided(match) &&
            <span className={`fs-8 ${match.date ? 'text-warning' : 'text-faint'}`}>
                {match.date ? t('Moved to {{date}}', { date: formatDate(match.date) }) : t('Matchday {{day}} · by {{date}}', { day: match.day, date: formatDate(dueOf(league, match)) })}
            </span>}
    </div>
);

/**
 * What can be done with a match of a league: start it (its players or an
 * admin), go on with or watch a running one, see the statistics of a played
 * one; the admins decide it without a game or move it to another day.
 */
const MatchDialog = ({ league, match, isAdmin, onHide, onStart, onResult, onMove, busy }) => {
    const { activeClub } = useAuth();
    const [first, setFirst] = useState(null);
    const [winner, setWinner] = useState(null);
    const [date, setDate] = useState(null);
    useEffect(() => { setFirst(match?.players?.[0] ?? null); setWinner(null); setDate(match ? new Date(dueOf(league, match)) : null); }, [match, league]);
    if (!match) return null;
    const mine = match.players.includes(league.myPlayer);
    const running = league.status === 'running';
    const canStart = running && (isAdmin || mine) && match.status === 'ready';
    const options = match.players.map(id => ({ label: leagueName(league, id), value: id }));
    const view = asTournament(league);

    return (
        <Dialog header={`${t('Matchday {{day}}', { day: match.day })} · ${options.map(option => option.label).join(' – ')}`} visible onHide={onHide} className="tournament-dialog" dismissableMask>
            <div className="d-flex flex-column gap-3">
                {['ready', 'running'].includes(match.status) && <WalkOn tournament={view} match={match} club={activeClub} />}
                <span className="text-subtle fs-7">{rulesText(league.rules)}{!isDecided(match) ? ` · ${t('by {{date}}', { date: formatDate(dueOf(league, match)) })}` : ''}</span>
                {isDecided(match) &&
                    <Message severity="success" className="w-100 justify-content-start" text={match.status === 'walkover'
                        ? t('{{name}} wins (decided by an admin).', { name: leagueName(league, match.winner) })
                        : t('{{name}} won.', { name: leagueName(league, match.winner) })} />}
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
                {running && !canStart && match.status === 'ready' && <span className="text-faint fs-8">{t('The players of the match or a club admin start it.')}</span>}
                {isAdmin && running && !isDecided(match) &&
                    <div className="d-flex flex-column gap-2 border-top pt-3">
                        <span className="text-default fw-semibold fs-7">{t('Move the match')}</span>
                        <span className="text-faint fs-8">{t('E.g. when it is postponed: it is then due on its own day; the players hear of it.')}</span>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <Calendar value={date} onChange={(event) => setDate(event.value)} dateFormat={calendarFormat()} showIcon icon="pi pi-calendar" aria-label={t('New day')} />
                            <Button label={t('Move')} icon="pi pi-calendar" size="small" severity="secondary" disabled={!date} loading={busy === 'move'} onClick={() => onMove(match, date)} />
                            {match.date && <Button label={t('Back to its matchday')} size="small" text loading={busy === 'move'} onClick={() => onMove(match, null)} />}
                        </div>
                    </div>}
                {isAdmin && running && match.status !== 'done' &&
                    <div className="d-flex flex-column gap-2 border-top pt-3 tournament-decide">
                        <span className="text-default fw-semibold fs-7">{t('Decide without a game')}</span>
                        <span className="text-faint fs-8">{t('A walkover, or a result played elsewhere. A running game no longer counts for the league.')}</span>
                        <SelectButton value={winner} options={options} onChange={(event) => setWinner(event.value)} className="p-selectbutton-pills flex-wrap" />
                        <Button label={t('Wins')} icon="pi pi-check" size="small" severity="secondary" disabled={!winner} loading={busy === 'result'} onClick={() => onResult(match, winner)} />
                    </div>}
            </div>
        </Dialog>
    );
};

// the admins move a whole matchday to another day
const MoveMatchdayDialog = ({ matchday, onHide, onMove, busy }) => {
    const [date, setDate] = useState(null);
    useEffect(() => setDate(matchday ? new Date(matchday.date) : null), [matchday]);
    if (!matchday) return null;
    return (
        <Dialog header={t('Move matchday {{day}}', { day: matchday.day })} visible onHide={onHide} className="tournament-dialog" dismissableMask>
            <div className="d-flex flex-column gap-3">
                <span className="text-faint fs-8">{t('Its matches are then due on the new day (those moved on their own keep their day). The players hear of it; the other matchdays stay.')}</span>
                <DateTimeField value={date} onChange={setDate} ariaLabel={t('New day')} />
                <div className="d-flex justify-content-end gap-2">
                    <Button label={t('Cancel')} size="small" text onClick={onHide} />
                    <Button label={t('Move')} icon="pi pi-calendar" size="small" disabled={!date} loading={busy === 'moveDay'} onClick={() => onMove(matchday, date)} />
                </div>
            </div>
        </Dialog>
    );
};

/**
 * One league: the table, the player's own open matches, and the season
 * matchday by matchday, the current one first. The admins start it, move
 * matchdays and matches, decide matches and cancel it.
 */
const LeaguePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useRef(null);
    const { isClubAdmin } = useAuth();
    const [league, setLeague] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [selected, setSelected] = useState(null);
    const [moving, setMoving] = useState(null);
    const [day, setDay] = useState(null);

    const load = useCallback(() => LeagueService.loadLeague(id).then(setLeague).catch(err => setError(err.message)), [id]);
    useEffect(() => { load(); }, [load]);
    // the table follows running matches
    useEffect(() => {
        if (league?.status !== 'running') return undefined;
        const timer = setInterval(load, 30 * 1000);
        return () => clearInterval(timer);
    }, [league?.status, load]);

    // the current matchday: the first with a match to play, else the last
    const current = useMemo(() => {
        if (!league?.matchdays?.length) return null;
        return league.matchdays.find(entry => league.matches.some(match => match.day === entry.day && !isDecided(match)))?.day ?? league.matchdays.at(-1).day;
    }, [league]);
    useEffect(() => { if (day === null && current) setDay(current); }, [current, day]);

    if (!league) return <div className="container-fluid p-4">{error ? <Message severity="error" text={error} /> : <Lines count={8} />}</div>;

    const status = LEAGUE_STATUS_WORDS[league.status];
    const running = league.status === 'running';
    const started = ['running', 'finished'].includes(league.status);
    const over = ['finished', 'cancelled'].includes(league.status);
    const played = league.matches.filter(isDecided).length;
    const matchday = league.matchdays?.find(entry => entry.day === day);
    const mine = running && league.myPlayer ? league.matches.filter(match => match.players.includes(league.myPlayer) && !isDecided(match)).sort((a, b) => new Date(dueOf(league, a)) - new Date(dueOf(league, b))) : [];

    const run = async (key, action, done) => {
        setBusy(key);
        try {
            const result = await action();
            if (result?.id) setLeague(result);
            if (done) toast.current?.show({ severity: 'success', summary: league.name, detail: done, life: 3000 });
            return result;
        } catch (err) {
            toast.current?.show({ severity: 'error', summary: league.name, detail: err.message, life: 5000 });
            return null;
        } finally {
            setBusy('');
        }
    };
    const confirm = (header, message, accept, danger = false) => confirmDialog({
        header, message, icon: danger ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
        acceptLabel: header, rejectLabel: t('Cancel'),
        acceptClassName: `${danger ? 'p-button-danger ' : ''}p-button-sm`, rejectClassName: 'p-button-secondary p-button-sm',
        accept,
    });
    const start = async (match, first) => {
        const result = await run('start', () => LeagueService.startMatch(league.id, match.id, first));
        if (result?.game) navigate(`/x01/${result.game}`);
    };
    const decide = async (match, winner) => {
        if (await run('result', () => LeagueService.setResult(league.id, match.id, winner), t('{{name}} wins.', { name: leagueName(league, winner) }))) setSelected(null);
    };
    const moveMatch = async (match, date) => {
        if (await run('move', () => LeagueService.moveMatch(league.id, match.id, date), date ? t('Now due on {{date}}', { date: formatDate(date) }) : t('Back to its matchday.'))) setSelected(null);
    };
    const moveMatchday = async (entry, date) => {
        if (await run('moveDay', () => LeagueService.moveMatchday(league.id, entry.day, date), t('Now due on {{date}}', { date: formatDate(date) }))) setMoving(null);
    };

    const days = league.matchdays ?? [];
    const dayIndex = days.findIndex(entry => entry.day === day);

    return (
        <div className="container-fluid p-4 d-flex flex-column gap-4">
            <Panel header={league.name} icons={<Tag value={status.label} severity={status.severity} />}>
                <div className="d-flex flex-column gap-3">
                    {league.description && <p className="text-subtle m-0 text-break" style={{ whiteSpace: 'pre-line', maxWidth: '70ch' }}>{league.description}</p>}
                    <dl className="hero-facts d-flex flex-wrap column-gap-5 row-gap-2 m-0">
                        <div><dt className="text-faint fs-8 fw-normal">{t('Players')}</dt><dd className="text-default fw-semibold m-0">{league.players.length}</dd></div>
                        <div><dt className="text-faint fs-8 fw-normal">{t('Everyone plays everyone')}</dt><dd className="text-default fw-semibold m-0">{league.meetings === 2 ? t('Twice') : t('Once')}</dd></div>
                        {started && <div><dt className="text-faint fs-8 fw-normal">{t('Played')}</dt><dd className="text-default fw-semibold m-0">{t('{{played}} of {{count}} matches', { played, count: league.matches.length })}</dd></div>}
                        {!started && league.firstDay && <div><dt className="text-faint fs-8 fw-normal">{t('First matchday')}</dt><dd className="text-default fw-semibold m-0">{formatDateTime(league.firstDay)}</dd></div>}
                        <div><dt className="text-faint fs-8 fw-normal">{t('Every match')}</dt><dd className="text-default fw-semibold m-0">{rulesText(league.rules)}</dd></div>
                        {league.status === 'finished' && <div><dt className="text-faint fs-8 fw-normal">{t('Winner')}</dt><dd className="text-default fw-semibold m-0">{leagueName(league, league.winner)}<FaTrophy className="ms-1 text-gold" aria-hidden="true" /></dd></div>}
                    </dl>
                    {league.status === 'finished' &&
                        <div className="tournament-champion">
                            <i className="pi pi-trophy" aria-hidden="true" />
                            <span>{t('{{name}} wins {{league}}!', { name: leagueName(league, league.winner), league: league.name })}</span>
                        </div>}

                    {isClubAdmin && !over &&
                        <div className="d-flex flex-wrap gap-2 justify-content-end">
                            <Link to={`/leagues/${league.id}/edit`} className="p-button p-button-sm p-button-text text-decoration-none"><i className="pi pi-pencil me-2" />{t('Change')}</Link>
                            {league.status === 'draft' &&
                                <Button label={t('Start the league')} icon="pi pi-play" size="small" loading={busy === 'startLeague'} onClick={() => confirm(t('Start the league'), t('The schedule is made and every player hears their first match. The players and rules then stay.'), () => run('startLeague', () => LeagueService.startLeague(league.id), t('The league has started.')))} />}
                            {running &&
                                <Button label={t('Cancel the league')} icon="pi pi-ban" size="small" severity="danger" text loading={busy === 'cancel'} onClick={() => confirm(t('Cancel the league'), t('Every player hears that it is cancelled. This cannot be undone.'), () => run('cancel', () => LeagueService.cancelLeague(league.id)), true)} />}
                        </div>}
                    {isClubAdmin && ['draft', 'cancelled'].includes(league.status) &&
                        <div className="d-flex justify-content-end">
                            <Button label={t('Delete')} icon="pi pi-trash" size="small" severity="danger" text loading={busy === 'delete'} onClick={() => confirm(t('Delete'), t('The league goes for good.'), async () => { if (await run('delete', () => LeagueService.deleteLeague(league.id))) navigate('/leagues'); }, true)} />
                        </div>}
                </div>
            </Panel>

            {league.status === 'draft' &&
                <Panel header={t('Players')}>
                    <ul className="list-unstyled m-0 tournament-entries">
                        {league.players.map(player => <li key={player}><span className="text-truncate">{leagueName(league, player)}</span></li>)}
                    </ul>
                </Panel>}

            {mine.length > 0 &&
                <Panel header={t('Your matches')}>
                    <div className="league-matches">
                        {mine.map(match => <LeagueMatch key={match.id} league={league} match={match} onSelect={setSelected} withDay />)}
                    </div>
                </Panel>}

            {(started || league.status === 'cancelled') && league.matches.length > 0 &&
                <div className="league-columns">
                    <Panel header={t('Table')}>
                        <LeagueTable league={league} />
                        <p className="text-faint fs-8 mt-3 mb-0">{t('2 points for a win; then leg difference, legs won and the match between them.')}</p>
                    </Panel>

                    <Panel header={t('Matchdays')}>
                        {matchday &&
                            <div className="d-flex flex-column gap-3">
                                <div className="league-day-nav">
                                    <Button icon="pi pi-chevron-left" text rounded size="small" aria-label={t('Earlier matchday')} disabled={dayIndex <= 0} onClick={() => setDay(days[dayIndex - 1].day)} />
                                    <span className="d-flex flex-column align-items-center text-center min-w-0">
                                        <span className="text-default fw-semibold">{t('Matchday {{day}} of {{count}}', { day: matchday.day, count: days.length })}</span>
                                        <span className="text-subtle fs-8">{formatDateTime(matchday.date)}{matchday.day === current && running ? ` · ${t('current')}` : ''}</span>
                                    </span>
                                    <Button icon="pi pi-chevron-right" text rounded size="small" aria-label={t('Later matchday')} disabled={dayIndex >= days.length - 1} onClick={() => setDay(days[dayIndex + 1].day)} />
                                </div>
                                <div className="league-matches">
                                    {league.matches.filter(match => match.day === matchday.day).sort((a, b) => a.index - b.index).map(match => <LeagueMatch key={match.id} league={league} match={match} onSelect={setSelected} />)}
                                </div>
                                {league.players.length % 2 === 1 && (() => {
                                    const resting = league.players.find(player => !league.matches.some(match => match.day === matchday.day && match.players.includes(player)));
                                    return resting ? <span className="text-faint fs-8">{t('{{name}} sits out this matchday.', { name: leagueName(league, resting) })}</span> : null;
                                })()}
                                {isClubAdmin && running &&
                                    <div className="d-flex justify-content-end">
                                        <Button label={t('Move the matchday')} icon="pi pi-calendar" size="small" text onClick={() => setMoving(matchday)} />
                                    </div>}
                            </div>}
                        <p className="text-faint fs-8 mt-3 mb-0">{t('Tap a match to start it, follow it or see its statistics. Each is played any time up to its matchday.')}</p>
                    </Panel>
                </div>}

            <p className="m-0"><Link to="/leagues">{t('All leagues')}</Link></p>
            <MatchDialog league={league} match={selected && league.matches.find(match => match.id === selected.id)} isAdmin={isClubAdmin} onHide={() => setSelected(null)} onStart={start} onResult={decide} onMove={moveMatch} busy={busy} />
            <MoveMatchdayDialog matchday={moving} onHide={() => setMoving(null)} onMove={moveMatchday} busy={busy} />
            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default LeaguePage;
