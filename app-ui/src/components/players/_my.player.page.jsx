import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';

import AuthService, { announceMyPlayersChange } from '../../services/auth.service';
import PlayerService from '../../services/player.service';
import CountryPicker from '../elements/country.picker';
import ImageUploader from '../elements/image.uploader';
import ClubLogo from '../elements/club.logo';
import SectionTitle from '../elements/section.title';
import SettingSwitch from '../elements/setting.switch';
import PlayerCheckoutPreferences from './player.checkout.preferences';
import PlayerDartPreferences from './player.dart.preferences';
import ShirtChooser from '../shirts/shirt.chooser';
import { useAuth } from '../../utils/auth.context';
import useAutoSave from '../../utils/use.auto.save';
import { resolvePlayerImg } from '../../utils/image.utils';
import { t } from '../../utils/i18n';
import { SettingsSkeleton } from '../elements/skeletons';
import { calendarFormat, formatDate } from '../../utils/dates';

// "1987-02-04" and back for the calendar, in local time so the day stays the day
const toDate = (value) => {
    const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day) : null;
};
const fromDate = (date) => date instanceof Date && !Number.isNaN(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';
// how old someone born on that day is today
const ageOf = (value) => {
    const born = toDate(value);
    if (!born) return null;
    const today = new Date();
    const age = today.getFullYear() - born.getFullYear();
    return today < new Date(today.getFullYear(), born.getMonth(), born.getDate()) ? age - 1 : age;
};

/**
 * One player the user plays as. part 'player': nickname and picture to edit,
 * the name from the account and the date of birth from the club admins,
 * whether the nickname shows on the public page and the trainings to the
 * club, and the flights and barrels. part 'playing': what the X01 tips aim
 * at, the handicap and the dart animation. Everything saves as you go.
 */
const MyPlayer = ({ player, multiple = false, onSaved, onError, part = 'player' }) => {
    const navigate = useNavigate();
    const { activeClub, selectClub } = useAuth();
    const [nickname, setNickname] = useState(player.nickname);
    const [country, setCountry] = useState(player.country ?? '');
    const [birth, setBirth] = useState(String(player.dateOfBirth ?? '').slice(0, 10));
    const [preview, setPreview] = useState(resolvePlayerImg(player.profileImg));
    const [current, setCurrent] = useState(player);
    // the switches as just chosen, shown at once while they are saved
    const [switches, setSwitches] = useState({});
    // how the saving goes in the parts that save themselves
    const [checkoutStatus, setCheckoutStatus] = useState(null);
    const [animationStatus, setAnimationStatus] = useState(null);
    const [shirtStatus, setShirtStatus] = useState(null);
    const [flightsStatus, setFlightsStatus] = useState(null);

    // the player is edited in one of its clubs: the selected one when it plays there
    const clubId = player.clubs.some(club => club.id === activeClub?.id) ? activeClub.id : player.clubs[0]?.id;
    const anyPublic = player.clubs.some(club => club.isPublic);

    // a date of birth is only sent where the player may correct it (an adult), never to a child's
    const tooYoung = (value) => Boolean(player.birthEditable && value && ageOf(value) < player.birthMinAge);
    const validFields = (values) => {
        const length = values.nickname.trim().length;
        return length >= 3 && length <= 25 && !tooYoung(values.birth);
    };
    const formOf = (values) => {
        const formData = new FormData();
        formData.append('nickname', values.nickname.trim());
        formData.append('country', values.country);
        if (player.birthEditable && values.birth) formData.append('dateOfBirth', values.birth);
        return formData;
    };
    // the fields as last valid: a new picture goes with them
    const lastValid = useRef({ nickname: player.nickname, country: player.country ?? '', birth: String(player.dateOfBirth ?? '').slice(0, 10) });

    // the nickname a moment after typing, the country and date of birth at once; the picture uploaded at once
    const fieldsSave = useAutoSave(async (values) => {
        await PlayerService.updatePlayer({ id: player.id, formData: formOf(values), clubId });
        onSaved();
    }, { valid: validFields });
    const pictureSave = useAutoSave(async (file) => {
        const formData = formOf(lastValid.current);
        if (file) formData.append('profileImg', file);
        else formData.append('clearProfileImg', 'true');
        await PlayerService.updatePlayer({ id: player.id, formData, clubId });
        onSaved();
    });
    const publicSave = useAutoSave((publicProfile) => PlayerService.setPublicProfile(player.id, publicProfile, clubId));
    const trainingsSave = useAutoSave((privateTrainings) => PlayerService.setTrainingPrivacy(player.id, privateTrainings, clubId));

    const changeFields = (patch, options) => {
        const next = { nickname, country, birth, ...patch };
        if ('nickname' in patch) setNickname(patch.nickname);
        if ('country' in patch) setCountry(patch.country);
        if ('birth' in patch) setBirth(patch.birth);
        if (validFields(next)) lastValid.current = next;
        fieldsSave.change(next, options);
    };
    const toggleTrainings = (visible) => {
        setSwitches(chosen => ({ ...chosen, privateTrainings: !visible }));
        trainingsSave.change(!visible, { now: true });
    };
    const togglePublic = (publicProfile) => {
        setSwitches(chosen => ({ ...chosen, publicProfile }));
        publicSave.change(publicProfile, { now: true });
    };
    const shown = { ...current, ...switches };
    const nicknameLength = nickname.trim().length;
    const birthTooYoung = tooYoung(birth);

    // statistics and badges belong to a club: the app switches to it first
    const openStatistics = () => {
        if (clubId !== activeClub?.id) selectClub(clubId);
        navigate(`/players/${player.id}`);
    };

    if (part === 'playing') {
        return (
            <section className="my-player">
                <SectionTitle saves={[checkoutStatus, animationStatus]}>{multiple ? player.nickname : t('Your player in games')}</SectionTitle>
                <p className="setting-title">{t('Doubles, treble and handicap')}</p>
                <div className="row mx-0 mt-0 setting-body">
                    <div className="col">
                        <PlayerCheckoutPreferences player={current} clubId={clubId} onSaved={setCurrent} onStatus={setCheckoutStatus} />
                    </div>
                </div>
                <PlayerDartPreferences part="animation" player={current} clubId={clubId} onSaved={setCurrent} onStatus={setAnimationStatus} onError={(error) => onError(t('Darts on the board'), error)} />
            </section>
        );
    }

    return (
        <section className="my-player row g-4">
            {/* laid out as the game setup: a section title, then a box per setting; side by side on wide screens */}
            <div className="col-12 col-xl-6">
                <div className="mb-4">
                    <SectionTitle saves={[fieldsSave, pictureSave]}>{multiple ? player.nickname : t('You as a player')}</SectionTitle>
                    <p className="setting-title">{t('Picture and nickname')}</p>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col my-player-main">
                            <ImageUploader
                                name={`${player.firstname} ${player.lastname}`}
                                previewUrl={preview}
                                onFileChange={(file) => { setPreview(URL.createObjectURL(file)); pictureSave.change(file, { now: true }); }}
                                onFileDelete={() => { setPreview(''); pictureSave.change(null, { now: true }); }}
                            />
                            <label className="my-player-nickname d-flex flex-column gap-1">
                                <span className="text-subtle fs-8">{t('Nickname')}</span>
                                <InputText value={nickname} onChange={(event) => changeFields({ nickname: event.target.value })} onBlur={fieldsSave.flush} minLength={3} maxLength={25} required invalid={nicknameLength < 3} />
                                <span className={`fs-8 ${nicknameLength < 3 ? 'text-danger' : 'text-faint'}`}>{t('How the club and the games call you, 3 to 25 characters.')}</span>
                            </label>
                        </div>
                    </div>

                    <p className="setting-title">{t('Country')}</p>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col d-flex flex-column gap-1 pt-1">
                            <CountryPicker value={country} onChange={(value) => changeFields({ country: value ?? '' }, { now: true })} />
                            <span className="text-faint fs-8">{t('Where you come from: the flag is shown next to your nickname, in all your clubs.')}</span>
                        </div>
                    </div>
                    <p className="setting-title">{t('About you')}</p>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col d-flex flex-column gap-3">
                            <dl className="my-player-facts">
                                <div>
                                    <dt>{t('Name')}</dt>
                                    <dd>{player.firstname} {player.lastname} <span className="text-faint">{t('· from your')}{' '}<Link to="/profile">{t('account')}</Link></span></dd>
                                </div>
                                {!player.birthEditable &&
                                    <div>
                                        <dt>{t('Date of birth')}</dt>
                                        <dd>
                                            {player.dateOfBirth ? formatDate(player.dateOfBirth) : <span className="text-faint">{t('not set yet')}</span>}
                                            <span className="text-faint">{' '}{t('· set by your club admins')}</span>
                                        </dd>
                                    </div>
                                }
                                <div>
                                    <dt>{t('Plays in')}</dt>
                                    <dd className="my-player-clubs">
                                        {player.clubs.map(club => (
                                            <span key={club.id} className="my-player-club">
                                                <ClubLogo club={club} size="xs" />
                                                {club.name}
                                            </span>
                                        ))}
                                    </dd>
                                </div>
                            </dl>
                            {player.birthEditable &&
                                <label className="d-flex flex-column gap-1">
                                    <span className="text-subtle fs-8">{t('Date of birth')}</span>
                                    <Calendar
                                        value={toDate(birth)}
                                        onChange={(event) => changeFields({ birth: fromDate(event.value) }, { now: true })}
                                        dateFormat={calendarFormat()}
                                        mask="99.99.9999"
                                        maxDate={new Date()}
                                        showIcon
                                        icon="pi pi-calendar"
                                        className="my-player-birth"
                                        invalid={birthTooYoung}
                                    />
                                    <span className={`fs-8 ${birthTooYoung ? 'text-danger' : 'text-faint'}`}>{t('You can correct it as an adult; a date under')}{' '}{player.birthMinAge}{' '}{t('years is up to your club admins.')}</span>
                                </label>
                            }
                        </div>
                    </div>

                    <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mb-4">
                        <Button type="button" label={t('Statistics and badges')} icon="pi pi-chart-line" size="small" severity="secondary" onClick={openStatistics} />
                    </div>
                </div>

                <SectionTitle saves={[publicSave, trainingsSave]}>{t('In your clubs')}</SectionTitle>
                <SettingSwitch
                    id={`my-player-public-${player.id}`}
                    title={t('Show my nickname on the public page')}
                    hint={t('{{value}} Your decision: the club admins cannot change it.', { value: anyPublic ? t('Your nickname appears with the live games and results of your public clubs; otherwise you are shown without a name.') : t('None of your clubs is public, so this only matters once one of them is.') })}
                    checked={!!shown.publicProfile}
                    onChange={togglePublic}
                />
                <SettingSwitch
                    id={`my-player-trainings-${player.id}`}
                    title={t('Show my trainings to the club')}
                    hint={shown.privateTrainings
                        ? t('Only you and the club admins see your trainings; they are left out of the scoreboard for the others.')
                        : t('The other players see your trainings in the list and on the Around the Clock scoreboard.')}
                    checked={!shown.privateTrainings}
                    onChange={toggleTrainings}
                />

            </div>

            <div className="col-12 col-xl-6">
                <SectionTitle id="shirt" saves={[shirtStatus]}>{t('Your shirt')}</SectionTitle>
                <div className="row mx-0 mt-0 setting-body mb-4">
                    <div className="col">
                        <ShirtChooser player={{ ...current, nickname: nicknameLength >= 3 ? nickname.trim() : current.nickname }} club={player.clubs.find(club => club.id === clubId)} clubId={clubId} onStatus={setShirtStatus} />
                    </div>
                </div>
                <SectionTitle saves={[flightsStatus]}>{t('Your darts')}</SectionTitle>
                <PlayerDartPreferences part="flights" player={current} clubId={clubId} onSaved={setCurrent} onStatus={setFlightsStatus} onError={(error) => onError(t('Darts on the board'), error)} />
            </div>
        </section>
    );
};

/**
 * The players the user plays as (usually one, also when it plays in several
 * clubs), kept up to date by the user themselves, for a tab of the profile:
 * part 'player' or 'playing' (see MyPlayer), saved as you go. onError(summary, error)
 * for what goes wrong in an action (unlocking a flight).
 */
export const MyPlayers = ({ part, onError }) => {
    const [players, setPlayers] = useState(null);
    const [failed, setFailed] = useState(false);

    const load = useCallback(() => AuthService.getMyPlayers().then(setPlayers).catch(() => setFailed(true)), []);
    useEffect(() => { load(); }, [load]);

    // the rest of the app (the menu, the dashboard) learns of the new nickname or picture
    const saved = () => {
        announceMyPlayersChange();
        load();
    };

    if (failed) return <p className="text-subtle fs-7 m-0">{t('Your profile could not be loaded. Please reload the page.')}</p>;
    if (!players) return <SettingsSkeleton boxes={part === 'player' ? 3 : 2} />;
    if (players.length === 0) {
        return <p className="text-subtle fs-7 m-0">{t('You do not play in a club yet. A club admin can give your player a login, or add yourself as a player of a club you run under')}{' '}<Link to="/my-clubs">{t('My clubs')}</Link>.</p>;
    }
    return (
        <div className="d-flex flex-column gap-4">
            {part === 'player' && players.length > 1 && <p className="text-subtle fs-7 m-0">{t('You play as more than one player; your picture is the same for all of them.')}</p>}
            {players.map(player => <MyPlayer key={`${part}-${player.id}`} part={part} player={player} multiple={players.length > 1} onSaved={saved} onError={onError} />)}
        </div>
    );
};

// the player profile is a tab of the profile now
const MyPlayerPage = () => <Navigate replace to="/profile#player" />;

export default MyPlayerPage;
