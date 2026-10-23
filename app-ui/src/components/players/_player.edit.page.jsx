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
import PageLoader from '../elements/page.loader';
import PlayerLogin from '../elements/player.login';
import SettingSwitch from '../elements/setting.switch';
import UpLink from '../elements/up.link';
import PlayerCheckoutPreferences from './player.checkout.preferences';
import PlayerDartPreferences from './player.dart.preferences';
import PlayerClubs from './player.clubs';
import { useAuth } from '../../utils/auth.context';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { t } from '../../utils/i18n';
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
 * out as the player profile: picture, nickname, name and date of birth to
 * save; whether the nickname is public and the login; the ways out and the
 * darts. A player with a login keeps their name, nickname and picture up to
 * date themselves; the admins set the date of birth.
 */
const PlayerEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useRef(null);
    const { isClubAdmin, user, clubs } = useAuth();
    // an admin of several clubs adds players to the others, or moves them
    const managesSeveralClubs = clubs.filter(club => club.role === 'admin').length > 1;
    const [player, setPlayer] = useState(null);
    const [failed, setFailed] = useState(false);
    const [fields, setFields] = useState(null);
    const [image, setImage] = useState({ action: 'unchanged', file: null, preview: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const loaded = await PlayerService.getPlayer(id);
            if (!loaded) throw new Error(t('Not found'));
            setPlayer(loaded);
            setFields(fieldsOf(loaded));
            setImage({ action: 'unchanged', file: null, preview: resolvePlayerImg(loaded.profileImg ?? '') });
        } catch {
            setFailed(true);
        }
    }, [id]);
    useEffect(() => { load(); }, [load]);
    // opened at the login (from the key of the players list): there once the player is loaded
    useEffect(() => {
        if (player && window.location.hash === '#login') document.getElementById('login')?.scrollIntoView({ block: 'center' });
    }, [player]);

    const showError = (summary, error) => toast.current?.show({ severity: 'error', summary, detail: error.message, life: 4000 });

    if (!isClubAdmin) return <div className="container-fluid p-4 text-subtle">{t('Only the admins of the club edit its players.')}</div>;
    if (failed) return <div className="container-fluid p-4 text-subtle">{t('The player could not be loaded.')}{' '}<Link to="/players">{t('Back to the players')}</Link></div>;
    if (!player || !fields) return <PageLoader />;

    // a player with a login keeps their name, nickname and picture up to date themselves
    const maintainedByPlayer = Boolean(player.user && player.user !== user?.id);
    const saved = fieldsOf(player);
    const changed = Object.keys(fields).some(key => fields[key] !== saved[key]) || image.action !== 'unchanged';
    const valid = fields.nickname.trim().length >= 3 && fields.firstname.trim() && fields.lastname.trim() && fields.dateOfBirth;
    const set = (key) => (event) => setFields(current => ({ ...current, [key]: event.target.value }));

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('nickname', fields.nickname.trim());
            formData.append('firstname', fields.firstname.trim());
            formData.append('lastname', fields.lastname.trim());
            formData.append('dateOfBirth', fields.dateOfBirth);
            formData.append('country', fields.country);
            if (image.action === 'new' && image.file) formData.append('profileImg', image.file);
            if (image.action === 'cleared') formData.append('clearProfileImg', 'true');
            await PlayerService.updatePlayer({ id: player.id, formData });
            toast.current?.show({ severity: 'success', summary: t('Player saved'), detail: fields.nickname.trim(), life: 3000 });
            await load();
        } catch (error) {
            showError(t('Save the player'), error);
        } finally {
            setSaving(false);
        }
    };

    const togglePublic = async (publicProfile) => {
        try {
            await PlayerService.setPublicProfile(player.id, publicProfile);
            await load();
        } catch (error) {
            showError(t('Public nickname'), error);
        }
    };

    const field = (key, label, hint) => (
        <label className="d-flex flex-column gap-1 profile-field">
            <span className="text-subtle fs-8">{label}</span>
            <InputText value={fields[key]} onChange={set(key)} disabled={maintainedByPlayer} required />
            {hint && <span className="text-faint fs-8">{hint}</span>}
        </label>
    );

    return (
        <div className="container-fluid p-4 border-0">
            <Toast ref={toast} position="bottom-right" />
            <UpLink to="/players" label={t('Players')} />
            <Panel header={t('Edit {{nickname}}', { nickname: player.nickname })}>
                <p className="text-subtle fs-7 mt-0 mb-3">
                    {player.guest
                        ? t('A guest of a game: their name, nickname, picture and date of birth.')
                        : t('How the player appears in the club, their login and their settings for the games. The settings of the games are saved right away.')}
                </p>
                <div className="row g-4">
                    <div className="col-12 col-xl-6">
                        <form onSubmit={save}>
                            <p className="game-setup-section-title">{t('The player')}</p>
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
                                        ? <Avatar image={image.preview || undefined} label={image.preview ? undefined : resolvePlayerInitials(player.firstname, player.lastname)} shape="circle" className="avatar-xl bg-surface-high" />
                                        : <ImageUploader
                                            name={`${fields.firstname} ${fields.lastname}`}
                                            previewUrl={image.preview}
                                            onFileChange={(file) => setImage({ action: 'new', file, preview: URL.createObjectURL(file) })}
                                            onFileDelete={() => setImage({ action: 'cleared', file: null, preview: '' })}
                                        />
                                    }
                                    {field('nickname', t('Nickname'), t('How the club and the games call the player, 3 to 25 characters.'))}
                                </div>
                            </div>
                            <p className="setting-title">{t('Name')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col d-flex flex-wrap gap-3 pt-1 profile-name">
                                    {field('firstname', t('First name'))}
                                    {field('lastname', t('Last name'))}
                                </div>
                            </div>
                            <p className="setting-title">{t('Country')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col d-flex flex-column gap-1 pt-1">
                                    <CountryPicker value={fields.country} onChange={(country) => setFields(current => ({ ...current, country }))} disabled={maintainedByPlayer} />
                                    <span className="text-faint fs-8">{maintainedByPlayer ? t('{{nickname}} has a login and chooses the country on their profile.', { nickname: player.nickname }) : t('Where the player comes from: the flag is shown next to the nickname.')}</span>
                                </div>
                            </div>
                            <p className="setting-title">{t('Date of birth')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col pt-1">
                                    <label className="d-flex flex-column gap-1 profile-field">
                                        <Calendar
                                            value={toDate(fields.dateOfBirth)}
                                            onChange={(event) => setFields(current => ({ ...current, dateOfBirth: fromDate(event.value) }))}
                                            dateFormat={calendarFormat()}
                                            mask="99.99.9999"
                                            maxDate={new Date()}
                                            viewDate={fields.dateOfBirth ? undefined : tenYearsAgo()}
                                            showIcon
                                            icon="pi pi-calendar"
                                            aria-label={t('Date of birth')}
                                            className="my-player-birth"
                                        />
                                        {fields.dateOfBirth
                                            ? <span className="text-faint fs-8">{t('For fair handicaps between players of different ages, and the Hall of Shame: a player without one is never in it.')}</span>
                                            : <small className="p-error">{t('Needed to save the player: for fair handicaps, and the Hall of Shame leaves out a player without one.')}</small>}
                                    </label>
                                </div>
                            </div>
                            <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mb-4">
                                <Button type="button" label={t('Statistics and badges')} icon="pi pi-chart-line" size="small" severity="secondary" onClick={() => navigate(`/players/${player.id}`)} />
                                <Button type="submit" label={t('Save')} icon="pi pi-save" size="small" loading={saving} disabled={!changed || !valid} />
                            </div>
                        </form>

                        {!player.guest && (
                            <>
                                <p className="game-setup-section-title">{t('In the club')}</p>
                                <SettingSwitch
                                    id={`player-public-${player.id}`}
                                    title={t('Nickname on the public page')}
                                    hint={`${player.publicProfile ? t('The nickname appears with the live games and results of the club, if the club is public.') : t('The player is shown without a name on the public page.')}${maintainedByPlayer ? t(' {{nickname}} has a login and decides this on their profile.', { nickname: player.nickname }) : ''}`}
                                    checked={Boolean(player.publicProfile)}
                                    disabled={maintainedByPlayer}
                                    onChange={togglePublic}
                                />
                                <p className="setting-title" id="login">{t('Login')}</p>
                                <div className="row mx-0 mt-0 setting-body">
                                    <div className="col">
                                        <PlayerLogin player={player} onChange={load} />
                                    </div>
                                </div>
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
                            </>
                        )}
                    </div>

                    {!player.guest && (
                        <div className="col-12 col-xl-6">
                            <p className="game-setup-section-title">{t('In games')}</p>
                            <p className="setting-title">{t('Ways out in X01')}</p>
                            <div className="row mx-0 mt-0 setting-body">
                                <div className="col">
                                    <PlayerCheckoutPreferences player={player} onError={(error) => showError(t('Ways out'), error)} />
                                </div>
                            </div>
                            <PlayerDartPreferences player={player} onError={(error) => showError(t('Darts on the board'), error)} />
                        </div>
                    )}
                </div>
            </Panel>
        </div>
    );
};

export default PlayerEditPage;
