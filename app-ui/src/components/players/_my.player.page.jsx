import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Toast } from 'primereact/toast';
import dayjs from 'dayjs';

import AuthService, { announceMyPlayersChange } from '../../services/auth.service';
import PlayerService from '../../services/player.service';
import ImageUploader from '../elements/image.uploader';
import PageLoader from '../elements/page.loader';
import ClubLogo from '../elements/club.logo';
import SettingSwitch from '../elements/setting.switch';
import PlayerCheckoutPreferences from './player.checkout.preferences';
import PlayerDartPreferences from './player.dart.preferences';
import { useAuth } from '../../utils/auth.context';
import { resolvePlayerImg } from '../../utils/image.utils';
import { t } from '../../utils/i18n';

// "1987-02-04" and back for the calendar, in local time so the day stays the day
const toDate = (value) => {
    const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day) : null;
};
const fromDate = (date) => date instanceof Date && !Number.isNaN(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';

/**
 * One player the user plays as: nickname and picture to edit, the name from
 * the account and the date of birth from the club admins, whether the
 * nickname shows on the public page and what the X01 tips aim at.
 */
const MyPlayer = ({ player, multiple = false, onSaved, onError }) => {
    const navigate = useNavigate();
    const { activeClub, selectClub } = useAuth();
    const [nickname, setNickname] = useState(player.nickname);
    const savedBirth = String(player.dateOfBirth ?? '').slice(0, 10);
    const [birth, setBirth] = useState(savedBirth);
    const [image, setImage] = useState({ action: 'unchanged', file: null, preview: resolvePlayerImg(player.profileImg) });
    const [saving, setSaving] = useState(false);
    const [current, setCurrent] = useState(player);

    // the player is edited in one of its clubs: the selected one when it plays there
    const clubId = player.clubs.some(club => club.id === activeClub?.id) ? activeClub.id : player.clubs[0]?.id;
    const birthChanged = player.birthEditable && birth && birth !== savedBirth;
    const changed = nickname.trim() !== player.nickname || image.action !== 'unchanged' || birthChanged;
    const anyPublic = player.clubs.some(club => club.isPublic);

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('nickname', nickname.trim());
            if (birthChanged) formData.append('dateOfBirth', birth);
            if (image.action === 'new' && image.file) formData.append('profileImg', image.file);
            if (image.action === 'cleared') formData.append('clearProfileImg', 'true');
            await PlayerService.updatePlayer({ id: player.id, formData, clubId });
            setImage(value => ({ ...value, action: 'unchanged', file: null }));
            onSaved(t('Player profile'), t('Your player profile is saved.'));
        } catch (error) {
            onError(t('Player profile'), error);
        } finally {
            setSaving(false);
        }
    };

    const toggleTrainings = async (shown) => {
        try {
            setCurrent(await PlayerService.setTrainingPrivacy(player.id, !shown, clubId));
        } catch (error) {
            onError(t('Trainings'), error);
        }
    };

    const togglePublic = async (publicProfile) => {
        try {
            setCurrent(await PlayerService.setPublicProfile(player.id, publicProfile, clubId));
        } catch (error) {
            onError(t('Public nickname'), error);
        }
    };

    // statistics and badges belong to a club: the app switches to it first
    const openStatistics = () => {
        if (clubId !== activeClub?.id) selectClub(clubId);
        navigate(`/players/${player.id}`);
    };

    return (
        <section className="my-player row g-4">
            {/* laid out as the game setup: a section title, then a box per setting; side by side on wide screens */}
            <div className="col-12 col-xl-6">
                <form onSubmit={save}>
                    <p className="game-setup-section-title">{multiple ? player.nickname : t('You as a player')}</p>
                    <p className="setting-title">{t('Picture and nickname')}</p>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col my-player-main">
                            <ImageUploader
                                name={`${player.firstname} ${player.lastname}`}
                                previewUrl={image.preview}
                                onFileChange={(file) => setImage({ action: 'new', file, preview: URL.createObjectURL(file) })}
                                onFileDelete={() => setImage({ action: 'cleared', file: null, preview: '' })}
                            />
                            <label className="my-player-nickname d-flex flex-column gap-1">
                                <span className="text-subtle fs-8">{t('Nickname')}</span>
                                <InputText value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={3} maxLength={25} required />
                                <span className="text-faint fs-8">{t('How the club and the games call you, 3 to 25 characters.')}</span>
                            </label>
                        </div>
                    </div>

                    <p className="setting-title">{t('About you')}</p>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col d-flex flex-column gap-3">
                            <dl className="my-player-facts">
                                <div>
                                    <dt>{t('Name')}</dt>
                                    <dd>{player.firstname} {player.lastname} <span className="text-faint">{t('· from your')}{' '}<Link to="/profile">{t('user profile')}</Link></span></dd>
                                </div>
                                {!player.birthEditable &&
                                    <div>
                                        <dt>{t('Date of birth')}</dt>
                                        <dd>
                                            {player.dateOfBirth ? dayjs(player.dateOfBirth).format('DD.MM.YYYY') : <span className="text-faint">{t('not set yet')}</span>}
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
                                        onChange={(event) => setBirth(fromDate(event.value))}
                                        dateFormat="dd.mm.yy"
                                        mask="99.99.9999"
                                        maxDate={new Date()}
                                        showIcon
                                        icon="pi pi-calendar"
                                        className="my-player-birth"
                                    />
                                    <span className="text-faint fs-8">{t('You can correct it as an adult; a date under')}{' '}{player.birthMinAge}{' '}{t('years is up to your club admins.')}</span>
                                </label>
                            }
                        </div>
                    </div>

                    <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mb-4">
                        <Button type="button" label={t('Statistics and badges')} icon="pi pi-chart-line" size="small" severity="secondary" onClick={openStatistics} />
                        <Button type="submit" label={t('Save')} icon="pi pi-save" size="small" loading={saving} disabled={!changed || nickname.trim().length < 3} />
                    </div>
                </form>

                <p className="game-setup-section-title">{t('In your clubs')}</p>
                <SettingSwitch
                    id={`my-player-public-${player.id}`}
                    title={t('Show my nickname on the public page')}
                    hint={t('{{value}} Your decision: the club admins cannot change it.', { value: anyPublic ? t('Your nickname appears with the live games and results of your public clubs; otherwise you are shown without a name.') : t('None of your clubs is public, so this only matters once one of them is.') })}
                    checked={!!current.publicProfile}
                    onChange={togglePublic}
                />
                <SettingSwitch
                    id={`my-player-trainings-${player.id}`}
                    title={t('Show my trainings to the club')}
                    hint={current.privateTrainings
                        ? t('Only you and the club admins see your trainings; they are left out of the scoreboard for the others.')
                        : t('The other players see your trainings in the list and on the Around the Clock scoreboard.')}
                    checked={!current.privateTrainings}
                    onChange={toggleTrainings}
                />

            </div>

            <div className="col-12 col-xl-6">
                <p className="game-setup-section-title">{t('In games')}</p>
                <p className="setting-title">{t('Ways out in X01')}</p>
                <div className="row mx-0 mt-0 setting-body">
                    <div className="col">
                        <PlayerCheckoutPreferences player={current} clubId={clubId} onSaved={setCurrent} onError={(error) => onError(t('Ways out'), error)} />
                    </div>
                </div>
                <PlayerDartPreferences player={current} clubId={clubId} onSaved={setCurrent} onError={(error) => onError(t('Darts on the board'), error)} />
            </div>
        </section>
    );
};

/**
 * The player profile: the players the user plays as (usually one, also when
 * it plays in several clubs), kept up to date by the user themselves.
 */
const MyPlayerPage = () => {
    const toast = useRef(null);
    const [players, setPlayers] = useState(null);
    const [failed, setFailed] = useState(false);

    const load = useCallback(() => AuthService.getMyPlayers().then(setPlayers).catch(() => setFailed(true)), []);
    useEffect(() => { load(); }, [load]);

    const onSaved = (summary, detail) => {
        toast.current.show({ severity: 'success', summary, detail, life: 3000 });
        announceMyPlayersChange();
        load();
    };
    const onError = (summary, error) => toast.current.show({ severity: 'error', summary, detail: error.message, life: 4000 });

    if (failed) return <div className="container-fluid p-4 text-subtle">{t('Your player profile could not be loaded. Please reload the page.')}</div>;
    if (!players) return <PageLoader />;

    return (
        <div className="container-fluid p-4 border-0">
            <Toast ref={toast} position="bottom-right" />
            <Panel header={t('Player profile')}>
                <p className="text-subtle fs-7 mt-0 mb-3">
                    {t('How you appear in your clubs: your nickname and picture are yours to keep up to date, and your name comes from your user profile. Your club admins set the date of birth; as an adult you can correct it afterwards.')}
                    {players.length > 1 && t(' You play as more than one player; your picture is the same for all of them.')}
                </p>
                {players.length === 0
                    ? <p className="text-subtle fs-7 m-0">{t('You do not play in a club yet. A club admin can give your player a login, or add yourself as a player of a club you run under')}{' '}<Link to="/my-clubs">{t('My clubs')}</Link>.</p>
                    : (
                        <div className="d-flex flex-column gap-4">
                            {players.map(player => <MyPlayer key={`${player.id}-${player.profileImg}-${player.nickname}-${player.dateOfBirth}`} player={player} multiple={players.length > 1} onSaved={onSaved} onError={onError} />)}
                        </div>
                    )
                }
            </Panel>
        </div>
    );
};

export default MyPlayerPage;
