import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';
import dayjs from 'dayjs';

import CalendarService from '../../services/calendar.service';
import PlayerService from '../../services/player.service';
import X01Service from '../../services/x01.service';
import CricketService from '../../services/cricket.service';
import EliminationService from '../../services/elimination.service';
import { useAuth } from '../../utils/auth.context';
import { locale, t } from '../../utils/i18n';
import { QUICK_DEFAULTS, QUICK_GAMES, QUICK_LEGS, QUICK_SCORES, QUICK_VARIANTS, newQuickGame, quickSetupText } from '../../utils/quick.games';
import { cameAfter, camePlayers, chooseCame, chooseGone, choosePlayers, chosenPlayers, eveningWindow, gonePlayers, noteNightGame } from '../../utils/club.night';
import NextGame from '../evening/evening.next.game';
import { EveningAwards, EveningForm, EveningHeadToHead, EveningTable, TableOrder } from '../evening/evening.parts';
import GameTypeIcon from '../elements/game.type.icon';
import GameTypeTag from '../elements/game.type.tag';
import GameStatusTag from '../elements/game.status.tag';
import GamePlayers from '../dashboard/widgets/game.players';
import { Lines } from '../elements/skeletons';
import usePageTitle from '../../utils/use.page.title';
import PlayerOption from '../elements/player.option';
import usePlayerLevels from '../../utils/use.player.levels';
import useAutoSave from '../../utils/use.auto.save';
import { playPath } from '../../utils/game.paths';
import BoardService from '../../services/board.service';
import { MAX_BOARDS } from '../../rules/boards';
import BoardsPanel from '../boards/boards.panel';
import MyMatch from '../boards/my.match';
import SaveStatus from '../elements/save.status';
import SettingSwitch from '../elements/setting.switch';
import SetupBox from '../elements/setup.box';
import { dayKeyIn, timeIn, zoneOf } from '../../rules/zones';

// the table follows the games played on the other boards; more often while the player's own match is on a board
const REFRESH_MS = 20 * 1000;
const MY_BOARD_MS = 15 * 1000;
// who went home on a night on boards, as the page keeps it: { [id]: when }
const goneOf = (night) => Object.fromEntries((night.left ?? []).map(entry => [entry.id, entry.at]));
// who came later (added once the night was set up), as the server keeps it: { [id]: when }
const cameOf = (night) => Object.fromEntries((night.came ?? []).map(entry => [entry.id, entry.at]));
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
    const { activeClub, isClubAdmin } = useAuth();
    const [night, setNight] = useState(null);
    const [members, setMembers] = useState([]);
    const levels = usePlayerLevels();
    const [players, setPlayers] = useState(null);
    // who went home ({ [id]: when }): no longer in the next game, their games keep counting
    const [gone, setGone] = useState({});
    // who was added later ({ [id]: when }): "came at" on the chip and in the table
    const [came, setCame] = useState({});
    const [evening, setEvening] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    // the night on boards (null: not played on boards), and what the admin chose last (shown at once)
    const [boardNight, setBoardNight] = useState(null);
    const [boardChoice, setBoardChoice] = useState({});
    const boardPatch = useRef({});
    // the admin's changes to the boards so far, and how many of them a save has answered: a
    // refresh in between does not undo what is still on its way
    const boardEdits = useRef(0);
    const boardAnswered = useRef(0);
    const [boardBusy, setBoardBusy] = useState('');
    // the table by wins (as always), or by win rate when some played much less
    const [order, setOrder] = useState('wins');
    // today on the club's clock, the clock of its club nights
    const today = dayKeyIn(new Date(), zoneOf(activeClub));
    const tonight = day === today;
    // the boards of the night, saved as you go: the changes chosen since the last save sent together
    const boardSave = useAutoSave(async () => {
        const changes = boardPatch.current;
        boardPatch.current = {};
        const sent = boardEdits.current;
        try {
            const result = await BoardService.saveNight(day, changes);
            setBoardNight(result);
            // the players chosen are the night's now, on every device (unless chosen again meanwhile)
            if (boardEdits.current === sent) {
                if (result?.players) setPlayers(result.players.map(player => player.id));
                if (result?.left) setGone(goneOf(result));
                if (result?.came) setCame(cameOf(result));
            }
        } finally {
            boardAnswered.current = Math.max(boardAnswered.current, sent);
        }
    });
    const chooseBoards = (changes, options = { now: true }) => {
        boardEdits.current += 1;
        boardPatch.current = { ...boardPatch.current, ...changes };
        setBoardChoice(current => ({ ...current, ...changes }));
        boardSave.change({ ...boardPatch.current }, options);
    };
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
            setGone(gonePlayers(activeClub?.id, day));
            setCame(camePlayers(activeClub?.id, day));
        }).catch(err => setError(err.message));
        PlayerService.searchPlayers('').then(list => setMembers(list.filter(member => !member.guest))).catch(() => setMembers([]));
    }, [day, activeClub?.id]);

    const span = useMemo(() => (night ? eveningWindow(day, night.start, zoneOf(activeClub)) : null), [day, night, activeClub]);
    const loadBoards = useCallback(() => {
        const asked = boardEdits.current;
        return BoardService.loadNight(day).then(found => {
            setBoardNight(found);
            // what the admin chose and is not saved yet stays as chosen
            const changed = boardEdits.current !== asked || boardAnswered.current < boardEdits.current;
            if (found?.players?.length && !changed) {
                setPlayers(found.players.map(player => player.id));
                setGone(goneOf(found));
                setCame(cameOf(found));
            }
        }).catch(() => {});
    }, [day]);
    useEffect(() => { loadBoards(); }, [loadBoards]);
    const myBoard = boardNight?.entries?.find(entry => entry.board && ['called', 'playing'].includes(entry.status) && entry.players.includes(boardNight.myPlayer)) ?? null;
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
        const timer = setInterval(() => { load(); loadBoards(); }, myBoard ? MY_BOARD_MS : REFRESH_MS);
        return () => clearInterval(timer);
    }, [load, loadBoards, tonight, myBoard]);

    if (error) return <div className="container-fluid p-4"><Message severity="warn" text={error} /></div>;
    if (!night || !players || !evening) return <div className="container-fluid p-4"><Lines count={8} /></div>;

    const setChosen = (ids) => {
        // a player added tonight came later (on boards the server notes it for everyone)
        if (tonight) {
            const next = cameAfter(came, players, ids);
            setCame(next);
            chooseCame(activeClub?.id, day, next);
        }
        setPlayers(ids);
        choosePlayers(activeClub?.id, day, ids);
        // on boards the players are the night's: who is taken out leaves the queue
        if (boardNight && isClubAdmin) chooseBoards({ players: ids });
    };
    // someone went home (left) or is back: kept on this device, on boards the night's for everyone
    const goHome = (id, left) => {
        const next = { ...gone };
        if (left) next[id] = new Date().toISOString();
        else delete next[id];
        setGone(next);
        chooseGone(activeClub?.id, day, next);
        if (boardNight && isClubAdmin) chooseBoards({ gone: Object.keys(next) });
    };
    // on boards the players and who went home are the night's: only the admins change them, the others see them
    const canChoose = isClubAdmin || !boardNight?.players?.length;
    const here = evening.players.filter(player => !gone[player.id]);
    // the players of the table, with when they came later or went home
    const tablePlayers = evening.players.map(player => ({ ...player, joinedAt: came[player.id] ?? null, leftAt: gone[player.id] ?? null }));
    const clockOf = (at) => timeIn(at, zoneOf(activeClub));
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

    // the boards of the night: on, how many, and the game played on them
    const boardCount = boardChoice.count ?? boardNight?.boards?.count ?? 0;
    const onBoards = boardCount > 0;
    const setup = { ...QUICK_DEFAULTS, ...(boardNight?.setup ?? {}), ...(boardChoice.setup ?? {}) };
    const chooseSetup = (changes) => chooseBoards({ setup: { ...setup, ...changes } });
    const switchBoards = (on) => chooseBoards(on ? { count: boardNight?.boards?.count || activeClub?.boards || 2, players } : { count: 0 });
    const boardView = boardNight?.boardView;
    const playerOf = (playerId) => boardNight?.players?.find(player => player.id === playerId) ?? members.find(member => member.id === playerId);
    const entryOf = (key) => {
        const entry = boardNight?.entries?.find(item => item.id === key);
        return entry ? { key, players: entry.players, status: entry.status, detail: null, game: entry.game } : null;
    };
    const boardRun = async (key, action) => {
        setBoardBusy(key);
        try {
            const result = await action();
            if (result?.entries) setBoardNight(result);
            return result;
        } catch (err) {
            toast.current?.show({ severity: 'error', summary: t('Boards'), detail: err.message, life: 5000 });
            return null;
        } finally {
            setBoardBusy('');
        }
    };
    const startEntry = async (key) => {
        const result = await boardRun(`start-${key}`, () => BoardService.startEntry(day, key));
        if (result?.game) {
            noteNightGame(result.game.id, day);
            navigate(playPath(result.game.kind, result.game.id));
        }
    };
    const takeOut = (number, out) => boardRun(`out-${number}`, () => BoardService.saveNight(day, {
        out: out ? [...boardView.out, number] : boardView.out.filter(entry => entry !== number),
    }));
    const upcoming = day >= today && !night.cancelled;

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
            <ConfirmDialog />
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
                    <span className="text-faint fs-8 d-block mb-3">{t('Those who said they come; add others who came anyway. Only games among these players count for tonight: who goes home keeps theirs, who is taken out does not.')}</span>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        {players.map(id => (
                            <span key={id} className={`club-night-chip evening-player-chip ${gone[id] ? 'is-gone' : ''}`}>
                                <span className="d-flex flex-column">
                                    <span>{nameOf(id)}</span>
                                    {gone[id]
                                        ? <span className="evening-player-note">{t('went home at {{time}}', { time: clockOf(gone[id]) })}</span>
                                        : came[id] && <span className="evening-player-note">{t('came at {{time}}', { time: clockOf(came[id]) })}</span>}
                                </span>
                                {tonight && canChoose && (gone[id]
                                    ? <button type="button" aria-label={t('{{name}} is back', { name: nameOf(id) })} title={t('Back')} onClick={() => goHome(id, false)}><i className="pi pi-replay" aria-hidden="true" /></button>
                                    : <button type="button" aria-label={t('{{name}} went home', { name: nameOf(id) })} title={t('Gone home')} onClick={() => goHome(id, true)}><i className="pi pi-sign-out" aria-hidden="true" /></button>)}
                                {canChoose && <button type="button" aria-label={t('Take {{name}} out of tonight', { name: nameOf(id) })} title={t('Take out')} onClick={() => setChosen(players.filter(entry => entry !== id))}><i className="pi pi-times" aria-hidden="true" /></button>}
                            </span>
                        ))}
                        {canChoose && notPlaying.length > 0 &&
                            <Dropdown value={null} options={notPlaying.map(member => ({ label: member.nickname, value: member.id, player: member }))} itemTemplate={(option) => <PlayerOption player={option.player} level={levels[option.value]} />} onChange={(event) => setChosen([...players, event.value])} placeholder={t('Add a member')} filter className="club-night-add" />}
                    </div>
                </Panel>

                {isClubAdmin && upcoming &&
                    <Panel header={t('Boards tonight')} icons={<SaveStatus {...boardSave} />}>
                        <div className="d-flex flex-column gap-3">
                            <SettingSwitch id="night-boards" title={t('Play on boards')} hint={t('The pairings are called to a free board, and the players see on their phone where they play and against whom.')} checked={onBoards} onChange={switchBoards} />
                            {onBoards &&
                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <SetupBox title={t('Boards')} hint={t('As many games are played at a time.')}>
                                            <InputNumber value={boardCount} onValueChange={(event) => event.value && event.value !== boardCount && chooseBoards({ count: event.value }, { now: false })} onBlur={boardSave.flush} min={1} max={MAX_BOARDS} showButtons buttonLayout="horizontal" decrementButtonIcon="pi pi-minus" incrementButtonIcon="pi pi-plus" inputClassName="text-center" aria-label={t('Boards')} inputId="night-board-count" />
                                        </SetupBox>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <SetupBox title={t('Game')} hint={quickSetupText(setup.kind, setup)}>
                                            <SelectButton value={setup.kind} options={QUICK_GAMES} onChange={(event) => event.value && chooseSetup({ kind: event.value })} className="p-selectbutton-pills pills-inline flex-wrap" aria-label={t('Game')} />
                                            {setup.kind === 'x01' &&
                                                <>
                                                    <SelectButton value={setup.startingScore} options={QUICK_SCORES} onChange={(event) => event.value && chooseSetup({ startingScore: event.value })} className="p-selectbutton-pills pills-inline" aria-label={t('Starting score')} />
                                                    <SelectButton value={setup.numberOfLegs} options={QUICK_LEGS} onChange={(event) => event.value && chooseSetup({ numberOfLegs: event.value })} className="p-selectbutton-pills pills-inline flex-wrap" aria-label={t('Legs')} />
                                                </>}
                                            {setup.kind === 'cricket' &&
                                                <SelectButton value={setup.variant} options={QUICK_VARIANTS} onChange={(event) => event.value && chooseSetup({ variant: event.value })} className="p-selectbutton-pills pills-inline" aria-label={t('Variant')} />}
                                        </SetupBox>
                                    </div>
                                </div>}
                        </div>
                    </Panel>}

                {myBoard && onBoards &&
                    <MyMatch
                        match={{ board: myBoard.board, status: myBoard.status, opponent: playerOf(myBoard.players.find(player => player !== boardNight.myPlayer))?.nickname ?? '?', detail: t('Club night'), game: myBoard.game }}
                        onStart={() => startEntry(myBoard.id)}
                        busy={boardBusy === `start-${myBoard.id}`}
                    />}

                {onBoards && boardView &&
                    <BoardsPanel
                        view={boardView}
                        itemOf={entryOf}
                        playerOf={playerOf}
                        myPlayer={boardNight.myPlayer}
                        canRun={Boolean(boardNight.canRun)}
                        canStart={(item) => Boolean(boardNight.canRun) || item.players.includes(boardNight.myPlayer)}
                        onStart={(item) => startEntry(item.key)}
                        onOut={takeOut}
                        onMove={(key, board) => boardRun(key, () => BoardService.changeEntry(day, key, { board }))}
                        onHold={(key, held) => boardRun(key, () => BoardService.changeEntry(day, key, { held }))}
                        onCancel={(key) => boardRun(key, () => BoardService.changeEntry(day, key, { status: 'cancelled' }))}
                        screen={{ create: () => BoardService.nightScreen(day), send: (code) => BoardService.sendNightScreen(day, code) }}
                        busy={boardBusy}
                        hint={t('Who played least goes next, against someone new; a finished game frees its board at once.')}
                    />}

                {tonight && here.length >= 2 && !night.cancelled && !onBoards &&
                    <Panel header={t('Next game')}>
                        <NextGame evening={{ id: `club-${activeClub?.id}-${day}`, players: here, games: evening.games }} onStart={start} busy={busy} />
                        <span className="text-faint fs-8 d-block mt-3">{t('A club game: it counts for the statistics, badges and levels of the club.')}</span>
                    </Panel>}

                <Panel header={t('Table of the evening')} icons={report.played > 0 && <TableOrder value={order} onChange={setOrder} />}>
                    {report.played === 0
                        ? <span className="text-faint fs-7">{tonight ? t('The table fills with the first game.') : t('No game among these players that night.')}</span>
                        : <EveningTable report={report} players={tablePlayers} order={order} zone={zoneOf(activeClub)} />}
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
