import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';

import ClubService from '../../services/club.service';
import SettingSwitch from '../elements/setting.switch';
import GameTypeIcon from '../elements/game.type.icon';
import { CLUB_GAMES, GAME_SETTINGS, HALVE_IT_POOL, MAX_FORMATS, appDefaults, normalizeClubRules } from '../../rules/club.rules';
import { halveItTarget } from '../../rules/games';
import { GAME_TITLES, SETTING_HINTS, SETTING_LABELS, settingOptions, settingsSummary, valueLabel } from '../../utils/club.rules.labels';
import { t } from '../../utils/i18n';

const SAVE_AFTER_MS = 700;
const HANDICAP_MODES = [
    { value: 'off', label: t('Off') },
    { value: 'offered', label: t('Set by hand') },
    { value: 'suggested', label: t('With suggestions') },
];
const MAX_DIFFERENCES = [0, 50, 100, 150, 200, 300].map(value => ({ value, label: value ? t('{{points}} points', { points: value }) : t('No limit') }));
// few choices as pills, more in a list
const AS_PILLS = 5;

// a setting's choice: pills for a few, a list for more
const Choice = ({ game, setting, value, values, onChange, label, disabled = false, emptyLabel }) => {
    const options = settingOptions(game, setting.key, values);
    const withEmpty = emptyLabel ? [{ value: null, label: emptyLabel }, ...options] : options;
    if (withEmpty.length <= AS_PILLS) {
        return (
            <SelectButton
                value={value ?? null}
                options={withEmpty}
                onChange={(e) => (e.value !== undefined && (e.value !== null || emptyLabel)) && onChange(e.value)}
                className="p-selectbutton-pills flex-wrap pills-wrap-text"
                disabled={disabled}
                aria-label={label}
            />
        );
    }
    return <Dropdown value={value ?? null} options={withEmpty} onChange={(e) => onChange(e.value)} disabled={disabled} aria-label={label} className="club-rules-dropdown" />;
};

/**
 * One setting of a game in the club's rules: its default, the choices the
 * club offers (where it may narrow them) and whether it is locked.
 */
const SettingRow = ({ game, setting, own, onChange }) => {
    const offered = own.offered[setting.key] ?? setting.values;
    const value = own.defaults[setting.key] ?? setting.default;
    const locked = own.locked.includes(setting.key);
    const label = SETTING_LABELS[setting.key];
    const setDefault = (next) => onChange({ ...own, defaults: { ...own.defaults, [setting.key]: next } });
    const setOffered = (values) => {
        const chosen = setting.values.filter(option => values.includes(option));
        const offeredNow = { ...own.offered, [setting.key]: chosen };
        // the default stays one of the choices offered
        const defaults = chosen.length && !chosen.includes(value) ? { ...own.defaults, [setting.key]: chosen[0] } : own.defaults;
        onChange({ ...own, offered: offeredNow, defaults });
    };
    const toggleLock = () => onChange({ ...own, locked: locked ? own.locked.filter(key => key !== setting.key) : [...own.locked, setting.key] });

    return (
        <div className="club-rules-setting">
            <div className="club-rules-setting-head">
                <span className="d-flex flex-column min-w-0">
                    <span className="text-default fw-semibold fs-7">{label}{setting.house && <span className="club-rules-house">{t('House rule')}</span>}</span>
                    {SETTING_HINTS[setting.key] && <span className="text-faint fs-8">{SETTING_HINTS[setting.key]}</span>}
                </span>
                <Button
                    type="button"
                    icon={locked ? 'pi pi-lock' : 'pi pi-lock-open'}
                    label={locked ? t('Locked') : t('Players choose')}
                    size="small"
                    text
                    severity={locked ? undefined : 'secondary'}
                    className={`club-rules-lock ${locked ? 'is-locked' : ''}`}
                    aria-pressed={locked}
                    title={locked ? t('Locked: every game is played with this value. Click to let the players choose.') : t('The players choose in the setup. Click to lock it for every game.')}
                    onClick={toggleLock}
                />
            </div>
            <div className="club-rules-setting-body">
                <span className="text-faint fs-8 club-rules-caption">{locked ? t('Always') : t('Starts with')}</span>
                <Choice game={game} setting={setting} value={value} values={offered} onChange={setDefault} label={t('{{setting}}: the default', { setting: label })} />
            </div>
            {setting.restrict && !locked &&
                <div className="club-rules-setting-body">
                    <span className="text-faint fs-8 club-rules-caption">{t('Offered')}</span>
                    <MultiSelect
                        value={offered}
                        options={settingOptions(game, setting.key)}
                        onChange={(e) => setOffered(e.value ?? [])}
                        display="chip"
                        className="club-rules-offered"
                        placeholder={t('All choices')}
                        aria-label={t('{{setting}}: the choices offered', { setting: label })}
                    />
                </div>}
        </div>
    );
};

/**
 * The club's own Halve-It targets: the rounds in their order, each removed
 * with a tap, another added at the end.
 */
const HalveItTargets = ({ targets, onChange }) => (
    <div className="club-rules-setting">
        <div className="club-rules-setting-head">
            <span className="d-flex flex-column">
                <span className="text-default fw-semibold fs-7">{t('The club\'s own Halve-It targets')}</span>
                <span className="text-faint fs-8">{t('The rounds in their order, up to 20. Offered as "The club\'s own" under Targets.')}</span>
            </span>
        </div>
        <div className="club-rules-targets">
            {targets.map((target, index) => (
                <button key={`${target}-${index}`} type="button" className="club-rules-target" onClick={() => onChange(targets.filter((_, at) => at !== index))} title={t('Remove this round')}>
                    <span className="text-faint">{index + 1}</span>{halveItTarget(target).label}<i className="pi pi-times" aria-hidden="true" />
                </button>
            ))}
            {targets.length < 20 &&
                <Dropdown
                    value={null}
                    options={HALVE_IT_POOL.map(target => ({ value: target, label: halveItTarget(target).label }))}
                    onChange={(e) => e.value && onChange([...targets, e.value])}
                    placeholder={t('Add a round')}
                    className="club-rules-dropdown"
                    aria-label={t('Add a round')}
                />}
        </div>
    </div>
);

/**
 * A format of the club: its name, its game, the settings it sets (the
 * others stay as the setup has them) and whether it is friendly.
 */
const FormatRow = ({ format, onChange, onRemove }) => {
    const [open, setOpen] = useState(!format.name);
    const settings = GAME_SETTINGS[format.game] ?? [];
    return (
        <div className="club-rules-format">
            <div className="club-rules-format-head">
                <GameTypeIcon type={format.game} />
                <InputText value={format.name} onChange={(e) => onChange({ ...format, name: e.target.value })} maxLength={60} placeholder={t('Name, e.g. Club night')} aria-label={t('Name of the format')} className="flex-grow-1" />
                <Button type="button" icon={open ? 'pi pi-chevron-up' : 'pi pi-sliders-h'} text size="small" severity="secondary" aria-label={open ? t('Close the settings') : t('Change the settings')} onClick={() => setOpen(!open)} />
                <Button type="button" icon="pi pi-trash" text size="small" severity="danger" aria-label={t('Remove the format')} onClick={onRemove} />
            </div>
            <span className="text-faint fs-8">
                {GAME_TITLES[format.game]}{Object.keys(format.settings).length ? ` · ${settingsSummary(format.game, format.settings)}` : ` · ${t('as the setup has it')}`}
                {format.friendly && ` · ${t('Friendly')}`}
            </span>
            {open &&
                <div className="club-rules-format-body">
                    {settings.map(setting => (
                        <div key={setting.key} className="club-rules-setting-body">
                            <span className="text-faint fs-8 club-rules-caption">{SETTING_LABELS[setting.key]}</span>
                            <Choice
                                game={format.game}
                                setting={setting}
                                value={format.settings[setting.key] ?? null}
                                values={setting.values}
                                emptyLabel={t('Any')}
                                label={SETTING_LABELS[setting.key]}
                                onChange={(value) => {
                                    const next = { ...format.settings };
                                    if (value === null || value === undefined) delete next[setting.key];
                                    else next[setting.key] = value;
                                    onChange({ ...format, settings: next });
                                }}
                            />
                        </div>
                    ))}
                    <div className="d-flex align-items-center gap-2 mt-2">
                        <InputSwitch inputId={`friendly-${format.id}`} checked={format.friendly} onChange={(e) => onChange({ ...format, friendly: e.value })} />
                        <label htmlFor={`friendly-${format.id}`} className="text-default fs-7">{t('Friendly: left out of the club\'s leaderboards, records and Hall of Shame')}</label>
                    </div>
                </div>}
        </div>
    );
};

/**
 * The club's own rules for its games, for its admins: which games it plays,
 * per game the defaults, the choices offered and what is locked (with the
 * house rules), the club's formats, friendly games, the handicap policy and
 * the ways out. Saved a moment after each change.
 */
const ClubGameRules = ({ club, onSaved, onError }) => {
    const [rules, setRules] = useState(() => normalizeClubRules(club.gameRules));
    const [openGame, setOpenGame] = useState(null);
    const [newFormatGame, setNewFormatGame] = useState('x01');
    const [state, setState] = useState('idle');
    const timer = useRef(null);
    const pending = useRef(null);

    // a pending change is saved when the page is left
    useEffect(() => () => {
        clearTimeout(timer.current);
        if (pending.current) ClubService.updateGameRules(club.id, pending.current).then(onSaved).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const change = (next) => {
        setRules(next);
        pending.current = next;
        setState('saving');
        clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            const sending = pending.current;
            try {
                await ClubService.updateGameRules(club.id, sending);
                if (pending.current === sending) pending.current = null;
                setState('saved');
                onSaved?.();
            } catch (error) {
                setState('idle');
                onError?.(t('Game rules'), error);
            }
        }, SAVE_AFTER_MS);
    };
    const setGame = (game, own) => change({ ...rules, games: { ...rules.games, [game]: own } });
    const setFormat = (index, format) => change({ ...rules, formats: rules.formats.map((entry, at) => (at === index ? format : entry)) });
    const addFormat = () => {
        const id = `format-${Date.now().toString(36)}`;
        change({ ...rules, formats: [...rules.formats, { id, game: newFormatGame, name: '', settings: {}, friendly: false }] });
    };

    return (
        <Panel header={t('Game rules')} id="game-rules" className="mt-4" icons={
            <span className="text-faint fs-8 me-2" aria-live="polite">{state === 'saving' ? t('Saving…') : state === 'saved' ? t('Saved') : ''}</span>
        }>
            <p className="text-subtle fs-7 mt-0 mb-4">
                {t('The club\'s own rules: which games it plays, what a game starts with, which choices the setups offer and which are locked for every game, the club\'s formats, friendly games and handicaps. A running game keeps the rules it started with. Saved as you go.')}
            </p>
            <div className="row g-4">
                <div className="col-12 col-xl-5">
                    <p className="game-setup-section-title">{t('For every game')}</p>
                    <SettingSwitch
                        id="rules-friendly"
                        title={t('Players may mark a game as friendly')}
                        hint={t('A friendly game counts for the players\' own statistics, XP and badges, but not for the club\'s leaderboards, records and Hall of Shame. Switched off, only the club\'s friendly formats are friendly.')}
                        checked={rules.friendlyChoice}
                        onChange={(value) => change({ ...rules, friendlyChoice: value })}
                    />
                    <SettingSwitch
                        id="rules-builtin"
                        title={t('The app\'s quick formats too')}
                        hint={t('Besides the club\'s own formats, e.g. 501 Double Out · Best of 3 legs, as far as they keep to the club\'s rules.')}
                        checked={rules.builtInFormats}
                        onChange={(value) => change({ ...rules, builtInFormats: value })}
                    />
                    <SettingSwitch
                        id="rules-waysout"
                        title={t('Ways out during X01')}
                        hint={t('The tips above the board with the way to finish. Some leagues play without them.')}
                        checked={rules.waysOut}
                        onChange={(value) => change({ ...rules, waysOut: value })}
                    />
                    <p className="setting-title">{t('Handicap in X01')}</p>
                    <div className="d-flex flex-column gap-2 mb-3">
                        <SelectButton
                            value={rules.handicap.mode}
                            options={HANDICAP_MODES}
                            onChange={(e) => e.value && change({ ...rules, handicap: { ...rules.handicap, mode: e.value } })}
                            className="p-selectbutton-pills flex-wrap"
                            aria-label={t('Handicap in X01')}
                        />
                        <span className="text-faint fs-8">
                            {rules.handicap.mode === 'off' ? t('Everyone plays from the same starting score.')
                                : rules.handicap.mode === 'offered' ? t('The players set each one\'s starting score and in/out by hand.')
                                    : t('As by hand, with a suggestion from each player\'s recent average, level and age.')}
                        </span>
                        {rules.handicap.mode !== 'off' &&
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span className="text-subtle fs-8">{t('The starting scores differ by at most')}</span>
                                <Dropdown
                                    value={rules.handicap.maxDifference}
                                    options={MAX_DIFFERENCES}
                                    onChange={(e) => change({ ...rules, handicap: { ...rules.handicap, maxDifference: e.value } })}
                                    className="club-rules-dropdown"
                                    aria-label={t('The largest difference of the starting scores')}
                                />
                            </div>}
                    </div>

                    <p className="game-setup-section-title mt-4">{t('The club\'s formats')}</p>
                    <p className="text-faint fs-8 mt-0">{t('One tap in the setup sets the game up like this; they come first, with the club\'s mark.')}</p>
                    <div className="d-flex flex-column gap-3">
                        {rules.formats.map((format, index) => (
                            <FormatRow
                                key={format.id}
                                format={format}
                                onChange={(next) => setFormat(index, next)}
                                onRemove={() => change({ ...rules, formats: rules.formats.filter((_, at) => at !== index) })}
                            />
                        ))}
                        {rules.formats.length < MAX_FORMATS &&
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <Dropdown
                                    value={newFormatGame}
                                    options={CLUB_GAMES.map(game => ({ value: game, label: GAME_TITLES[game] }))}
                                    onChange={(e) => setNewFormatGame(e.value)}
                                    className="club-rules-dropdown"
                                    aria-label={t('The game of the new format')}
                                />
                                <Button type="button" label={t('Add a format')} icon="pi pi-plus" size="small" outlined onClick={addFormat} />
                            </div>}
                    </div>
                </div>

                <div className="col-12 col-xl-7">
                    <p className="game-setup-section-title">{t('The games')}</p>
                    <div className="d-flex flex-column gap-2">
                        {CLUB_GAMES.map(game => {
                            const own = rules.games[game];
                            const open = openGame === game;
                            const changedCount = GAME_SETTINGS[game].filter(setting => own.locked.includes(setting.key)
                                || own.offered[setting.key] || (own.defaults[setting.key] !== undefined && own.defaults[setting.key] !== appDefaults(game)[setting.key])).length;
                            return (
                                <div key={game} className={`club-rules-game ${own.enabled ? '' : 'is-off'}`}>
                                    <div className="club-rules-game-head">
                                        <InputSwitch
                                            checked={own.enabled}
                                            onChange={(e) => setGame(game, { ...own, enabled: e.value })}
                                            aria-label={t('The club plays {{game}}', { game: GAME_TITLES[game] })}
                                        />
                                        <button type="button" className="club-rules-game-title" onClick={() => setOpenGame(open ? null : game)} aria-expanded={open} disabled={!own.enabled || !GAME_SETTINGS[game].length}>
                                            <GameTypeIcon type={game} />
                                            <span className="d-flex flex-column align-items-start">
                                                <span className="text-default fw-semibold">{GAME_TITLES[game]}</span>
                                                <span className="text-faint fs-8">
                                                    {!own.enabled ? t('Not played in the club')
                                                        : !GAME_SETTINGS[game].length ? t('Nothing to set')
                                                            : changedCount ? t('{{count}} own rules', { count: changedCount })
                                                                : t('As the app has it')}
                                                    {own.locked.length > 0 && own.enabled && <> · <i className="pi pi-lock fs-9" aria-hidden="true" /> {own.locked.map(key => `${SETTING_LABELS[key]}: ${valueLabel(game, key, own.defaults[key] ?? appDefaults(game)[key])}`).join(', ')}</>}
                                                </span>
                                            </span>
                                            {own.enabled && GAME_SETTINGS[game].length > 0 && <i className={`pi ${open ? 'pi-chevron-up' : 'pi-chevron-down'} ms-auto`} aria-hidden="true" />}
                                        </button>
                                    </div>
                                    {open && own.enabled &&
                                        <div className="club-rules-game-body">
                                            {GAME_SETTINGS[game].map(setting => (
                                                <SettingRow key={setting.key} game={game} setting={setting} own={own} onChange={(next) => setGame(game, next)} />
                                            ))}
                                            {game === 'halveit' && <HalveItTargets targets={rules.halveItTargets} onChange={(targets) => change({ ...rules, halveItTargets: targets })} />}
                                            <div className="d-flex justify-content-end">
                                                <Button type="button" label={t('Back to the app\'s rules')} icon="pi pi-replay" size="small" text severity="secondary"
                                                    onClick={() => setGame(game, { enabled: true, defaults: {}, offered: {}, locked: [] })} />
                                            </div>
                                        </div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Panel>
    );
};

export default ClubGameRules;
