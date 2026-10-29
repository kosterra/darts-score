import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';

import LeagueService from '../../services/league.service';
import PlayerService from '../../services/player.service';
import { useAuth } from '../../utils/auth.context';
import { formatDate } from '../../utils/dates';
import { t, tn } from '../../utils/i18n';
import { EVERY_DAYS, MAX_LEAGUE_PLAYERS, MEETINGS, leagueSetupError, matchdayCount, matchdayDates } from '../../rules/leagues';
import { rulesError } from '../../rules/tournaments';
import { RoundRules } from '../tournaments/tournament.editor';
import { rulesText } from '../tournaments/tournament.words';
import { Lines } from '../elements/skeletons';
import DateTimeField from '../elements/date.time.field';

// a match of a club league: 501 double out, best of 5 legs
const DEFAULT_RULES = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 5 };

// the first matchday: a week from today, in the evening
const defaultFirst = () => {
    const day = new Date();
    day.setDate(day.getDate() + 7);
    day.setHours(19, 30, 0, 0);
    return day;
};

/**
 * Setting up a league, or changing it (club admins): its name, the members
 * who play, whether they meet once or twice, the first matchday and how
 * often one follows, and the rules of every match. Saved as a draft, or
 * started at once with the whole schedule. Once it runs only the name and
 * the description change; the dates are moved on the league's page.
 */
const LeagueEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isClubAdmin } = useAuth();
    const [stored, setStored] = useState(null);
    const [form, setForm] = useState(null);
    const [members, setMembers] = useState([]);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');

    useEffect(() => {
        if (isClubAdmin) PlayerService.searchPlayers('').then(list => setMembers(list.filter(member => !member.guest))).catch(() => setMembers([]));
        if (!id) {
            setForm({ name: '', description: '', players: [], meetings: 1, everyDays: 7, firstDay: defaultFirst(), rules: DEFAULT_RULES });
            return;
        }
        LeagueService.loadLeague(id).then(loaded => {
            setStored(loaded);
            setForm({ name: loaded.name, description: loaded.description ?? '', players: loaded.players, meetings: loaded.meetings, everyDays: loaded.everyDays, firstDay: loaded.firstDay ? new Date(loaded.firstDay) : defaultFirst(), rules: loaded.rules ?? DEFAULT_RULES });
        }).catch(err => setError(err.message));
    }, [id, isClubAdmin]);

    if (!isClubAdmin) return <div className="container-fluid p-4"><Message severity="warn" text={t('Only club admins can set up leagues.')} /></div>;
    if (!form) return <div className="container-fluid p-4">{error ? <Message severity="error" text={error} /> : <Lines count={6} />}</div>;

    const draft = !stored || stored.status === 'draft';
    const set = (changes) => setForm(current => ({ ...current, ...changes }));
    const problem = draft ? leagueSetupError({ players: form.players, meetings: form.meetings, rules: form.rules, first: form.firstDay, everyDays: form.everyDays }) : null;
    const days = form.players.length >= 2 ? matchdayCount(form.players.length, form.meetings) : 0;
    const last = days ? matchdayDates(form.firstDay, form.everyDays, days)[days - 1] : null;
    const matchesEach = (form.players.length - 1) * form.meetings;

    const save = async (start) => {
        setError('');
        setBusy(start ? 'start' : 'save');
        const setup = draft
            ? { name: form.name, description: form.description, players: form.players, meetings: form.meetings, everyDays: form.everyDays, firstDay: form.firstDay, rules: form.rules }
            : { name: form.name, description: form.description };
        try {
            let saved;
            if (!stored) saved = await LeagueService.createLeague({ ...setup, start });
            else {
                saved = await LeagueService.updateLeague(stored.id, setup);
                if (start && saved.status === 'draft') saved = await LeagueService.startLeague(stored.id);
            }
            navigate(`/leagues/${saved.id}`);
        } catch (err) {
            setError(err.message);
            setBusy('');
        }
    };

    return (
        <div className="container-fluid p-4">
            <Panel header={stored ? t('Change the league') : t('New league')} className="page-narrow">
                <div className="d-flex flex-column gap-3">
                    <label className="d-flex flex-column gap-1" htmlFor="league-name">
                        <span className="fs-7 text-default fw-semibold">{t('Name')}</span>
                        <InputText id="league-name" value={form.name} onChange={(event) => set({ name: event.target.value })} maxLength={80} placeholder={t('e.g. Winter League')} />
                    </label>
                    <label className="d-flex flex-column gap-1" htmlFor="league-description">
                        <span className="fs-7 text-default fw-semibold">{t('Description')}</span>
                        <InputTextarea id="league-description" value={form.description} onChange={(event) => set({ description: event.target.value })} maxLength={1000} rows={3} autoResize placeholder={t('Optional: where you play, prizes, anything the players should know')} />
                    </label>

                    {draft && <>
                        <div className="d-flex flex-column gap-1">
                            <span className="fs-7 text-default fw-semibold">{t('Players')}</span>
                            <MultiSelect
                                value={form.players}
                                options={members.map(member => ({ label: member.nickname, value: member.id }))}
                                onChange={(event) => set({ players: event.value })}
                                placeholder={t('Choose the members who play')}
                                filter
                                display="chip"
                                selectionLimit={MAX_LEAGUE_PLAYERS}
                                className="w-100 league-players"
                                aria-label={t('Players')}
                            />
                            <span className="text-faint fs-8">{t('From 3 to 20 members of the club.')}</span>
                        </div>

                        <div className="d-flex flex-column gap-1">
                            <span className="fs-7 text-default fw-semibold">{t('Everyone plays everyone')}</span>
                            <SelectButton value={form.meetings} options={MEETINGS.map(count => ({ label: count === 1 ? t('Once') : t('Twice'), value: count }))} onChange={(event) => event.value && set({ meetings: event.value })} className="p-selectbutton-pills" aria-label={t('Everyone plays everyone')} />
                            <span className="text-faint fs-8">{form.meetings === 2 ? t('A second time in the second half of the season, the other one throwing first.') : t('One match against each of the others.')}</span>
                        </div>

                        <div className="d-flex flex-column gap-1">
                            <span className="fs-7 text-default fw-semibold">{t('First matchday')}</span>
                            <DateTimeField value={form.firstDay} onChange={(value) => value && set({ firstDay: value })} minDate={new Date()} />
                        </div>

                        <div className="d-flex flex-column gap-1">
                            <span className="fs-7 text-default fw-semibold">{t('A matchday')}</span>
                            <SelectButton value={form.everyDays} options={EVERY_DAYS.map(count => ({ label: count === 7 ? t('Every week') : t('Every two weeks'), value: count }))} onChange={(event) => event.value && set({ everyDays: event.value })} className="p-selectbutton-pills" aria-label={t('A matchday')} />
                            <span className="text-faint fs-8">{t('A match is played any time up to its matchday. Once the league runs, you can move a matchday or a single match on its page.')}</span>
                        </div>

                        <div className="d-flex flex-column gap-2 tournament-round">
                            <div className="d-flex align-items-center gap-3">
                                <span className="tournament-round-name">{t('Every match')}</span>
                                <span className="text-default fs-7 flex-grow-1 min-w-0">{rulesText(form.rules)}</span>
                                <Button label={rulesOpen ? t('Done') : t('Change')} size="small" text onClick={() => setRulesOpen(!rulesOpen)} />
                            </div>
                            {rulesOpen && <RoundRules rules={form.rules} onChange={(rules) => set({ rules })} />}
                            {rulesError(form.rules) && <span className="text-danger fs-8">{t(rulesError(form.rules))}</span>}
                        </div>

                        {form.players.length >= 3 &&
                            <span className="text-default fs-7 league-plan">
                                {t('{{players}} players: {{matches}} matches each, on {{days}} matchdays from {{first}} to {{last}}.', { players: form.players.length, matches: matchesEach, days, first: formatDate(form.firstDay), last: formatDate(last) })}
                                {form.players.length % 2 === 1 && ` ${t('With an odd number, one player sits out each matchday.')}`}
                            </span>}
                    </>}
                    {!draft && <span className="text-faint fs-8">{t('The league runs: the players, the rules and the schedule stay. Move matchdays and matches on its page.')}</span>}

                    {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                    {problem && form.players.length > 0 && <span className="text-subtle fs-8">{t(problem)}</span>}
                    <div className="d-flex flex-wrap justify-content-end gap-2">
                        <Link to={stored ? `/leagues/${stored.id}` : '/leagues'} className="p-button p-button-text p-button-sm text-decoration-none">{t('Cancel')}</Link>
                        {draft
                            ? <>
                                <Button label={t('Save as draft')} icon="pi pi-save" size="small" severity="secondary" loading={busy === 'save'} disabled={!form.name.trim() || Boolean(problem) || Boolean(busy)} onClick={() => save(false)} />
                                <Button label={t('Start the league')} icon="pi pi-play" size="small" loading={busy === 'start'} disabled={!form.name.trim() || Boolean(problem) || Boolean(busy)} onClick={() => save(true)} />
                            </>
                            : <Button label={t('Save')} icon="pi pi-save" size="small" loading={busy === 'save'} disabled={!form.name.trim() || Boolean(busy)} onClick={() => save(false)} />}
                    </div>
                    {draft && <span className="text-faint fs-8 text-end">{tn(days, 'Starting makes the schedule and tells every player their first match.', 'Starting makes the schedule of {{count}} matchdays and tells every player their first match.')}</span>}
                </div>
            </Panel>
        </div>
    );
};

export default LeagueEditor;
