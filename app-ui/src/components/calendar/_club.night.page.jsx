import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import dayjs from 'dayjs';

import CalendarService from '../../services/calendar.service';
import PlayerService from '../../services/player.service';
import X01Service from '../../services/x01.service';
import CricketService from '../../services/cricket.service';
import EliminationService from '../../services/elimination.service';
import { useAuth } from '../../utils/auth.context';
import { locale, t } from '../../utils/i18n';
import { newQuickGame, quickSetupText } from '../../utils/quick.games';
import { choosePlayers, chosenPlayers, eveningWindow, noteNightGame } from '../../utils/club.night';
import { dayKey } from '../../rules/calendar';
import NextGame from '../evening/evening.next.game';
import { EveningAwards, EveningForm, EveningHeadToHead, EveningTable } from '../evening/evening.parts';
import GameTypeIcon from '../elements/game.type.icon';
import GameTypeTag from '../elements/game.type.tag';
import GameStatusTag from '../elements/game.status.tag';
import GamePlayers from '../dashboard/widgets/game.players';
import { Lines } from '../elements/skeletons';
import usePageTitle from '../../utils/use.page.title';

// the table follows the games played on the other boards
const REFRESH_MS = 20 * 1000;
const CREATE = {
    x01: (game) => X01Service.createX01Game(game),
    cricket: (game) => CricketService.createCricketGame(game),
    elimination: (game) => EliminationService.createEliminationGame(game),
};
const noonOf = (day) => new Date(`${day}T12:00:00Z`);

/**
 * The club evening of a club night: the members who said they come (others
 * added by hand), the next game among them, which is a club game that counts
 * for the club, and tonight's table, awards, who beat whom, the form and all
 * games, from the club games played that night among these players.
 */
const ClubNightPage = () => {
    const { day } = useParams();
    const navigate = useNavigate();
    const toast = useRef(null);
    const { activeClub } = useAuth();
    const [night, setNight] = useState(null);
    const [members, setMembers] = useState([]);
    const [players, setPlayers] = useState(null);
    const [evening, setEvening] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const today = dayKey(new Date());
    const tonight = day === today;
    usePageTitle(t('Club evening'));

    // the night, and who plays: as chosen on this device, else those who said they come
    useEffect(() => {
        CalendarService.loadCalendar(day, day).then(calendar => {
            const found = calendar.clubNights.find(entry => entry.day === day);
            if (!found) {
                setError(t('There is no club night on that day.'));
                return;
            }
            setNight(found);
            setPlayers(chosenPlayers(activeClub?.id, day) ?? found.coming.map(entry => entry.player));
        }).catch(err => setError(err.message));
        PlayerService.searchPlayers('').then(list => setMembers(list.filter(member => !member.guest))).catch(() => setMembers([]));
    }, [day, activeClub?.id]);

    const span = useMemo(() => (night ? eveningWindow(day, night.start) : null), [day, night]);
    const load = useCallback(() => {
        if (!span || !players) return Promise.resolve();
        if (!players.length) {
            setEvening({ players: [], games: [], report: { table: [], awards: [], headToHead: {}, form: {}, played: 0, running: 0 } });
            return Promise.resolve();
        }
        return CalendarService.loadEvening(day, span.from, span.to, players).then(setEvening).catch(err => setError(err.message));
    }, [day, span, players]);
    useEffect(() => {
        load();
        if (!tonight) return undefined;
        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load, tonight]);

    if (error) return <div className="container-fluid p-4"><Message severity="warn" text={error} /></div>;
    if (!night || !players || !evening) return <div className="container-fluid p-4"><Lines count={8} /></div>;

    const setChosen = (ids) => {
        setPlayers(ids);
        choosePlayers(activeClub?.id, day, ids);
    };
    const nameOf = (playerId) => evening.players.find(player => player.id === playerId)?.name ?? members.find(member => member.id === playerId)?.nickname ?? '?';
    const notPlaying = members.filter(member => !players.includes(member.id));
    const names = new Map(evening.players.map(player => [player.id, { nickname: player.name }]));
    const report = evening.report;
    const title = new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(noonOf(day));
    const formatOf = (game) => (game.kind === 'x01' ? quickSetupText('x01', game.setup) : quickSetupText(game.kind, game.setup).split(' · ').slice(1).join(' · '));

    // the next game: a club game among the chosen, back here after it
    const start = async (settings, chosen) => {
        setBusy(true);
        try {
            // eslint-disable-next-line no-unused-vars
            const { quickPlayers, ...game } = newQuickGame(settings.kind, settings, chosen);
            const created = await CREATE[settings.kind](game);
            noteNightGame(created.id, day);
            navigate(`/${settings.kind}/${created.id}`);
        } catch (err) {
            toast.current?.show({ severity: 'error', summary: t('Start the game'), detail: err.message, life: 5000 });
            setBusy(false);
        }
    };

    const gameEntry = (game) => (
        <li key={game.id} className={`timeline-entry ${game.running ? 'timeline-running' : ''}`}>
            <span className="timeline-time text-faint fs-8">{dayjs(game.createdAt).format('HH:mm')}</span>
            <GameTypeIcon type={game.kind} />
            <div className="timeline-body">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <GameTypeTag type={game.kind} />
                    <span className="text-faint fs-8">{formatOf(game)}</span>
                    <GameStatusTag running={game.running} />
                </div>
                <GamePlayers game={{ type: game.kind, players: game.results ?? game.players.map(player => ({ player, isWinner: player === game.winner })) }} players={names} withSets={false} />
            </div>
            <div className="row-actions">
                {game.running
                    ? <Button type="button" icon="pi pi-play" aria-label={t('Continue this game')} title={t('Continue playing')} onClick={() => navigate(`/${game.kind}/${game.id}`)} />
                    : <Button type="button" icon="pi pi-chart-bar" severity="secondary" aria-label={t('Statistics of this game')} title={t('Show statistics')} onClick={() => navigate(`/stats/games/${game.kind}/${game.id}`)} />}
            </div>
        </li>
    );

    return (
        <div className="container-fluid p-4">
            <Toast ref={toast} position="bottom-right" />
            <div className="evening-page d-flex flex-column gap-4">
                <header className="dashboard-header hero-header rounded-2 p-4 d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div className="d-flex flex-column gap-1 min-w-0">
                        <h1 className="fs-2 fw-semibold text-default m-0 text-break">{t('Club evening')}</h1>
                        <span className="text-subtle text-capitalize-first">{title}{' · '}{night.end ? `${night.start}–${night.end}` : night.start}{night.note ? ` · ${night.note}` : ''}</span>
                        <span className="evening-header-players">{evening.players.map(player => player.name).join(' · ') || t('Nobody chosen yet')}</span>
                    </div>
                    <Link to="/calendar" className="p-button p-button-sm p-button-secondary text-decoration-none"><i className="pi pi-calendar me-2" aria-hidden="true" />{t('Calendar')}</Link>
                </header>
                {night.cancelled && <Message severity="warn" className="w-100 justify-content-start" text={t('This club night is cancelled.')} />}

                <Panel header={t('Players tonight')}>
                    <span className="text-faint fs-8 d-block mb-3">{t('Those who said they come; add others who came anyway. Only games among these players count for tonight.')}</span>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        {players.map(id => (
                            <span key={id} className="club-night-chip">
                                {nameOf(id)}
                                <button type="button" aria-label={t('Take {{name}} out of tonight', { name: nameOf(id) })} title={t('Take out')} onClick={() => setChosen(players.filter(entry => entry !== id))}><i className="pi pi-times" aria-hidden="true" /></button>
                            </span>
                        ))}
                        {notPlaying.length > 0 &&
                            <Dropdown value={null} options={notPlaying.map(member => ({ label: member.nickname, value: member.id }))} onChange={(event) => setChosen([...players, event.value])} placeholder={t('Add a member')} filter className="club-night-add" />}
                    </div>
                </Panel>

                {tonight && evening.players.length >= 2 && !night.cancelled &&
                    <Panel header={t('Next game')}>
                        <NextGame evening={{ id: `club-${activeClub?.id}-${day}`, players: evening.players, games: evening.games }} onStart={start} busy={busy} />
                        <span className="text-faint fs-8 d-block mt-3">{t('A club game: it counts for the statistics, badges and levels of the club.')}</span>
                    </Panel>}

                <Panel header={t('Table of the evening')}>
                    {report.played === 0
                        ? <span className="text-faint fs-7">{tonight ? t('The table fills with the first game.') : t('No game among these players that night.')}</span>
                        : <EveningTable report={report} players={evening.players} />}
                </Panel>

                {report.awards.length > 0 &&
                    <Panel header={t('Awards of the evening')}>
                        <EveningAwards report={report} nameOf={nameOf} />
                    </Panel>}

                {report.played >= 2 &&
                    <div className="row g-4">
                        <div className="col-12 col-xl-6">
                            <Panel header={t('Who beat whom')} className="h-100">
                                <EveningHeadToHead report={report} players={evening.players} />
                            </Panel>
                        </div>
                        {Object.values(report.form).some(values => values.length) &&
                            <div className="col-12 col-xl-6">
                                <Panel header={t('Form: X01 average game by game')} className="h-100">
                                    <EveningForm report={report} players={evening.players} />
                                </Panel>
                            </div>}
                    </div>}

                {evening.games.length > 0 &&
                    <Panel header={t('All games')}>
                        <ol className="timeline list-unstyled m-0">{evening.games.map(gameEntry)}</ol>
                    </Panel>}
            </div>
        </div>
    );
};

export default ClubNightPage;
