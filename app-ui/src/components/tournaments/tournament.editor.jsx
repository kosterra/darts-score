import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';

import TournamentService from '../../services/tournament.service';
import ClubService from '../../services/club.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { GROUP_ROUND, INVITE_CHANNELS, MAX_PLAYERS_CHOICES, PRESETS, STARTING_SCORES, cleanRules, isDecided, maxLegs, presetById, presetRules, roundSizes, rulesError } from '../../rules/tournaments';
import { INVITE_WORDS, PRESET_WORDS, roundName, rulesText } from './tournament.words';
import { Lines } from '../elements/skeletons';
import SetsLegsConfigOptions from '../game_config/config_options/sets.legs.config.options';
import DateTimeField from '../elements/date.time.field';
import SetupBox from '../elements/setup.box';

// the numbers a mode offers, as in the setup of an X01 game: Best of only odd ones (an even one could
// end in a draw), First to any; the one set keeps its place when it is not among them
const COUNTS = {
    legs: { 'Best of': SetsLegsConfigOptions.boLegsNumberOptions.values, 'First to': SetsLegsConfigOptions.ftLegsNumberOptions.values },
    sets: { 'Best of': SetsLegsConfigOptions.boSetsNumberOptions.values, 'First to': SetsLegsConfigOptions.ftSetsNumberOptions.values },
};
const countsOf = (kind, mode, value) => {
    const list = COUNTS[kind][mode] ?? COUNTS[kind]['First to'];
    return list.some(option => option.value === value) || (mode === 'Best of' && value % 2 === 0) ? list : [...list, { name: String(value), value }].sort((a, b) => a.value - b.value);
};
// a mode chosen: the number kept if it fits, else the next one that does (Best of 4 becomes Best of 5)
const fitCount = (kind, mode, value) => {
    const list = COUNTS[kind][mode] ?? COUNTS[kind]['First to'];
    if (list.some(option => option.value === value)) return value;
    return (list.find(option => option.value >= value) ?? list[list.length - 1]).value;
};

const MODES = ['Best of', 'First to'];
const IN_MODES = ['Straight In', 'Double In', 'Master In'];
const OUT_MODES = ['Straight Out', 'Double Out', 'Master Out'];
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// a week from now at 20:00, when nothing is chosen yet
const defaultCloses = () => {
    const at = new Date(Date.now() + 7 * DAY);
    at.setHours(20, 0, 0, 0);
    return at;
};

// the rules of a preset for a round; the group stage is played like the first round of the bracket
const rulesOf = (presetId, size, maxPlayers) => presetRules(presetById(presetId), size === GROUP_ROUND ? maxPlayers : size);

// the rounds of a tournament, keeping the days and rules already chosen, the preset's rules for new
// ones; with groups first the group stage is the first round
const roundsFor = (maxPlayers, presetId, current = [], format = 'knockout') => [...(format === 'groups' ? [GROUP_ROUND] : []), ...roundSizes(maxPlayers)].map(size => {
    const known = current.find(round => round.size === size);
    return known ?? { size, date: null, rules: rulesOf(presetId, size, maxPlayers) };
});

const FORMAT_WORDS = {
    knockout: { label: t('Knockout'), hint: t('Every match decides: the winner goes on, the loser is out.') },
    groups: { label: t('Groups, then knockout'), hint: t('Everyone first plays everyone of their group; the best of each group go on to the knockout rounds. How large the groups are and how many go on is chosen at the draw, when it is known how many entered.') },
};

/**
 * The rules of one round: the starting score, in and out, and legs (or sets
 * of legs) as best of or first to.
 */
export const RoundRules = ({ rules, onChange, disabled }) => {
    const set = (changes) => onChange({ ...rules, ...changes });
    const inSets = rules.numberOfSets > 1;
    return (
        <div className="tournament-rules">
            <label className="d-flex flex-column gap-1">
                <span className="text-subtle fs-8">{t('Starting score')}</span>
                <Dropdown value={rules.startingScore} options={STARTING_SCORES} onChange={(event) => set({ startingScore: event.value })} disabled={disabled} />
            </label>
            <label className="d-flex flex-column gap-1">
                <span className="text-subtle fs-8">{t('In')}</span>
                <Dropdown value={rules.legInMode} options={IN_MODES.map(mode => ({ label: t(mode), value: mode }))} onChange={(event) => set({ legInMode: event.value })} disabled={disabled} />
            </label>
            <label className="d-flex flex-column gap-1">
                <span className="text-subtle fs-8">{t('Out')}</span>
                <Dropdown value={rules.legOutMode} options={OUT_MODES.map(mode => ({ label: t(mode), value: mode }))} onChange={(event) => set({ legOutMode: event.value })} disabled={disabled} />
            </label>
            <div className="d-flex flex-column gap-1 tournament-rules-wide">
                <span className="text-subtle fs-8">{t('Played in')}</span>
                <SelectButton
                    value={inSets ? 'sets' : 'legs'}
                    options={[{ label: t('Legs'), value: 'legs' }, { label: t('Sets'), value: 'sets' }]}
                    onChange={(event) => event.value && set(event.value === 'sets' ? { numberOfSets: 3, setMode: 'Best of', legMode: 'Best of', numberOfLegs: 5 } : { numberOfSets: 1, setMode: 'Best of' })}
                    className="p-selectbutton-pills"
                    disabled={disabled}
                />
            </div>
            {inSets &&
                <div className="d-flex align-items-end gap-2 tournament-rules-wide">
                    <label className="d-flex flex-column gap-1">
                        <span className="text-subtle fs-8">{t('Sets')}</span>
                        <Dropdown value={rules.setMode} options={MODES.map(mode => ({ label: t(mode), value: mode }))} onChange={(event) => set({ setMode: event.value, numberOfSets: fitCount('sets', event.value, rules.numberOfSets) })} disabled={disabled} />
                    </label>
                    <Dropdown value={rules.numberOfSets} options={countsOf('sets', rules.setMode, rules.numberOfSets)} optionLabel="name" optionValue="value" onChange={(event) => set({ numberOfSets: event.value })} disabled={disabled} aria-label={t('Number of sets')} />
                </div>}
            <div className="d-flex align-items-end gap-2 tournament-rules-wide">
                <label className="d-flex flex-column gap-1">
                    <span className="text-subtle fs-8">{inSets ? t('Legs per set') : t('Legs')}</span>
                    <Dropdown value={rules.legMode} options={MODES.map(mode => ({ label: t(mode), value: mode }))} onChange={(event) => set({ legMode: event.value, numberOfLegs: fitCount('legs', event.value, rules.numberOfLegs) })} disabled={disabled} />
                </label>
                <Dropdown value={rules.numberOfLegs} options={countsOf('legs', rules.legMode, rules.numberOfLegs)} optionLabel="name" optionValue="value" onChange={(event) => set({ numberOfLegs: event.value })} disabled={disabled} aria-label={t('Number of legs')} />
            </div>
        </div>
    );
};

/**
 * Setting up a tournament, or changing it (club admins): its name, how many
 * can play, a format to start from, until when the members can enter, and
 * each round with its day and rules. Saved as a draft, or with the
 * registration opened at once (every member is invited).
 */
const TournamentEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isClubAdmin, activeClub } = useAuth();
    const [stored, setStored] = useState(null);
    const [form, setForm] = useState(null);
    const [openRound, setOpenRound] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    // the clubs this club is connected with, to invite into a shared tournament
    const [connected, setConnected] = useState([]);

    useEffect(() => {
        if (!id) {
            setForm({ name: '', description: '', format: 'knockout', maxPlayers: 16, preset: 'clubClassic', closesAt: defaultCloses(), invite: 'mail', invitedClubs: [], rounds: roundsFor(16, 'clubClassic') });
            return;
        }
        TournamentService.loadTournament(id).then(loaded => {
            setStored(loaded);
            setForm({
                name: loaded.name, description: loaded.description ?? '', format: loaded.format ?? 'knockout', maxPlayers: loaded.maxPlayers, preset: loaded.preset ?? null,
                closesAt: new Date(loaded.closesAt),
                invite: loaded.invite ?? 'mail',
                invitedClubs: (loaded.invitedClubs ?? []).map(String),
                rounds: loaded.rounds.map(round => ({ ...round, date: round.date ? new Date(round.date) : null })),
            });
        }).catch(err => setError(err.message));
    }, [id]);

    // the accepted connections of the active club, for the "play with" picker
    useEffect(() => {
        if (!activeClub?.id) return;
        ClubService.loadConnections(activeClub.id)
            .then(links => setConnected(links.filter(link => link.status === 'accepted').map(link => ({ id: link.club, name: link.clubName }))))
            .catch(() => setConnected([]));
    }, [activeClub?.id]);

    // the rounds with a match started or decided keep their day and rules
    const played = useMemo(() => new Set((stored?.matches ?? []).filter(match => match.status === 'running' || (isDecided(match) && !match.bye)).map(match => match.size)), [stored]);

    if (!isClubAdmin) return <div className="container-fluid p-4"><Message severity="warn" text={t('Only club admins can set up tournaments.')} /></div>;
    if (!form) return <div className="container-fluid p-4">{error ? <Message severity="error" text={error} /> : <Lines count={6} />}</div>;

    const early = !stored || ['draft', 'registration'].includes(stored.status);
    const set = (changes) => setForm(current => ({ ...current, ...changes }));
    const setRound = (size, changes) => set({ rounds: form.rounds.map(round => (round.size === size ? { ...round, ...changes } : round)) });
    const choosePreset = (presetId) => set({ preset: presetId, rounds: form.rounds.map(round => (played.has(round.size) ? round : { ...round, rules: rulesOf(presetId, round.size, form.maxPlayers) })) });
    const chooseSize = (maxPlayers) => set({ maxPlayers, rounds: roundsFor(maxPlayers, form.preset, form.rounds, form.format) });
    const chooseFormat = (format) => set({ format, rounds: roundsFor(form.maxPlayers, form.preset, form.rounds, format) });
    // one round a week, the first a week after the registration ends
    const weekly = () => {
        const first = new Date(form.closesAt.getTime() + 7 * DAY);
        first.setHours(12, 0, 0, 0);
        set({ rounds: form.rounds.map((round, index) => (played.has(round.size) ? round : { ...round, date: new Date(first.getTime() + index * 7 * DAY) })) });
    };
    // a tournament of one evening: the rounds an hour apart, from the first round's day (or the day after the registration)
    const oneEvening = () => {
        const firstRound = form.rounds.find(round => !played.has(round.size) && round.date)?.date;
        const first = new Date(firstRound ?? form.closesAt.getTime() + DAY);
        first.setHours(19, 0, 0, 0);
        let next = 0;
        set({ rounds: form.rounds.map(round => (played.has(round.size) ? round : { ...round, date: new Date(first.getTime() + (next++) * HOUR) })) });
    };
    // rules of their own: the format is no longer a preset once a round differs from it
    const changeRules = (size, rules) => setForm(current => {
        const rounds = current.rounds.map(round => (round.size === size ? { ...round, rules } : round));
        const preset = presetById(current.preset);
        const same = (a, b) => JSON.stringify(cleanRules(a)) === JSON.stringify(cleanRules(b));
        return { ...current, rounds, preset: preset && rounds.every(round => same(round.rules, rulesOf(current.preset, round.size, current.maxPlayers))) ? current.preset : null };
    });
    const problems = form.rounds.map(round => rulesError(round.rules)).filter(Boolean);

    const save = async (open) => {
        setError('');
        setBusy(open ? 'open' : 'save');
        const setup = { name: form.name, description: form.description, format: form.format, maxPlayers: form.maxPlayers, preset: form.preset, closesAt: form.closesAt, invite: form.invite, invitedClubs: form.invitedClubs ?? [], rounds: form.rounds };
        try {
            let saved;
            if (!stored) saved = await TournamentService.createTournament({ ...setup, open });
            else {
                saved = await TournamentService.updateTournament(stored.id, setup);
                if (open && saved.status === 'draft') saved = await TournamentService.openRegistration(stored.id);
            }
            navigate(`/tournaments/${saved.id}`);
        } catch (err) {
            setError(err.message);
            setBusy('');
        }
    };

    return (
        <div className="container-fluid p-4">
            <Panel header={stored ? t('Change the tournament') : t('New tournament')} className="page-narrow">
                <div className="d-flex flex-column gap-3">
                    <div className="row g-3">
                        <div className="col-12">
                            <SetupBox title={t('Name')}>
                                <InputText id="tournament-name" value={form.name} onChange={(event) => set({ name: event.target.value })} maxLength={80} placeholder={t('e.g. Autumn Cup')} aria-label={t('Name')} />
                            </SetupBox>
                        </div>
                        <div className="col-12">
                            <SetupBox title={t('Description')}>
                                <InputTextarea id="tournament-description" value={form.description} onChange={(event) => set({ description: event.target.value })} maxLength={1000} rows={3} autoResize placeholder={t('Optional: where you play, prizes, anything the players should know')} aria-label={t('Description')} />
                            </SetupBox>
                        </div>
                        <div className="col-12 col-md-6">
                            <SetupBox title={t('Tournament type')} hint={FORMAT_WORDS[form.format].hint}>
                                <SelectButton
                                    value={form.format}
                                    options={['knockout', 'groups'].map(format => ({ label: FORMAT_WORDS[format].label, value: format }))}
                                    onChange={(event) => event.value && chooseFormat(event.value)}
                                    className="p-selectbutton-pills pills-inline flex-wrap"
                                    disabled={!early}
                                    aria-label={t('Tournament type')}
                                />
                            </SetupBox>
                        </div>
                        <div className="col-12 col-md-6">
                            <SetupBox title={t('Players at most')} hint={t('With fewer players the first rounds are left out at the draw, and some players get a bye.')}>
                                <SelectButton value={form.maxPlayers} options={MAX_PLAYERS_CHOICES.map(count => ({ label: String(count), value: count }))} onChange={(event) => event.value && chooseSize(event.value)} className="p-selectbutton-pills pills-inline" disabled={!early} aria-label={t('Players at most')} />
                            </SetupBox>
                        </div>
                        <div className="col-12 col-md-6">
                            <SetupBox title={t('Format')} hint={<>{form.preset ? PRESET_WORDS[form.preset]?.hint : t('The rules of every round as you set them below.')}{presetById(form.preset)?.pdc ? ` ${t('The PDC formats are long for a club evening.')}` : ''}</>}>
                                <Dropdown
                                    value={form.preset}
                                    options={PRESETS.map(preset => ({ value: preset.id, label: PRESET_WORDS[preset.id].label, hint: PRESET_WORDS[preset.id].hint, pdc: preset.pdc }))}
                                    onChange={(event) => choosePreset(event.value)}
                                    placeholder={t('Your own rules')}
                                    aria-label={t('Format')}
                                    itemTemplate={(option) => (
                                        <span className="d-flex flex-column gap-1 tournament-preset-option">
                                            <span className="d-flex align-items-center gap-2">{option.label}{option.pdc && <Tag value="PDC" severity="info" />}</span>
                                            <span className="text-faint fs-8 text-wrap">{option.hint}</span>
                                        </span>
                                    )}
                                />
                            </SetupBox>
                        </div>
                        <div className="col-12 col-md-6">
                            <SetupBox title={t('Registration until')} hint={t('Until then the members enter or decline; after it the registration closes by itself and the draw can be held.')}>
                                <DateTimeField value={form.closesAt} onChange={(value) => value && set({ closesAt: value })} disabled={!early} minDate={new Date()} ariaLabel={t('Registration until')} />
                            </SetupBox>
                        </div>
                        <div className="col-12">
                            <SetupBox title={t('Invite the members')} hint={INVITE_WORDS[form.invite].hint}>
                                <SelectButton
                                    value={form.invite}
                                    options={INVITE_CHANNELS.map(channel => ({ label: INVITE_WORDS[channel].label, value: channel }))}
                                    onChange={(event) => event.value && set({ invite: event.value })}
                                    className="p-selectbutton-pills pills-inline flex-wrap"
                                    disabled={!early}
                                    aria-label={t('Invite the members')}
                                />
                            </SetupBox>
                        </div>
                        {connected.length > 0 &&
                            <div className="col-12">
                                <SetupBox title={t('Play with connected clubs')} hint={t('Invite a club you are connected with: their admin enters their players, and you play the tournament together. Each club keeps its own players and statistics.')}>
                                    <MultiSelect
                                        value={form.invitedClubs ?? []}
                                        options={connected}
                                        optionLabel="name"
                                        optionValue="id"
                                        onChange={(event) => set({ invitedClubs: event.value })}
                                        display="chip"
                                        filter={connected.length > 6}
                                        placeholder={t('Only your club')}
                                        disabled={!early && stored?.status !== 'closed'}
                                        aria-label={t('Play with connected clubs')}
                                        className="w-100"
                                    />
                                </SetupBox>
                            </div>}
                        <div className="col-12">
                            <SetupBox title={t('Rounds')}>
                                <div className="d-flex flex-wrap justify-content-center gap-1">
                                    <Button label={t('All on one evening')} icon="pi pi-clock" size="small" text onClick={oneEvening} />
                                    <Button label={t('One round a week')} icon="pi pi-calendar-plus" size="small" text onClick={weekly} />
                                </div>
                            <ol className="list-unstyled m-0 d-flex flex-column gap-2 w-100 text-start">
                                {form.rounds.map(round => {
                                    const fixed = played.has(round.size) || round.skipped;
                                    return (
                                        <li key={round.size} className="tournament-round">
                                            <div className="d-flex flex-wrap align-items-center gap-3">
                                                <span className="tournament-round-name">{roundName(round.size)}</span>
                                                <DateTimeField value={round.date} onChange={(value) => setRound(round.size, { date: value })} placeholder={t('Day')} disabled={fixed} className="tournament-round-date" minDate={form.closesAt ? new Date(form.closesAt.getFullYear(), form.closesAt.getMonth(), form.closesAt.getDate()) : undefined} />
                                                <span className="d-flex flex-column flex-grow-1 min-w-0">
                                                    <span className="text-default fs-7">{rulesText(round.rules)}</span>
                                                    <span className="text-faint fs-8">{round.skipped ? t('Left out: the field is smaller') : t('up to {{count}} legs a match', { count: maxLegs(round.rules) })}</span>
                                                </span>
                                                {!fixed && <Button label={openRound === round.size ? t('Done') : t('Change')} size="small" text onClick={() => setOpenRound(openRound === round.size ? null : round.size)} />}
                                            </div>
                                            {openRound === round.size && <RoundRules rules={round.rules} onChange={(rules) => changeRules(round.size, rules)} disabled={fixed} />}
                                            {rulesError(round.rules) && <span className="text-danger fs-8">{t(rulesError(round.rules))}</span>}
                                        </li>
                                    );
                                })}
                            </ol>
                            </SetupBox>
                        </div>
                    </div>

                    {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                    <div className="d-flex flex-wrap justify-content-end gap-2">
                        <Link to={stored ? `/tournaments/${stored.id}` : '/tournaments'} className="p-button p-button-text p-button-sm text-decoration-none">{t('Cancel')}</Link>
                        {(!stored || stored.status === 'draft') &&
                            <Button label={t('Save as draft')} icon="pi pi-save" size="small" severity="secondary" loading={busy === 'save'} disabled={!form.name.trim() || problems.length > 0 || Boolean(busy)} onClick={() => save(false)} />}
                        {(!stored || stored.status === 'draft')
                            ? <Button label={t('Open the registration')} icon="pi pi-send" size="small" loading={busy === 'open'} disabled={!form.name.trim() || problems.length > 0 || Boolean(busy)} onClick={() => save(true)} />
                            : <Button label={t('Save')} icon="pi pi-save" size="small" loading={busy === 'save'} disabled={!form.name.trim() || problems.length > 0 || Boolean(busy)} onClick={() => save(false)} />}
                    </div>
                    {(!stored || stored.status === 'draft') && <span className="text-faint fs-8 text-end">{INVITE_WORDS[form.invite].opening}</span>}
                </div>
            </Panel>
        </div>
    );
};

export default TournamentEditor;
