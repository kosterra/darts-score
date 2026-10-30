import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHourglassHalf, FaListOl, FaPeopleGroup, FaSitemap } from 'react-icons/fa6';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import CalendarService from '../../services/calendar.service';
import { useAuth } from '../../utils/auth.context';
import { locale, t } from '../../utils/i18n';
import { MAX_CLUB_NIGHTS, NOTE_MAX, REASON_MAX, addDays, dayKey, monthGrid, nightsError } from '../../rules/calendar';
import { roundName } from '../tournaments/tournament.words';
import { Lines } from '../elements/skeletons';
import CalendarMonth from './calendar.month';
import TimeField from '../elements/time.field';

const WEEKS = 8;
// the view chosen last on this device: the coming weeks as a list, or a month
const VIEW_KEY = 'darts-score.calendarView';
const storedView = () => {
    try {
        return localStorage.getItem(VIEW_KEY) === 'month' ? 'month' : 'list';
    } catch {
        return 'list';
    }
};

// the name of a weekday (0 Sunday) in the language of the app; 4 January 2026 was a Sunday
const weekdayName = (weekday, style = 'long') => new Intl.DateTimeFormat(locale(), { weekday: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 4 + weekday)));
// a day "YYYY-MM-DD" as a date at noon UTC, to name it without time zones
const noonOf = (day) => new Date(`${day}T12:00:00Z`);
const monthName = (day) => new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(noonOf(day));
const timeOf = (date) => new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
const hours = (night) => (night.end ? `${night.start}–${night.end}` : night.start);
// Monday first
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

// a tournament or league day: what it is, with its icon
const eventWords = (event) => ({
    registrationEnds: { icon: FaHourglassHalf, what: t('Registration ends') },
    tournamentRound: { icon: FaSitemap, what: roundName(event.round) },
    matchday: { icon: FaListOl, what: event.planned ? t('Matchday {{day}} (planned)', { day: event.day }) : t('Matchday {{day}}', { day: event.day }) },
})[event.type];

/**
 * A club night in the list: when, whether it is cancelled, and who comes;
 * the member answers, the admins cancel it or take that back.
 */
const ClubNight = ({ night, canAnswer, isAdmin, busy, onAnswer, onCancel, onRestore, past = false }) => {
    const [open, setOpen] = useState(false);
    const others = night.notComingCount;
    return (
        <div className={`calendar-item is-night ${night.cancelled ? 'is-cancelled' : ''}`}>
            <span className="calendar-item-icon" aria-hidden="true"><FaPeopleGroup /></span>
            <div className="calendar-item-body">
                <div className="calendar-item-head">
                    <span className="calendar-item-title">{t('Club night')}</span>
                    <span className="d-flex align-items-center gap-1">
                        <span className="calendar-item-time">{hours(night)}</span>
                        {isAdmin && !past && (night.cancelled
                            ? <Button icon="pi pi-replay" text rounded size="small" className="calendar-item-action" aria-label={t('Takes place after all')} title={t('Takes place after all')} loading={busy === `restore-${night.day}`} onClick={() => onRestore(night)} />
                            : <Button icon="pi pi-ban" text rounded size="small" severity="danger" className="calendar-item-action" aria-label={t('Cancel this club night')} title={t('Cancel this club night')} onClick={() => onCancel(night)} />)}
                    </span>
                </div>
                {night.note && <span className="text-subtle fs-8">{night.note}</span>}
                {night.cancelled
                    ? (
                        <span className="d-flex flex-wrap align-items-center gap-2">
                            <Tag value={t('Cancelled')} severity="danger" />
                            {night.cancelled.reason && <span className="text-subtle fs-8">{night.cancelled.reason}</span>}
                        </span>
                    )
                    : (
                        <>
                            {canAnswer && !past &&
                                <SelectButton
                                    value={night.me}
                                    options={[{ label: t('I\'m coming'), value: 'yes' }, { label: t('Not this time'), value: 'no' }]}
                                    onChange={(event) => onAnswer(night, event.value ?? null)}
                                    className="p-selectbutton-pills pills-inline flex-wrap"
                                    disabled={busy === `answer-${night.day}`}
                                    aria-label={t('Are you coming?')}
                                />}
                            <button type="button" className="calendar-coming" onClick={() => setOpen(!open)} aria-expanded={open} disabled={!night.coming.length && !(isAdmin && night.notComing.length)}>
                                {night.coming.length ? t('{{count}} coming', { count: night.coming.length }) : t('Nobody said yet')}
                                {others > 0 && <span className="text-faint">{` · ${t('{{count}} not coming', { count: others })}`}</span>}
                                {(night.coming.length > 0 || (isAdmin && night.notComing.length > 0)) && <i className={`pi pi-chevron-${open ? 'up' : 'down'} ms-1`} aria-hidden="true" />}
                            </button>
                            {open &&
                                <div className="d-flex flex-column gap-1">
                                    {night.coming.length > 0 && <span className="text-default fs-8">{night.coming.map(entry => entry.nickname).join(', ')}</span>}
                                    {isAdmin && night.notComing.length > 0 && <span className="text-faint fs-8">{t('Not coming: {{names}}', { names: night.notComing.map(entry => entry.nickname).join(', ') })}</span>}
                                </div>}
                        </>
                    )}
                {/* tonight: the club evening; a past night: its table */}
                {!night.cancelled && (night.day === dayKey(new Date()) || past) &&
                    <Link to={`/club-night/${night.day}`} className={`p-button p-button-sm text-decoration-none align-self-start ${past ? 'p-button-secondary p-button-text' : ''}`}>
                        <i className={`pi ${past ? 'pi-list' : 'pi-users'} me-2`} aria-hidden="true" />{past ? t('Table of the night') : t('Club evening')}
                    </Link>}
            </div>
        </div>
    );
};

// a tournament or league day in the list, to its page
const EventItem = ({ event }) => {
    const words = eventWords(event);
    const Icon = words.icon;
    return (
        <Link to={event.link} className="calendar-item is-event">
            <span className="calendar-item-icon" aria-hidden="true"><Icon /></span>
            <span className="calendar-item-body">
                <span className="calendar-item-head">
                    <span className="calendar-item-title text-truncate">{event.name}</span>
                    <span className="calendar-item-time">{timeOf(event.at)}</span>
                </span>
                <span className="text-subtle fs-8">{words.what}</span>
            </span>
        </Link>
    );
};

// the weekly club nights: as they are, or for the admins to change
const NightsEditor = ({ nights, onSave, busy }) => {
    const [rows, setRows] = useState(nights);
    useEffect(() => setRows(nights), [nights]);
    const set = (index, changes) => setRows(rows.map((row, at) => (at === index ? { ...row, ...changes } : row)));
    const free = WEEKDAYS.find(weekday => !rows.some(row => row.weekday === weekday));
    const problem = nightsError(rows);
    const changed = JSON.stringify(rows) !== JSON.stringify(nights);
    return (
        <div className="d-flex flex-column gap-3">
            {rows.length === 0 && <span className="text-faint fs-7">{t('No club nights yet. Add the evenings the club meets every week.')}</span>}
            {/* each night as a box of a setup (as the X01 setup and the tournament editor have them): its day as the title, the fields under it */}
            {rows.map((row, index) => (
                <div key={index} className="setup-box calendar-night-box">
                    <p className="setting-title d-flex align-items-center justify-content-between gap-2 m-0">
                        <span className="flex-grow-1 text-center">{weekdayName(row.weekday)}</span>
                        <Button icon="pi pi-trash" text rounded severity="secondary" size="small" className="calendar-night-remove" aria-label={t('Remove')} title={t('Remove')} onClick={() => setRows(rows.filter((_, at) => at !== index))} />
                    </p>
                    <div className="setting-body setup-box-body">
                        <Dropdown value={row.weekday} options={WEEKDAYS.map(weekday => ({ label: weekdayName(weekday), value: weekday, disabled: weekday !== row.weekday && rows.some(other => other.weekday === weekday) }))} onChange={(event) => set(index, { weekday: event.value })} aria-label={t('Day')} />
                        <span className="d-flex align-items-center justify-content-center gap-2 w-100">
                            <TimeField value={row.start} onChange={(start) => set(index, { start })} ariaLabel={t('From')} className="calendar-time" />
                            <span className="text-faint">–</span>
                            <TimeField value={row.end ?? ''} onChange={(end) => set(index, { end })} ariaLabel={t('Until')} placeholder={t('Open end')} clearable className="calendar-time" />
                        </span>
                        <InputText value={row.note ?? ''} onChange={(event) => set(index, { note: event.target.value })} maxLength={NOTE_MAX} placeholder={t('Note, e.g. the place')} aria-label={t('Note')} className="calendar-note" />
                    </div>
                </div>
            ))}
            <div className="d-flex flex-wrap justify-content-between gap-2">
                <Button label={t('Add a club night')} icon="pi pi-plus" size="small" text disabled={rows.length >= MAX_CLUB_NIGHTS || free === undefined} onClick={() => setRows([...rows, { weekday: free, start: '19:30', end: '23:00', note: '' }])} />
                <Button label={t('Save')} icon="pi pi-save" size="small" disabled={!changed || Boolean(problem)} loading={busy === 'nights'} onClick={() => onSave(rows)} />
            </div>
            {problem && rows.length > 0 && <span className="text-subtle fs-8">{t(problem)}</span>}
        </div>
    );
};

// the feed for the calendar app of the phone: the address, to add or copy, and a new one
const Subscribe = ({ toast }) => {
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const load = (action) => {
        setBusy(true);
        action().then(data => setUrl(data.url)).catch(err => toast.current?.show({ severity: 'error', summary: t('Calendar'), detail: err.message, life: 5000 })).finally(() => setBusy(false));
    };
    const webcal = url.replace(/^https?:/, 'webcal:');
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.current?.show({ severity: 'success', summary: t('Calendar'), detail: t('The link is copied.'), life: 3000 });
        } catch {
            toast.current?.show({ severity: 'warn', summary: t('Calendar'), detail: t('Copy the link from the field.'), life: 4000 });
        }
    };
    return (
        <div className="d-flex flex-column gap-3">
            <span className="text-subtle fs-7">{t('The club nights, tournaments and leagues of all your clubs in the calendar of your phone or computer, kept up to date by itself.')}</span>
            {!url && <Button label={t('Show my calendar link')} icon="pi pi-calendar" size="small" className="align-self-start" loading={busy} onClick={() => load(CalendarService.feedLink)} />}
            {url &&
                <>
                    <div className="d-flex flex-wrap gap-2">
                        <a href={webcal} className="p-button p-button-sm text-decoration-none"><i className="pi pi-calendar-plus me-2" aria-hidden="true" />{t('Add to my calendar')}</a>
                        <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer" className="p-button p-button-sm p-button-secondary text-decoration-none"><i className="pi pi-google me-2" aria-hidden="true" />{t('Google Calendar')}</a>
                    </div>
                    <div className="p-inputgroup">
                        <InputText value={url} readOnly onFocus={(event) => event.target.select()} aria-label={t('Calendar link')} />
                        <Button icon="pi pi-copy" severity="secondary" aria-label={t('Copy')} title={t('Copy')} onClick={copy} />
                    </div>
                    <span className="text-faint fs-8">{t('Calendar apps look for changes every few hours. Keep the link to yourself: whoever has it sees the calendar. If it got out, make a new one; the old one then stops working.')}</span>
                    <Button label={t('Make a new link')} icon="pi pi-refresh" size="small" text severity="secondary" className="align-self-start" loading={busy}
                        onClick={() => confirmDialog({
                            header: t('Make a new link'), message: t('The calendars that use the old link stop updating; add the new one there.'), icon: 'pi pi-question-circle',
                            acceptLabel: t('Make a new link'), rejectLabel: t('Cancel'), acceptClassName: 'p-button-sm', rejectClassName: 'p-button-secondary p-button-sm',
                            accept: () => load(CalendarService.renewFeedLink),
                        })} />
                </>}
        </div>
    );
};

/**
 * The calendar of the club: the coming weeks day by day, with the club
 * nights (who comes, and those cancelled) and the days of its tournaments
 * and leagues; the weekly club nights, set by the admins; and the link for
 * the calendar of the phone.
 */
const CalendarPage = () => {
    const { isClubAdmin } = useAuth();
    const toast = useRef(null);
    const today = useMemo(() => dayKey(new Date()), []);
    const [weeks, setWeeks] = useState(WEEKS);
    const [calendar, setCalendar] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [cancelling, setCancelling] = useState(null);
    const [reason, setReason] = useState('');
    const [view, setView] = useState(storedView);
    const [month, setMonth] = useState(today.slice(0, 7));
    const [selected, setSelected] = useState(today);

    const to = addDays(today, weeks * 7 - 1);
    // the days the view shows: the coming weeks, or the weeks of the month
    const grid = monthGrid(month);
    const range = useMemo(() => (view === 'month' ? { from: grid.from, to: grid.to } : { from: today, to }), [view, grid.from, grid.to, today, to]);
    const load = useCallback(() => CalendarService.loadCalendar(range.from, range.to).then(setCalendar).catch(err => setError(err.message)), [range]);
    useEffect(() => { load(); }, [load]);
    const chooseView = (value) => {
        setView(value);
        try {
            localStorage.setItem(VIEW_KEY, value);
        } catch {
            // without storage the list opens next time
        }
    };

    const run = async (key, action, done) => {
        setBusy(key);
        try {
            const result = await action();
            if (result?.clubNights) setCalendar(result);
            if (done) toast.current?.show({ severity: 'success', summary: t('Calendar'), detail: done, life: 3000 });
            return result;
        } catch (err) {
            toast.current?.show({ severity: 'error', summary: t('Calendar'), detail: err.message, life: 5000 });
            return null;
        } finally {
            setBusy('');
        }
    };

    // everything shown, by day
    const byDay = useMemo(() => {
        const map = new Map();
        if (!calendar) return map;
        const items = [
            ...calendar.clubNights.map(night => ({ key: `night-${night.day}`, day: night.day, sort: night.start, night })),
            ...calendar.events.map(event => ({ key: event.id, day: dayKey(event.at), sort: timeOf(event.at), event })),
        ].sort((a, b) => a.day.localeCompare(b.day) || a.sort.localeCompare(b.sort));
        for (const item of items) map.set(item.day, [...(map.get(item.day) ?? []), item]);
        return map;
    }, [calendar]);

    // the days with something on, month by month
    const months = useMemo(() => {
        if (!calendar) return [];
        const items = [
            ...calendar.clubNights.map(night => ({ key: `night-${night.day}`, day: night.day, sort: night.start, night })),
            ...calendar.events.map(event => ({ key: event.id, day: dayKey(event.at), sort: timeOf(event.at), event })),
        ].filter(item => item.day >= today && item.day <= to).sort((a, b) => a.day.localeCompare(b.day) || a.sort.localeCompare(b.sort));
        const byMonth = [];
        for (const item of items) {
            const month = item.day.slice(0, 7);
            let entry = byMonth.at(-1);
            if (entry?.month !== month) byMonth.push(entry = { month, days: [] });
            let day = entry.days.at(-1);
            if (day?.day !== item.day) entry.days.push(day = { day: item.day, items: [] });
            day.items.push(item);
        }
        return byMonth;
    }, [calendar, today, to]);

    if (!calendar) return <div className="container-fluid p-4">{error ? <Message severity="error" text={error} /> : <Lines count={8} />}</div>;

    const answer = (night, value) => run(`answer-${night.day}`, () => CalendarService.answer(night.day, value, range));
    const cancel = async () => {
        if (await run(`cancel-${cancelling.day}`, () => CalendarService.cancelNight(cancelling.day, reason.trim(), range), t('The members are told.'))) setCancelling(null);
    };
    const canAnswer = Boolean(calendar.myPlayer);
    // a club night or a tournament or league day; past: no more answers or changes
    const renderItem = (item, past) => (item.night
        ? <ClubNight key={item.key} night={item.night} past={past} canAnswer={canAnswer} isAdmin={isClubAdmin} busy={busy} onAnswer={answer} onCancel={(night) => { setReason(''); setCancelling(night); }} onRestore={(night) => run(`restore-${night.day}`, () => CalendarService.restoreNight(night.day, range), t('The members are told.'))} />
        : <EventItem key={item.key} event={item.event} />);

    return (
        <div className="container-fluid p-4">
            <div className="calendar-columns">
                <Panel header={t('Calendar')} icons={
                    <SelectButton
                        value={view}
                        options={[{ label: t('List'), value: 'list' }, { label: t('Month'), value: 'month' }]}
                        onChange={(event) => event.value && chooseView(event.value)}
                        className="p-selectbutton-pills pills-inline"
                        aria-label={t('View')}
                    />
                }>
                    {view === 'month'
                        ? (
                            <div className="d-flex flex-column gap-3">
                                <CalendarMonth month={month} byDay={byDay} today={today} selected={selected} onSelect={setSelected} onMonth={(next) => { setMonth(next); setSelected(next === today.slice(0, 7) ? today : `${next}-01`); }} eventName={(event) => `${event.name} · ${eventWords(event).what}`} />
                                <section className="d-flex flex-column gap-2" aria-live="polite">
                                    <h3 className="calendar-month">{new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(noonOf(selected))}</h3>
                                    {(byDay.get(selected) ?? []).length
                                        ? <div className="calendar-day-items">{byDay.get(selected).map(item => renderItem(item, selected < today))}</div>
                                        : <span className="text-faint fs-7">{t('Nothing on this day.')}</span>}
                                </section>
                            </div>
                        )
                        : (
                            <>
                                {months.length === 0 &&
                                    <p className="text-faint fs-7 m-0">{isClubAdmin ? t('Nothing in the coming weeks. Add the club nights, and tournaments and leagues with dates show here by themselves.') : t('Nothing in the coming weeks.')}</p>}
                                <div className="d-flex flex-column gap-4">
                                    {months.map(entry => (
                                        <section key={entry.month} className="d-flex flex-column gap-2">
                                            <h3 className="calendar-month">{monthName(`${entry.month}-01`)}</h3>
                                            {entry.days.map(day => (
                                                <div key={day.day} className={`calendar-day ${day.day === today ? 'is-today' : ''}`}>
                                                    <span className="calendar-date">
                                                        <span className="calendar-date-weekday">{day.day === today ? t('Today') : weekdayName(noonOf(day.day).getUTCDay(), 'short')}</span>
                                                        <span className="calendar-date-number">{Number(day.day.slice(8))}</span>
                                                    </span>
                                                    <div className="calendar-day-items">{day.items.map(item => renderItem(item, false))}</div>
                                                </div>
                                            ))}
                                        </section>
                                    ))}
                                </div>
                                {weeks < 26 && <Button label={t('Show more weeks')} icon="pi pi-angle-down" size="small" text className="mt-3" onClick={() => setWeeks(Math.min(26, weeks + WEEKS))} />}
                            </>
                        )}
                </Panel>

                <div className="d-flex flex-column gap-4">
                    <Panel header={t('Club nights')}>
                        {isClubAdmin
                            ? <NightsEditor nights={calendar.nights} busy={busy} onSave={(nights) => run('nights', () => CalendarService.saveNights(nights, range), t('The club nights are saved.'))} />
                            : calendar.nights.length
                                ? (
                                    <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                                        {calendar.nights.map(night => (
                                            <li key={night.weekday} className="d-flex flex-column">
                                                <span className="text-default fw-semibold fs-7">{t('Every {{weekday}}, {{hours}}', { weekday: weekdayName(night.weekday), hours: hours(night) })}</span>
                                                {night.note && <span className="text-subtle fs-8">{night.note}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                )
                                : <span className="text-faint fs-7">{t('The club has no weekly club nights in the app.')}</span>}
                    </Panel>
                    <Panel header={t('In your calendar app')}>
                        <Subscribe toast={toast} />
                    </Panel>
                </div>
            </div>

            <Dialog header={cancelling ? t('Cancel the club night of {{date}}', { date: new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(noonOf(cancelling.day)) }) : ''} visible={Boolean(cancelling)} onHide={() => setCancelling(null)} className="tournament-dialog" dismissableMask>
                <div className="d-flex flex-column gap-3">
                    <span className="text-subtle fs-7">{t('Every member hears of it, in the app and (as each chose) by mail.')}</span>
                    <label className="d-flex flex-column gap-1" htmlFor="calendar-reason">
                        <span className="text-subtle fs-8">{t('Reason (optional)')}</span>
                        <InputText id="calendar-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={REASON_MAX} placeholder={t('e.g. The room is taken')} />
                    </label>
                    <div className="d-flex justify-content-end gap-2">
                        <Button label={t('Back')} size="small" text onClick={() => setCancelling(null)} />
                        <Button label={t('Cancel the club night')} icon="pi pi-ban" size="small" severity="danger" loading={Boolean(cancelling) && busy === `cancel-${cancelling.day}`} onClick={cancel} />
                    </div>
                </div>
            </Dialog>
            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default CalendarPage;
