import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';

import PlayerService from '../../services/player.service';
import CountryPicker from '../elements/country.picker';
import ImageUploader from '../elements/image.uploader';
import PlayerLogin from '../elements/player.login';
import PlayerContact from '../elements/player.contact';
import SettingSwitch from '../elements/setting.switch';
import UpLink from '../elements/up.link';
import PlayerCheckoutPreferences from './player.checkout.preferences';
import PlayerDartPreferences from './player.dart.preferences';
import PlayerClubs from './player.clubs';
import SectionTitle from '../elements/section.title';
import { useAuth } from '../../utils/auth.context';
import useAutoSave from '../../utils/use.auto.save';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { t } from '../../utils/i18n';
import { SettingsSkeleton } from '../elements/skeletons';
import { calendarFormat } from '../../utils/dates';

// "1987-02-04" and back for the calendar, in local time so the day stays the day
const toDate = (value) => {
    const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day) : null;
};
const fromDate = (date) => date instanceof Date && !Number.isNaN(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';
// with no date yet the calendar opens ten years back: most new players with a date that matters are children
const tenYearsAgo = () => new Date(new Date().getFullYear() - 10, 0, 1);

const fieldsOf = (player) => ({
    nickname: player.nickname ?? '',
    firstname: player.firstname ?? '',
    lastname: player.lastname ?? '',
    dateOfBirth: String(player.dateOfBirth ?? '').slice(0, 10),
    country: player.country ?? '',
});

/**
 * A club admin edits one of the club's players on a page of its own, laid
 * out as the player profile: picture, nickname, name and date of birth;
 * whether the nickname is public and the login; the ways out and the darts.
 * Everything saves as you go. A player with a login keeps their name,
 * nickname and picture up to date themselves; the admins set the date of
 * birth.
 */
const PlayerEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useRef(null);
    const { isClubAdmin, user, clubs, activeClub } = useAuth();
    // an admin of several clubs adds players to the others, or moves them
    const managesSeveralClubs = clubs.filter(club => club.role === 'admin').length > 1;
    const [player, setPlayer] = useState(null);
    const [failed, setFailed] = useState(false);
    const [fields, setFields] = useState(null);
    const [preview, setPreview] = useState('');
    // the switch as just chosen, shown at once while it is saved
    const [publicChosen, setPublicChosen] = useState(null);
    // how the saving goes in the parts that save themselves
    const [checkoutStatus, setCheckoutStatus] = useState(null);
    const [dartStatus, setDartStatus] = useState(null);
    const [flightsStatus, setFlightsStatus] = useState(null);
    // the fields as last valid: a new picture goes with them
    const lastValid = useRef(null);

    const load = useCallback(async () => {
        try {
            const loaded = await PlayerService.getPlayer(id);
            if (!loaded) throw new Error(t('Not found'));
            setPlayer(loaded);
            setFields(fieldsOf(loaded));
            lastValid.current = fieldsOf(loaded);
            setPreview(resolvePlayerImg(loaded.profileImg ?? ''));
        } catch {
            setFailed(true);
        }
    }, [id]);
    useEffect(() => { load(); }, [load]);
    // after a save the player again, the fields stay as they are typed
    const refresh = useCallback(async () => {
        const loaded = await PlayerService.getPlayer(id);
        if (loaded) setPlayer(loaded);
    }, [id]);

    const validFields = (values) => values.nickname.trim().length >= 3 && values.nickname.trim().length <= 25
        && values.firstname.trim() && values.lastname.trim() && values.dateOfBirth;
    const formOf = (values) => {
        const formData = new FormData();
        formData.append('nickname', values.nickname.trim());
        formData.append('firstname', values.firstname.trim());
        formData.append('lastname', values.lastname.trim());
        formData.append('dateOfBirth', values.dateOfBirth);
        formData.append('country', values.country);
        return formData;
    };
    // the names a moment after typing, the country and date of birth at once; the picture uploaded at once
    const fieldsSave = useAutoSave(async (values) => {
        await PlayerService.updatePlayer({ id, formData: formOf(values) });
        await refresh();
    }, { valid: (values) => Boolean(validFields(values)) });
    const pictureSave = useAutoSave(async (file) => {
        const formData = formOf(lastValid.current);
        if (file) formData.append('profileImg', file);
        else formData.append('clearProfileImg', 'true');
        await PlayerService.updatePlayer({ id, formData });
        await refresh();
    });
    const publicSave = useAutoSave(async (publicProfile) => {
        await PlayerService.setPublicProfile(id, publicProfile);
        await refresh();
    });
    // opened at the login (from the key of the players list): there once the player is loaded
    useEffect(() => {
        if (player && window.location.hash === '#login') document.getElementById('login')?.scrollIntoView({ block: 'center' });
    }, [player]);

    const showError = (summary, error) => toast.current?.show({ severity: 'error', summary, detail: error.message, life: 4000 });

    if (!isClubAdmin) return <div className="container-fluid p-4 text-subtle">{t('Only the admins of the club edit its players.')}</div>;
    if (failed) return <div className="container-fluid p-4 text-subtle">{t('The player could not be loaded.')}{' '}<Link to="/players">{t('Back to the players')}</Link></div>;
    if (!player || !fields) return <div className="container-fluid p-4 border-0"><SettingsSkeleton boxes={4} /></div>;

    // a player with a login keeps their name, nickname and picture up to date themselves
    const maintainedByPlayer = Boolean(player.user && player.user !== user?.id);
    const changeFields = (patch, options) => {
        const next = { ...fields, ...patch };
        setFields(next);
        if (validFields(next)) lastValid.current = next;
        fieldsSave.change(next, options);
    };
    const togglePublic = (publicProfile) => {
        setPublicChosen(publicProfile);
        publicSave.change(publicProfile, { now: true });
    };
    const publicProfile = publicChosen ?? Boolean(player.publicProfile);
    const nicknameShort = fields.nickname.trim().length < 3;

    // every field as wide as its box (mw-100: not the narrower width of the user profile's fields)
    const field = (key, label, hint, wrong = false, className = '') => (
        <label className={`d-flex flex-column gap-1 profile-field mw-100 ${className}`}>
            <span className="text-subtle fs-8">{label}</span>
            <InputText value={fields[key]} onChange={(event) => changeFields({ [key]: event.target.value })} onBlur={fieldsSave.flush} disabled={maintainedByPlayer} required invalid={wrong} className="w-100 mw-100" />
            {hint && <span className={`fs-8 ${wrong ? 'text-danger' : 'text-faint'}`}>{hint}</span>}
        </label>
    );

    return (
        <div className="container-fluid p-4 border-0">
            <Toast ref={toast} position="bottom-right" />
            <UpLink to="/players" label={t('Players')} />
            <Panel header={t('Edit {{nickname}}', { nickname: player.nickname })}>
                {/* the way to the player's statistics beside the intro, not alone in the middle of a column */}
                <div className="d-flex flex-wrap justify-content-between align-items-center column-gap-4 row-gap-2 mb-3">
                    <p className="text-subtle fs-7 m-0">
                        {player.guest
                            ? t('A guest of a game: their name, nickname, picture and date of birth.')
                            : t('How the player appears in the club, their login and their settings for the games. Everything is saved as you go.')}
                    </p>
                    <Button type="button" label={t('Statistics and badges')} icon="pi pi-chart-line" size="small" severity="secondary" onClick={() => navigate(`/players/${player.id}`)} />
                </div>
                <div className="row g-4">
                    <div className="col-12 col-xl-6">
                        <div className="mb-4">
                            <SectionTitle saves={[fieldsSave, pictureSave]}>{t('The player')}</SectionTitle>
                            {maintainedByPlayer &&
                                <Message
                                    severity="info"
                                    className="w-100 justify-content-start mb-3"
                                    text={t('{{nickname}} has a login and keeps the name, nickname and picture up to date on their profile. The date of birth is up to the club admins (adults may correct it, but never to a child\'s).', { nickname: player.nickname })}
                                />
                            }
                            <p className="setting-title">{t('Picture and nickname')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col my-player-main">
                                    {maintainedByPlayer
                                        ? <Avatar image={preview || undefined} label={preview ? undefined : resolvePlayerInitials(player.firstname, player.lastname)} shape="circle" className="avatar-xl bg-surface-high" />
                                        : <ImageUploader
                                            name={`${fields.firstname} ${fields.lastname}`}
                                            previewUrl={preview}
                                            onFileChange={(file) => { setPreview(URL.createObjectURL(file)); pictureSave.change(file, { now: true }); }}
                                            onFileDelete={() => { setPreview(''); pictureSave.change(null, { now: true }); }}
                                        />
                                    }
                                    {field('nickname', t('Nickname'), t('How the club and the games call the player, 3 to 25 characters.'), !maintainedByPlayer && nicknameShort, 'my-player-nickname')}
                                </div>
                            </div>
                            <p className="setting-title">{t('Name')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col d-flex flex-wrap gap-3 pt-1 profile-name">
                                    {field('firstname', t('First name'), null, !maintainedByPlayer && !fields.firstname.trim())}
                                    {field('lastname', t('Last name'), null, !maintainedByPlayer && !fields.lastname.trim())}
                                </div>
                            </div>
                            <p className="setting-title">{t('Country')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col d-flex flex-column gap-1 pt-1">
                                    <CountryPicker value={fields.country} onChange={(country) => changeFields({ country: country ?? '' }, { now: true })} disabled={maintainedByPlayer} className="w-100" />
                                    <span className="text-faint fs-8">{maintainedByPlayer ? t('{{nickname}} has a login and chooses the country on their profile.', { nickname: player.nickname }) : t('Where the player comes from: the flag is shown next to the nickname.')}</span>
                                </div>
                            </div>
                            <p className="setting-title">{t('Date of birth')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col pt-1">
                                    <label className="d-flex flex-column gap-1 profile-field mw-100">
                                        <Calendar
                                            value={toDate(fields.dateOfBirth)}
                                            onChange={(event) => changeFields({ dateOfBirth: fromDate(event.value) }, { now: true })}
                                            dateFormat={calendarFormat()}
                                            mask="99.99.9999"
                                            maxDate={new Date()}
                                            viewDate={fields.dateOfBirth ? undefined : tenYearsAgo()}
                                            showIcon
                                            icon="pi pi-calendar"
                                            aria-label={t('Date of birth')}
                                            className="w-100"
                                        />
                                        {fields.dateOfBirth
                                            ? <span className="text-faint fs-8">{t('For fair handicaps between players of different ages, and the Hall of Shame: a player without one is never in it.')}</span>
                                            : <small className="p-error">{t('Needed to save the player: for fair handicaps, and the Hall of Shame leaves out a player without one.')}</small>}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!player.guest && (
                        <div className="col-12 col-xl-6">
                            <SectionTitle saves={[checkoutStatus, dartStatus]}>{t('In games')}</SectionTitle>
                            <p className="setting-title">{t('Ways out in X01')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col">
                                    <PlayerCheckoutPreferences player={player} onStatus={setCheckoutStatus} />
                                </div>
                            </div>
                            <PlayerDartPreferences part="animation" player={player} onStatus={setDartStatus} onError={(error) => showError(t('Darts on the board'), error)} />

                            {/* the club's part here too, so the two columns end about together */}
                            <div className="mt-4">
                                <SectionTitle saves={[publicSave]}>{t('In the club')}</SectionTitle>
                                <SettingSwitch
                                    id={`player-public-${player.id}`}
                                    title={t('Nickname on the public page')}
                                    hint={`${publicProfile ? t('The nickname appears with the live games and results of the club, if the club is public.') : t('The player is shown without a name on the public page.')}${maintainedByPlayer ? t(' {{nickname}} has a login and decides this on their profile.', { nickname: player.nickname }) : ''}`}
                                    checked={publicProfile}
                                    disabled={maintainedByPlayer}
                                    onChange={togglePublic}
                                />
                                <p className="setting-title" id="login">{t('Login')}</p>
                                <div className="row mx-0 mt-0 setting-body">
                                    <div className="col">
                                        <PlayerLogin player={player} onChange={refresh} />
                                    </div>
                                </div>
                                {!player.user && (
                                    <>
                                        <p className="setting-title" id="mails">{t('Mails without a login')}</p>
                                        <div className="row mx-0 mt-0 setting-body">
                                            <div className="col pt-1">
                                                <PlayerContact
                                                    player={player}
                                                    club={activeClub}
                                                    onSaved={(summary) => toast.current?.show({ severity: 'success', summary, detail: player.nickname, life: 3000 })}
                                                    onError={showError}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                {managesSeveralClubs && <>
                                    <p className="game-setup-section-title mt-4">{t('Clubs')}</p>
                                    <PlayerClubs
                                        player={player}
                                        onSaved={(summary) => toast.current?.show({ severity: 'success', summary, detail: player.nickname, life: 3000 })}
                                        onError={showError}
                                        // no longer in this club: back to its players
                                        onLeft={(summary) => navigate('/players', { state: { notice: `${summary}: ${player.nickname}` } })}
                                    />
                                </>}
                            </div>
                        </div>
                    )}
                    {/* the flights and barrels are many tiles: across the whole width, under both columns */}
                    {!player.guest && (
                        <div className="col-12">
                            <SectionTitle saves={[flightsStatus]}>{t('Their darts')}</SectionTitle>
                            <PlayerDartPreferences part="flights" player={player} onStatus={setFlightsStatus} onError={(error) => showError(t('Darts on the board'), error)} />
                        </div>
                    )}
                </div>
            </Panel>
        </div>
    );
};

export default PlayerEditPage;
