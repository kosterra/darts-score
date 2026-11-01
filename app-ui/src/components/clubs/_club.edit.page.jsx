import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Panel } from 'primereact/panel';
import { Password } from 'primereact/password';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';

import ClubService from '../../services/club.service';
import { CLUB_ROLES } from '../../services/user.service';
import CountryPicker from '../elements/country.picker';
import DeletePopup from '../elements/delete.popup';
import ImageUploader from '../elements/image.uploader';
import SaveStatus from '../elements/save.status';
import SettingSwitch from '../elements/setting.switch';
import UpLink from '../elements/up.link';
import ClubGameRules from './club.game.rules';
import ClubGoalsEditor from './club.goals.editor';
import ClubConnections from './club.connections';
import { useAuth } from '../../utils/auth.context';
import useAutoSave, { mergeSaves } from '../../utils/use.auto.save';
import { resolveClubLogo } from '../../utils/image.utils';
import { t } from '../../utils/i18n';
import { ACCENT_OPTIONS } from '../../utils/accents';
import ClubShirtEditor from './club.shirt.editor';

const DESCRIPTION_MAX = 500;
const EMPTY_ADMIN = { email: '', firstname: '', lastname: '', password: '' };

// how new members come in, with what it means
const JOIN_POLICIES = [
    { label: t('Open'), value: 'open', hint: t('Anyone with an account finds the club under Join a club and becomes a member at once. The admins are told who joined.') },
    { label: t('Admins accept'), value: 'approval', hint: t('Anyone with an account can ask to join. One of the admins accepts or declines, on the players page.') },
    { label: t('Closed'), value: 'closed', hint: t('The club is not listed under Join a club. Only the admins add players and give them a login.') },
];

/**
 * A club admin edits the club on a page of its own, laid out as the player
 * profile: what the club is (logo, name, description) and its admins on the
 * left, saved with Save; on the right what it shows on the public page, how
 * new members come in and the Hall of Shame, each saved right away; at the
 * bottom deleting the club. Below, the club's own rules for its games.
 */
const ClubEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hash } = useLocation();
    const toast = useRef(null);
    const { clubs, refreshClubs, selectClub, user, mailEnabled } = useAuth();
    const club = clubs.find(entry => entry.id === id);

    // a link with a section (e.g. a notification to #connections) scrolls there once the page is up
    useEffect(() => {
        if (!club || !hash) return undefined;
        const element = document.getElementById(hash.slice(1));
        if (!element) return undefined;
        const timer = setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
        return () => clearTimeout(timer);
    }, [hash, club]);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [country, setCountry] = useState('');
    const [accent, setAccent] = useState('green');
    const [logoPreview, setLogoPreview] = useState('');
    const [newAdmin, setNewAdmin] = useState(EMPTY_ADMIN);
    const [adding, setAdding] = useState(false);
    const [shameMinAge, setShameMinAge] = useState(16);
    // the settings as just chosen, shown at once while they are saved
    const [overrides, setOverrides] = useState({});
    const chosen = useRef({});

    // everything saves as you go: what the club is (the name and description a moment after typing),
    // its logo, and its settings (each choice at once, all chosen so far sent together)
    const clubSave = useAutoSave(async (values) => {
        await ClubService.updateClub(id, { name: values.name.trim(), description: values.description, country: values.country, accent: values.accent === 'green' ? null : values.accent });
        await refreshClubs();
    }, { valid: (values) => values.name.trim().length >= 3 && values.name.trim().length <= 50 });
    const logoSave = useAutoSave(async (file) => {
        if (file) await ClubService.uploadLogo(id, file);
        else await ClubService.removeLogo(id);
        await refreshClubs();
    });
    const settingsSave = useAutoSave(async (settings) => {
        await ClubService.updateClub(id, { name: club.name, ...settings });
        await refreshClubs();
    });

    // the fields start from the club, and again after it was saved
    const loadedId = useRef(null);
    useEffect(() => {
        if (!club || loadedId.current === club.id) return;
        loadedId.current = club.id;
        setName(club.name);
        setDescription(club.description ?? '');
        setCountry(club.country ?? '');
        setAccent(club.accent ?? 'green');
        setLogoPreview(resolveClubLogo(club.logo));
        setShameMinAge(club.shameMinAge ?? 16);
    }, [club]);

    if (!club) return clubs.length ? <Navigate replace to="/my-clubs" /> : null;
    if (club.role !== CLUB_ROLES.ADMIN) return <Navigate replace to="/my-clubs" />;

    const showError = (summary, error) => toast.current?.show({ severity: 'error', summary, detail: error.message, life: 4000 });
    const showSaved = (detail) => toast.current?.show({ severity: 'success', summary: t('Saved'), detail, life: 2500 });

    // what the club is: shown at once, saved a moment later (a choice at once)
    const changeClub = (patch, options) => {
        const next = { name, description, country, accent, ...patch };
        if ('name' in patch) setName(patch.name);
        if ('description' in patch) setDescription(patch.description);
        if ('country' in patch) setCountry(patch.country);
        if ('accent' in patch) setAccent(patch.accent);
        clubSave.change(next, options);
    };

    // a setting: shown at once and saved at once (the age limit once it stopped changing); the name goes
    // along, as the API needs it
    const saveSetting = (changes, { now = true } = {}) => {
        chosen.current = { ...chosen.current, ...changes };
        setOverrides(chosen.current);
        settingsSave.change(chosen.current, { now });
    };

    const addAdmin = async (event) => {
        event.preventDefault();
        setAdding(true);
        try {
            await ClubService.addAdmin(club.id, newAdmin);
            setNewAdmin(EMPTY_ADMIN);
            await refreshClubs();
            showSaved(t('{{email}} is an admin of {{name}} now.', { email: newAdmin.email, name: club.name }));
        } catch (error) {
            showError(t('Add an admin'), error);
        } finally {
            setAdding(false);
        }
    };

    const removeAdmin = async (admin) => {
        try {
            await ClubService.removeAdmin(club.id, admin.id);
            await refreshClubs();
            showSaved(t('{{firstname}} {{lastname}} is no longer an admin.', { firstname: admin.firstname, lastname: admin.lastname }));
        } catch (error) {
            showError(t('Remove an admin'), error);
        }
    };

    const deleteClub = async () => {
        try {
            await ClubService.deleteClub(club.id);
            await refreshClubs();
            navigate('/my-clubs', { replace: true });
        } catch (error) {
            showError(t('Delete the club'), error);
        }
    };

    const field = (key) => (event) => setNewAdmin(current => ({ ...current, [key]: event.target.value }));
    // the club as saved, with what was just chosen on top
    const shown = { ...club, ...overrides };
    const isPublic = Boolean(shown.isPublic);
    const shameOn = shown.shameBadges !== false;
    const policy = shown.joinPolicy ?? 'closed';

    return (
        <div className="container-fluid p-4 border-0">
            <Toast ref={toast} position="bottom-right" />
            <UpLink to="/my-clubs" label={t('My clubs')} />
            <Panel header={t('Edit {{name}}', { name: club.name })} icons={<SaveStatus {...mergeSaves(clubSave, logoSave, settingsSave)} className="me-2" />}>
                <p className="text-subtle fs-7 mt-0 mb-3">
                    {t('What the club is and who runs it, what it shows of itself and how new members come in. Everything is saved as you go.')}
                </p>
                <div className="row g-4">
                    <div className="col-12 col-xl-6">
                        <div className="mb-4">
                            <p className="game-setup-section-title">{t('The club')}</p>
                            <p className="setting-title">{t('Logo and name')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col my-player-main">
                                    <ImageUploader
                                        name={name}
                                        previewUrl={logoPreview}
                                        onFileChange={(file) => { setLogoPreview(URL.createObjectURL(file)); logoSave.change(file, { now: true }); }}
                                        onFileDelete={() => { setLogoPreview(''); logoSave.change(null, { now: true }); }}
                                    />
                                    <label className="d-flex flex-column gap-1 profile-field">
                                        <span className="text-subtle fs-8">{t('Name')}</span>
                                        <InputText value={name} onChange={(event) => changeClub({ name: event.target.value })} onBlur={clubSave.flush} minLength={3} maxLength={50} required invalid={name.trim().length < 3} />
                                        <span className={`fs-8 ${name.trim().length < 3 ? 'text-danger' : 'text-faint'}`}>{t('3 to 50 characters.')}</span>
                                    </label>
                                </div>
                            </div>
                            <p className="setting-title">{t('Description')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col d-flex flex-column gap-1 pt-1">
                                    <InputTextarea
                                        value={description}
                                        onChange={(event) => changeClub({ description: event.target.value })}
                                        onBlur={clubSave.flush}
                                        maxLength={DESCRIPTION_MAX}
                                        rows={4}
                                        autoResize
                                        placeholder={t('Where and when you play, who can join, …')}
                                        aria-label={t('Description')}
                                    />
                                    <span className="text-faint fs-8 text-end">{description.length} / {DESCRIPTION_MAX}{' '}{t('· shown on My clubs, under Join a club and, for a public club, on the start page')}</span>
                                </div>
                            </div>
                            <p className="setting-title">{t('Country')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col d-flex flex-column gap-1 pt-1">
                                    <CountryPicker value={country} onChange={(value) => changeClub({ country: value ?? '' }, { now: true })} />
                                    <span className="text-faint fs-8">{t('Where the club plays: its flag is shown next to its name in the lists of clubs.')}</span>
                                </div>
                            </div>
                            <p className="setting-title">{t('Club colour')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col d-flex flex-column gap-2 pt-1">
                                    <div className="accent-choices" role="radiogroup" aria-label={t('Club colour')}>
                                        {ACCENT_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                role="radio"
                                                aria-checked={accent === option.value}
                                                className={`accent-choice ${accent === option.value ? 'is-chosen' : ''}`}
                                                onClick={() => changeClub({ accent: option.value }, { now: true })}
                                                title={option.label}
                                            >
                                                <span className="accent-swatch" style={{ '--swatch': option.color }} aria-hidden="true" />
                                                <span className="accent-choice-label">{option.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-faint fs-8">{t('The accent colour of the app for the members who did not choose their own (Profile → Account → Display): buttons, highlights and the club\'s tablet.')}</span>
                                </div>
                            </div>
                        </div>

                        <p className="game-setup-section-title">{t('Admins')}</p>
                        <p className="setting-title">{t('Who runs the club')}</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column gap-2 pt-1">
                                {club.admins.map(admin => (
                                    <div key={admin.id} className="d-flex justify-content-between align-items-center gap-3">
                                        <div className="d-flex flex-column min-w-0">
                                            <span className="text-default fw-semibold text-break">
                                                {admin.firstname} {admin.lastname}{admin.id === user.id && <span className="text-faint fw-normal">{' '}{t('(you)')}</span>}
                                            </span>
                                            <span className="text-subtle fs-8 text-break">{admin.email}</span>
                                        </div>
                                        {club.admins.length > 1 &&
                                            <Button type="button" icon="pi pi-times" text severity="secondary" size="small" aria-label={t('Remove {{email}} as admin', { email: admin.email })} title={t('Remove as admin')} onClick={() => removeAdmin(admin)} />}
                                    </div>
                                ))}
                                <span className="text-faint fs-8">{t('Every admin can do everything in the club. A club always keeps one.')}</span>
                            </div>
                        </div>
                        <p className="setting-title">{t('Add an admin')}</p>
                        <form onSubmit={addAdmin} className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column gap-2 pt-1">
                                <span className="text-faint fs-8">
                                    {t('For someone with an account the email is enough. Otherwise the name too, and a new account is made')}
                                    {mailEnabled ? t('; without a password they get a mail to choose their own.') : t(' with the initial password you enter.')}
                                </span>
                                <InputText type="email" value={newAdmin.email} onChange={field('email')} placeholder={t('Email')} aria-label={t('Email')} required />
                                <div className="d-flex flex-wrap gap-2">
                                    <InputText value={newAdmin.firstname} onChange={field('firstname')} placeholder={t('First name (new account)')} aria-label={t('First name')} className="flex-grow-1" />
                                    <InputText value={newAdmin.lastname} onChange={field('lastname')} placeholder={t('Last name (new account)')} aria-label={t('Last name')} className="flex-grow-1" />
                                </div>
                                <Password
                                    autoComplete="new-password"
                                    value={newAdmin.password}
                                    onChange={field('password')}
                                    placeholder={mailEnabled ? t('Initial password (optional)') : t('Initial password (new account)')}
                                    aria-label={t('Initial password')}
                                    feedback={false}
                                    className="w-100"
                                    inputClassName="w-100"
                                />
                                <div className="d-flex justify-content-end">
                                    <Button type="submit" label={t('Add admin')} icon="pi pi-user-plus" size="small" loading={adding} />
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="col-12 col-xl-6">
                        <p className="game-setup-section-title">{t('Public page')}</p>
                        <SettingSwitch
                            id="club-public"
                            title={t('Public club')}
                            hint={t('Listed by name on the public start page, with its figures. Whether people with an account can find and join the club is set under New members.')}
                            checked={isPublic}
                            onChange={(value) => saveSetting({ isPublic: value })}
                        />
                        <SettingSwitch
                            id="club-live"
                            title={t('Show running games')}
                            hint={t('Live scores of games in progress appear on the public start page.')}
                            checked={shown.publicLiveGames !== false}
                            disabled={!isPublic}
                            onChange={(value) => saveSetting({ publicLiveGames: value })}
                        />
                        <SettingSwitch
                            id="club-results"
                            title={t('Show results')}
                            hint={t('Finished games appear under the latest results. Players are shown without their name unless their nickname is public: their own choice with a login, yours without.')}
                            checked={shown.publicResults !== false}
                            disabled={!isPublic}
                            onChange={(value) => saveSetting({ publicResults: value })}
                        />

                        <p className="game-setup-section-title mt-4">{t('New members')}</p>
                        <p className="setting-title">{t('How they join')}</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column gap-2 pt-1">
                                <SelectButton
                                    value={policy}
                                    options={JOIN_POLICIES}
                                    optionLabel="label"
                                    optionValue="value"
                                    onChange={(event) => event.value && event.value !== policy && saveSetting({ joinPolicy: event.value })}
                                    className="p-selectbutton-pills club-join-policy"
                                    aria-label={t('How new members join')}
                                />
                                <span className="text-faint fs-8">{JOIN_POLICIES.find(entry => entry.value === policy)?.hint}</span>
                            </div>
                        </div>

                        <p className="game-setup-section-title mt-4">{t('Hall of Shame')}</p>
                        <SettingSwitch
                            id="club-shame"
                            title={t('Hall of Shame')}
                            hint={t('Badges nobody wants, like Bed and Breakfast or Madhouse, with who holds them on the dashboard and in the games.')}
                            checked={shameOn}
                            onChange={(value) => saveSetting({ shameBadges: value })}
                        />
                        <SettingSwitch
                            id="club-shame-children"
                            title={t('Leave out children under {{shameMinAge}}', { shameMinAge: shameMinAge })}
                            hint={t('Children never hold a shame badge and have no Hall of Shame on their profile; what they threw as children never counts. Players without a date of birth are always left out.')}
                            checked={shown.shameWithoutChildren === true}
                            disabled={!shameOn}
                            onChange={(value) => saveSetting({ shameWithoutChildren: value })}
                        />
                        <p className="setting-title">{t('Age limit')}</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-wrap align-items-center gap-3 pt-1">
                                <InputNumber
                                    value={shameMinAge}
                                    onValueChange={(event) => {
                                        const age = event.value ?? 16;
                                        // the field also reports the value it starts with: only a change is saved
                                        if (age === shameMinAge) return;
                                        setShameMinAge(age);
                                        saveSetting({ shameMinAge: age }, { now: false });
                                    }}
                                    min={6}
                                    max={21}
                                    showButtons
                                    suffix=" years"
                                    disabled={!shameOn || shown.shameWithoutChildren !== true}
                                    inputClassName="text-center"
                                    inputStyle={{ width: '6.5rem' }}
                                    aria-label={t('Age limit')}
                                />
                                <span className="text-faint fs-8">{t('Players count for the Hall of Shame from this birthday on.')}</span>
                            </div>
                        </div>

                        <p className="game-setup-section-title mt-4">{t('Delete')}</p>
                        <p className="setting-title">{t('Delete the club')}</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-wrap align-items-center justify-content-between gap-3 pt-1">
                                <span className="text-faint fs-8" style={{ flex: '1 1 16rem' }}>
                                    {t('With all its games and trainings. Remove its players first, under')}{' '}<Link to="/players" onClick={() => selectClub(club.id)}>{t('Club → Players')}</Link>{t('; players of other clubs stay there.')}
                                </span>
                                <DeletePopup data={club} header={t('Delete Club')} message={t('the club {{name}} with all its games', { name: club.name })} handleDelete={deleteClub} label={t('Delete club')} size="small" />
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>
            {/* the club shirt its members play in */}
            <ClubShirtEditor club={club} key={`shirt-${club.id}`} onSaved={refreshClubs} />
            {/* what the club earned together, and the goals its admins set */}
            <ClubGoalsEditor club={club} key={`goals-${club.id}`} onError={showError} />
            {/* connections to other clubs, to play shared tournaments */}
            <ClubConnections club={club} key={`connections-${club.id}`} onSaved={showSaved} onError={showError} onClubChanged={refreshClubs} />
            {/* the club's own rules for its games */}
            <ClubGameRules club={club} key={club.id} onSaved={refreshClubs} />
        </div>
    );
};

export default ClubEditPage;
