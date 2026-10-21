import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
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
import DeletePopup from '../elements/delete.popup';
import ImageUploader from '../elements/image.uploader';
import SettingSwitch from '../elements/setting.switch';
import { useAuth } from '../../utils/auth.context';
import { resolveClubLogo } from '../../utils/image.utils';

const DESCRIPTION_MAX = 500;
const EMPTY_ADMIN = { email: '', firstname: '', lastname: '', password: '' };

// how new members come in, with what it means
const JOIN_POLICIES = [
    { label: 'Open', value: 'open', hint: 'Anyone with an account finds the club under Join a club and becomes a member at once. The admins are told who joined.' },
    { label: 'Admins accept', value: 'approval', hint: 'Anyone with an account can ask to join. One of the admins accepts or declines, on the players page.' },
    { label: 'Closed', value: 'closed', hint: 'The club is not listed under Join a club. Only the admins add players and give them a login.' },
];

/**
 * A club admin edits the club on a page of its own, laid out as the player
 * profile: what the club is (logo, name, description) and its admins on the
 * left, saved with Save; on the right what it shows on the public page, how
 * new members come in and the Hall of Shame, each saved right away; at the
 * bottom deleting the club.
 */
const ClubEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useRef(null);
    const { clubs, refreshClubs, selectClub, user, mailEnabled } = useAuth();
    const club = clubs.find(entry => entry.id === id);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoPreview, setLogoPreview] = useState('');
    // 'unchanged' | File (a new logo) | null (the logo removed)
    const [logo, setLogo] = useState('unchanged');
    const [saving, setSaving] = useState(false);
    const [newAdmin, setNewAdmin] = useState(EMPTY_ADMIN);
    const [adding, setAdding] = useState(false);
    const [shameMinAge, setShameMinAge] = useState(16);
    // the age limit is saved once it stopped changing (the buttons count up and down)
    const ageTimer = useRef(null);

    // the fields start from the club, and again after it was saved
    const loadedId = useRef(null);
    useEffect(() => {
        if (!club || loadedId.current === club.id) return;
        loadedId.current = club.id;
        setName(club.name);
        setDescription(club.description ?? '');
        setLogoPreview(resolveClubLogo(club.logo));
        setLogo('unchanged');
        setShameMinAge(club.shameMinAge ?? 16);
    }, [club]);

    if (!club) return clubs.length ? <Navigate replace to="/my-clubs" /> : null;
    if (club.role !== CLUB_ROLES.ADMIN) return <Navigate replace to="/my-clubs" />;

    const showError = (summary, error) => toast.current?.show({ severity: 'error', summary, detail: error.message, life: 4000 });
    const showSaved = (detail) => toast.current?.show({ severity: 'success', summary: 'Saved', detail, life: 2500 });

    const changed = name.trim() !== club.name || description !== (club.description ?? '') || logo !== 'unchanged';

    const saveClub = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await ClubService.updateClub(club.id, { name: name.trim(), description });
            if (logo instanceof File) await ClubService.uploadLogo(club.id, logo);
            else if (logo === null && club.logo) await ClubService.removeLogo(club.id);
            await refreshClubs();
            setLogo('unchanged');
            showSaved(name.trim());
        } catch (error) {
            showError('Save the club', error);
        } finally {
            setSaving(false);
        }
    };

    // a setting on the right: saved at once, the name goes along (the API needs it)
    const saveSetting = async (changes, detail) => {
        try {
            await ClubService.updateClub(club.id, { name: club.name, ...changes });
            await refreshClubs();
            showSaved(detail);
        } catch (error) {
            showError('Club settings', error);
        }
    };

    const addAdmin = async (event) => {
        event.preventDefault();
        setAdding(true);
        try {
            await ClubService.addAdmin(club.id, newAdmin);
            setNewAdmin(EMPTY_ADMIN);
            await refreshClubs();
            showSaved(`${newAdmin.email} is an admin of ${club.name} now.`);
        } catch (error) {
            showError('Add an admin', error);
        } finally {
            setAdding(false);
        }
    };

    const removeAdmin = async (admin) => {
        try {
            await ClubService.removeAdmin(club.id, admin.id);
            await refreshClubs();
            showSaved(`${admin.firstname} ${admin.lastname} is no longer an admin.`);
        } catch (error) {
            showError('Remove an admin', error);
        }
    };

    const deleteClub = async () => {
        try {
            await ClubService.deleteClub(club.id);
            await refreshClubs();
            navigate('/my-clubs', { replace: true });
        } catch (error) {
            showError('Delete the club', error);
        }
    };

    const field = (key) => (event) => setNewAdmin(current => ({ ...current, [key]: event.target.value }));
    const isPublic = Boolean(club.isPublic);
    const shameOn = club.shameBadges !== false;
    const policy = club.joinPolicy ?? 'closed';

    return (
        <div className="container-fluid p-4 border-0">
            <Toast ref={toast} position="bottom-right" />
            <Panel header={`Edit ${club.name}`}>
                <p className="text-subtle fs-7 mt-0 mb-3">
                    What the club is and who runs it, what it shows of itself and how new members come in. The settings on the right are saved right away.
                </p>
                <div className="row g-4">
                    <div className="col-12 col-xl-6">
                        <form onSubmit={saveClub}>
                            <p className="game-setup-section-title">The club</p>
                            <p className="setting-title">Logo and name</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col my-player-main">
                                    <ImageUploader
                                        name={name}
                                        previewUrl={logoPreview}
                                        onFileChange={(file) => { setLogo(file); setLogoPreview(URL.createObjectURL(file)); }}
                                        onFileDelete={() => { setLogo(null); setLogoPreview(''); }}
                                    />
                                    <label className="d-flex flex-column gap-1 profile-field">
                                        <span className="text-subtle fs-8">Name</span>
                                        <InputText value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={50} required />
                                        <span className="text-faint fs-8">3 to 50 characters.</span>
                                    </label>
                                </div>
                            </div>
                            <p className="setting-title">Description</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col d-flex flex-column gap-1 pt-1">
                                    <InputTextarea
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        maxLength={DESCRIPTION_MAX}
                                        rows={4}
                                        autoResize
                                        placeholder="Where and when you play, who can join, …"
                                        aria-label="Description"
                                    />
                                    <span className="text-faint fs-8 text-end">{description.length} / {DESCRIPTION_MAX} · shown on My clubs, under Join a club and, for a public club, on the start page</span>
                                </div>
                            </div>
                            <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mb-4">
                                <Button type="button" label="Back to my clubs" icon="pi pi-arrow-left" size="small" severity="secondary" onClick={() => navigate('/my-clubs')} />
                                <Button type="submit" label="Save" icon="pi pi-save" size="small" loading={saving} disabled={!changed || name.trim().length < 3} />
                            </div>
                        </form>

                        <p className="game-setup-section-title">Admins</p>
                        <p className="setting-title">Who runs the club</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column gap-2 pt-1">
                                {club.admins.map(admin => (
                                    <div key={admin.id} className="d-flex justify-content-between align-items-center gap-3">
                                        <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                                            <span className="text-default fw-semibold text-break">
                                                {admin.firstname} {admin.lastname}{admin.id === user.id && <span className="text-faint fw-normal"> (you)</span>}
                                            </span>
                                            <span className="text-subtle fs-8 text-break">{admin.email}</span>
                                        </div>
                                        {club.admins.length > 1 &&
                                            <Button type="button" icon="pi pi-times" text rounded severity="secondary" size="small" aria-label={`Remove ${admin.email} as admin`} title="Remove as admin" onClick={() => removeAdmin(admin)} />}
                                    </div>
                                ))}
                                <span className="text-faint fs-8">Every admin can do everything in the club. A club always keeps one.</span>
                            </div>
                        </div>
                        <p className="setting-title">Add an admin</p>
                        <form onSubmit={addAdmin} className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column gap-2 pt-1">
                                <span className="text-faint fs-8">
                                    For someone with an account the email is enough. Otherwise the name too, and a new account is made
                                    {mailEnabled ? '; without a password they get a mail to choose their own.' : ' with the initial password you enter.'}
                                </span>
                                <InputText type="email" value={newAdmin.email} onChange={field('email')} placeholder="Email" aria-label="Email" required />
                                <div className="d-flex flex-wrap gap-2">
                                    <InputText value={newAdmin.firstname} onChange={field('firstname')} placeholder="First name (new account)" aria-label="First name" className="flex-grow-1" />
                                    <InputText value={newAdmin.lastname} onChange={field('lastname')} placeholder="Last name (new account)" aria-label="Last name" className="flex-grow-1" />
                                </div>
                                <Password
                                    autoComplete="new-password"
                                    value={newAdmin.password}
                                    onChange={field('password')}
                                    placeholder={mailEnabled ? 'Initial password (optional)' : 'Initial password (new account)'}
                                    aria-label="Initial password"
                                    feedback={false}
                                    className="w-100"
                                    inputClassName="w-100"
                                />
                                <div className="d-flex justify-content-end">
                                    <Button type="submit" label="Add admin" icon="pi pi-user-plus" size="small" loading={adding} />
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="col-12 col-xl-6">
                        <p className="game-setup-section-title">Public page</p>
                        <SettingSwitch
                            id="club-public"
                            title="Public club"
                            hint="Listed by name on the public start page, with its figures. Whether people with an account can find and join the club is set under New members."
                            checked={isPublic}
                            onChange={(value) => saveSetting({ isPublic: value }, value ? 'The club is public.' : 'The club is private.')}
                        />
                        <SettingSwitch
                            id="club-live"
                            title="Show running games"
                            hint="Live scores of games in progress appear on the public start page."
                            checked={club.publicLiveGames !== false}
                            disabled={!isPublic}
                            onChange={(value) => saveSetting({ publicLiveGames: value }, value ? 'Running games are shown.' : 'Running games are hidden.')}
                        />
                        <SettingSwitch
                            id="club-results"
                            title="Show results"
                            hint="Finished games appear under the latest results. Players are shown without their name unless their nickname is public: their own choice with a login, yours without."
                            checked={club.publicResults !== false}
                            disabled={!isPublic}
                            onChange={(value) => saveSetting({ publicResults: value }, value ? 'Results are shown.' : 'Results are hidden.')}
                        />

                        <p className="game-setup-section-title mt-4">New members</p>
                        <p className="setting-title">How they join</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-column gap-2 pt-1">
                                <SelectButton
                                    value={policy}
                                    options={JOIN_POLICIES}
                                    optionLabel="label"
                                    optionValue="value"
                                    onChange={(event) => event.value && event.value !== policy && saveSetting({ joinPolicy: event.value }, `New members: ${JOIN_POLICIES.find(entry => entry.value === event.value).label}.`)}
                                    className="p-selectbutton-pills club-join-policy"
                                    aria-label="How new members join"
                                />
                                <span className="text-faint fs-8">{JOIN_POLICIES.find(entry => entry.value === policy)?.hint}</span>
                            </div>
                        </div>

                        <p className="game-setup-section-title mt-4">Hall of Shame</p>
                        <SettingSwitch
                            id="club-shame"
                            title="Hall of Shame"
                            hint="Badges nobody wants, like Bed and Breakfast or Madhouse, with who holds them on the dashboard and in the games."
                            checked={shameOn}
                            onChange={(value) => saveSetting({ shameBadges: value }, value ? 'The Hall of Shame is on.' : 'The Hall of Shame is off.')}
                        />
                        <SettingSwitch
                            id="club-shame-children"
                            title={`Leave out children under ${shameMinAge}`}
                            hint="Children never hold a shame badge and have no Hall of Shame on their profile; what they threw as children never counts. Players without a date of birth are always left out."
                            checked={club.shameWithoutChildren === true}
                            disabled={!shameOn}
                            onChange={(value) => saveSetting({ shameWithoutChildren: value }, value ? `Children under ${shameMinAge} are left out.` : 'Children count too.')}
                        />
                        <p className="setting-title">Age limit</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-wrap align-items-center gap-3 pt-1">
                                <InputNumber
                                    value={shameMinAge}
                                    onValueChange={(event) => {
                                        const age = event.value ?? 16;
                                        setShameMinAge(age);
                                        clearTimeout(ageTimer.current);
                                        if (age !== (club.shameMinAge ?? 16)) ageTimer.current = setTimeout(() => saveSetting({ shameMinAge: age }, `Players count from ${age}.`), 700);
                                    }}
                                    min={6}
                                    max={21}
                                    showButtons
                                    suffix=" years"
                                    disabled={!shameOn || club.shameWithoutChildren !== true}
                                    inputClassName="text-center"
                                    inputStyle={{ width: '6.5rem' }}
                                    aria-label="Age limit"
                                />
                                <span className="text-faint fs-8">Players count for the Hall of Shame from this birthday on.</span>
                            </div>
                        </div>

                        <p className="game-setup-section-title mt-4">Delete</p>
                        <p className="setting-title">Delete the club</p>
                        <div className="row mx-0 mt-0 setting-body">
                            <div className="col d-flex flex-wrap align-items-center justify-content-between gap-3 pt-1">
                                <span className="text-faint fs-8" style={{ flex: '1 1 16rem' }}>
                                    With all its games and trainings. Remove its players first, under <Link to="/players" onClick={() => selectClub(club.id)}>Club → Players</Link>; players of other clubs stay there.
                                </span>
                                <DeletePopup data={club} header="Delete Club" message={`the club ${club.name} with all its games`} handleDelete={deleteClub} label="Delete club" size="small" />
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>
        </div>
    );
};

export default ClubEditPage;
