import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';

import TournamentService from '../../services/tournament.service';
import { useAuth } from '../../utils/auth.context';
import { calendarFormat } from '../../utils/dates';
import { t } from '../../utils/i18n';
import { INVITE_CHANNELS, MAX_PLAYERS_CHOICES, PRESETS, STARTING_SCORES, cleanRules, isDecided, maxLegs, presetById, presetRules, roundSizes, rulesError } from '../../rules/tournaments';
import { INVITE_WORDS, PRESET_WORDS, roundName, rulesText } from './tournament.words';
import { Lines } from '../elements/skeletons';
import BetaTag from './beta.tag';

const MODES = ['Best of', 'First to'];
const IN_MODES = ['Straight In', 'Double In', 'Master In'];
const OUT_MODES = ['Straight Out', 'Double Out', 'Master Out'];
const DAY = 24 * 60 * 60 * 1000;

// a week from now at 20:00, when nothing is chosen yet
const defaultCloses = () => {
    const at = new Date(Date.now() + 7 * DAY);
    at.setHours(20, 0, 0, 0);
    return at;
};

// the rounds of a bracket, keeping the days and rules already chosen, the preset's rules for new ones
const roundsFor = (maxPlayers, presetId, current = []) => roundSizes(maxPlayers).map(size => {
    const known = current.find(round => round.size === size);
    return known ?? { size, date: null, rules: presetRules(presetById(presetId), size) };
});

/**
 * The rules of one round: the starting score, in and out, and legs (or sets
 * of legs) as best of or first to.
 */
const RoundRules = ({ rules, onChange, disabled }) => {
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
                        <Dropdown value={rules.setMode} options={MODES.map(mode => ({ label: t(mode), value: mode }))} onChange={(event) => set({ setMode: event.value })} disabled={disabled} />
                    </label>
                    <InputNumber value={rules.numberOfSets} onValueChange={(event) => set({ numberOfSets: event.value ?? 1 })} min={1} max={13} showButtons inputClassName="tournament-count" disabled={disabled} aria-label={t('Number of sets')} />
                </div>}
            <div className="d-flex align-items-end gap-2 tournament-rules-wide">
                <label className="d-flex flex-column gap-1">
                    <span className="text-subtle fs-8">{inSets ? t('Legs per set') : t('Legs')}</span>
                    <Dropdown value={rules.legMode} options={MODES.map(mode => ({ label: t(mode), value: mode }))} onChange={(event) => set({ legMode: event.value })} disabled={disabled} />
                </label>
                <InputNumber value={rules.numberOfLegs} onValueChange={(event) => set({ numberOfLegs: event.value ?? 1 })} min={1} max={35} showButtons inputClassName="tournament-count" disabled={disabled} aria-label={t('Number of legs')} />
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
    const { isClubAdmin } = useAuth();
    const [stored, setStored] = useState(null);
    const [form, setForm] = useState(null);
    const [openRound, setOpenRound] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');

    useEffect(() => {
        if (!id) {
            setForm({ name: '', description: '', maxPlayers: 16, preset: 'clubClassic', closesAt: defaultCloses(), invite: 'mail', rounds: roundsFor(16, 'clubClassic') });
            return;
        }
        TournamentService.loadTournament(id).then(loaded => {
            setStored(loaded);
            setForm({
                name: loaded.name, description: loaded.description ?? '', maxPlayers: loaded.maxPlayers, preset: loaded.preset ?? null,
                closesAt: new Date(loaded.closesAt),
                invite: loaded.invite ?? 'mail',
                rounds: loaded.rounds.map(round => ({ ...round, date: round.date ? new Date(round.date) : null })),
            });
        }).catch(err => setError(err.message));
    }, [id]);

    // the rounds with a match started or decided keep their day and rules
    const played = useMemo(() => new Set((stored?.matches ?? []).filter(match => match.status === 'running' || (isDecided(match) && !match.bye)).map(match => match.size)), [stored]);

    if (!isClubAdmin) return <div className="container-fluid p-4"><Message severity="warn" text={t('Only club admins can set up tournaments.')} /></div>;
    if (!form) return <div className="container-fluid p-4">{error ? <Message severity="error" text={error} /> : <Lines count={6} />}</div>;

    const early = !stored || ['draft', 'registration'].includes(stored.status);
    const set = (changes) => setForm(current => ({ ...current, ...changes }));
    const setRound = (size, changes) => set({ rounds: form.rounds.map(round => (round.size === size ? { ...round, ...changes } : round)) });
    const choosePreset = (presetId) => set({ preset: presetId, rounds: form.rounds.map(round => (played.has(round.size) ? round : { ...round, rules: presetRules(presetById(presetId), round.size) })) });
    const chooseSize = (maxPlayers) => set({ maxPlayers, rounds: roundsFor(maxPlayers, form.preset, form.rounds) });
    // one round a week, the first a week after the registration ends
    const weekly = () => {
        const first = new Date(form.closesAt.getTime() + 7 * DAY);
        first.setHours(19, 30, 0, 0);
        set({ rounds: form.rounds.map((round, index) => (played.has(round.size) ? round : { ...round, date: new Date(first.getTime() + index * 7 * DAY) })) });
    };
    // rules of their own: the format is no longer a preset once a round differs from it
    const changeRules = (size, rules) => setForm(current => {
        const rounds = current.rounds.map(round => (round.size === size ? { ...round, rules } : round));
        const preset = presetById(current.preset);
        const same = (a, b) => JSON.stringify(cleanRules(a)) === JSON.stringify(cleanRules(b));
        return { ...current, rounds, preset: preset && rounds.every(round => same(round.rules, presetRules(preset, round.size))) ? current.preset : null };
    });
    const problems = form.rounds.map(round => rulesError(round.rules)).filter(Boolean);

    const save = async (open) => {
        setError('');
        setBusy(open ? 'open' : 'save');
        const setup = { name: form.name, description: form.description, maxPlayers: form.maxPlayers, preset: form.preset, closesAt: form.closesAt, invite: form.invite, rounds: form.rounds };
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
            <Panel header={stored ? t('Change the tournament') : t('New tournament')} icons={<BetaTag />} className="page-narrow">
                <div className="d-flex flex-column gap-3">
                    <label className="d-flex flex-column gap-1" htmlFor="tournament-name">
                        <span className="fs-7 text-default fw-semibold">{t('Name')}</span>
                        <InputText id="tournament-name" value={form.name} onChange={(event) => set({ name: event.target.value })} maxLength={80} placeholder={t('e.g. Autumn Cup')} />
                    </label>
                    <label className="d-flex flex-column gap-1" htmlFor="tournament-description">
                        <span className="fs-7 text-default fw-semibold">{t('Description')}</span>
                        <InputTextarea id="tournament-description" value={form.description} onChange={(event) => set({ description: event.target.value })} maxLength={1000} rows={3} autoResize placeholder={t('Optional: where you play, prizes, anything the players should know')} />
                    </label>

                    <div className="d-flex flex-column gap-1">
                        <span className="fs-7 text-default fw-semibold">{t('Players at most')}</span>
                        <SelectButton value={form.maxPlayers} options={MAX_PLAYERS_CHOICES.map(count => ({ label: String(count), value: count }))} onChange={(event) => event.value && chooseSize(event.value)} className="p-selectbutton-pills" disabled={!early} />
                        <span className="text-faint fs-8">{t('With fewer players the first rounds are left out at the draw, and some players get a bye.')}</span>
                    </div>

                    <div className="d-flex flex-column gap-1">
                        <span className="fs-7 text-default fw-semibold">{t('Format')}</span>
                        <Dropdown
                            value={form.preset}
                            options={PRESETS.map(preset => ({ value: preset.id, label: PRESET_WORDS[preset.id].label, hint: PRESET_WORDS[preset.id].hint, pdc: preset.pdc }))}
                            onChange={(event) => choosePreset(event.value)}
                            placeholder={t('Your own rules')}
                            itemTemplate={(option) => (
                                <span className="d-flex flex-column gap-1 tournament-preset-option">
                                    <span className="d-flex align-items-center gap-2">{option.label}{option.pdc && <Tag value="PDC" severity="info" />}</span>
                                    <span className="text-faint fs-8 text-wrap">{option.hint}</span>
                                </span>
                            )}
                        />
                        <span className="text-faint fs-8">{form.preset ? PRESET_WORDS[form.preset]?.hint : t('The rules of every round as you set them below.')}{presetById(form.preset)?.pdc ? ` ${t('The PDC formats are long for a club evening.')}` : ''}</span>
                    </div>

                    <div className="d-flex flex-column gap-1">
                        <span className="fs-7 text-default fw-semibold">{t('Registration until')}</span>
                        <Calendar value={form.closesAt} onChange={(event) => event.value && set({ closesAt: event.value })} dateFormat={calendarFormat()} showTime hourFormat="24" showIcon icon="pi pi-calendar" disabled={!early} minDate={new Date()} />
                        <span className="text-faint fs-8">{t('Until then the members enter or decline; after it the registration closes by itself and the draw can be held.')}</span>
                    </div>

                    <div className="d-flex flex-column gap-1">
                        <span className="fs-7 text-default fw-semibold">{t('Invite the members')}</span>
                        <SelectButton
                            value={form.invite}
                            options={INVITE_CHANNELS.map(channel => ({ label: INVITE_WORDS[channel].label, value: channel }))}
                            onChange={(event) => event.value && set({ invite: event.value })}
                            className="p-selectbutton-pills flex-wrap"
                            disabled={!early}
                            aria-label={t('Invite the members')}
                        />
                        <span className="text-faint fs-8">{INVITE_WORDS[form.invite].hint}</span>
                    </div>

                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2">
                        <span className="fs-7 text-default fw-semibold">{t('Rounds')}</span>
                        <Button label={t('One round a week')} icon="pi pi-calendar-plus" size="small" text onClick={weekly} />
                    </div>
                    <ol className="list-unstyled m-0 d-flex flex-column gap-2">
                        {form.rounds.map(round => {
                            const fixed = played.has(round.size) || round.skipped;
                            return (
                                <li key={round.size} className="tournament-round">
                                    <div className="d-flex flex-wrap align-items-center gap-3">
                                        <span className="tournament-round-name">{roundName(round.size)}</span>
                                        <Calendar value={round.date} onChange={(event) => setRound(round.size, { date: event.value ?? null })} dateFormat={calendarFormat()} showTime hourFormat="24" placeholder={t('Day')} showIcon icon="pi pi-calendar" disabled={fixed} className="tournament-round-date" />
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
