import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import dayjs from 'dayjs';

import AuthService, { announceMyPlayersChange } from '../../services/auth.service';
import PlayerService from '../../services/player.service';
import ImageUploader from '../elements/image.uploader';
import PageLoader from '../elements/page.loader';
import PlayerCheckoutPreferences from './player.checkout.preferences';
import { useAuth } from '../../utils/auth.context';
import { resolvePlayerImg } from '../../utils/image.utils';

/**
 * One player the user plays as: nickname and picture to edit, the name from
 * the account and the date of birth from the club admins, whether the
 * nickname shows on the public page and what the X01 tips aim at.
 */
const MyPlayer = ({ player, onSaved, onError }) => {
    const navigate = useNavigate();
    const { activeClub, selectClub } = useAuth();
    const [nickname, setNickname] = useState(player.nickname);
    const [image, setImage] = useState({ action: 'unchanged', file: null, preview: resolvePlayerImg(player.profileImg) });
    const [saving, setSaving] = useState(false);
    const [current, setCurrent] = useState(player);

    // the player is edited in one of its clubs: the selected one when it plays there
    const clubId = player.clubs.some(club => club.id === activeClub?.id) ? activeClub.id : player.clubs[0]?.id;
    const changed = nickname.trim() !== player.nickname || image.action !== 'unchanged';
    const anyPublic = player.clubs.some(club => club.isPublic);

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('nickname', nickname.trim());
            if (image.action === 'new' && image.file) formData.append('profileImg', image.file);
            if (image.action === 'cleared') formData.append('clearProfileImg', 'true');
            await PlayerService.updatePlayer({ id: player.id, formData, clubId });
            setImage(value => ({ ...value, action: 'unchanged', file: null }));
            onSaved('Player profile', 'Your player profile is saved.');
        } catch (error) {
            onError('Player profile', error);
        } finally {
            setSaving(false);
        }
    };

    const togglePublic = async (publicProfile) => {
        try {
            setCurrent(await PlayerService.setPublicProfile(player.id, publicProfile, clubId));
        } catch (error) {
            onError('Public nickname', error);
        }
    };

    // statistics and badges belong to a club: the app switches to it first
    const openStatistics = (event) => {
        event.preventDefault();
        if (clubId !== activeClub?.id) selectClub(clubId);
        navigate(`/players/${player.id}`);
    };

    return (
        <section className="my-player">
            <form onSubmit={save} className="my-player-main">
                <ImageUploader
                    name={`${player.firstname} ${player.lastname}`}
                    previewUrl={image.preview}
                    onFileChange={(file) => setImage({ action: 'new', file, preview: URL.createObjectURL(file) })}
                    onFileDelete={() => setImage({ action: 'cleared', file: null, preview: '' })}
                />
                <div className="my-player-fields">
                    <label className="d-flex flex-column gap-1">
                        <span className="text-subtle fs-8">Nickname</span>
                        <InputText value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={3} maxLength={25} required />
                    </label>
                    <dl className="my-player-facts">
                        <div>
                            <dt>Name</dt>
                            <dd>{player.firstname} {player.lastname} <span className="text-faint">· from your <Link to="/profile">user profile</Link></span></dd>
                        </div>
                        <div>
                            <dt>Date of birth</dt>
                            <dd>
                                {player.dateOfBirth ? dayjs(player.dateOfBirth).format('DD.MM.YYYY') : <span className="text-faint">not set yet</span>}
                                <span className="text-faint"> · set by your club admins</span>
                            </dd>
                        </div>
                        <div>
                            <dt>Plays in</dt>
                            <dd>{player.clubs.map(club => club.name).join(', ')}</dd>
                        </div>
                    </dl>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <a href={`/players/${player.id}`} onClick={openStatistics} className="fs-7">Statistics and badges</a>
                        <Button type="submit" label="Save" icon="pi pi-save" size="small" loading={saving} disabled={!changed || nickname.trim().length < 3} />
                    </div>
                </div>
            </form>

            <div className="my-player-more">
                <div className="my-club-public">
                    <label htmlFor={`my-player-public-${player.id}`} className="d-flex flex-column">
                        <span className="text-default fs-7">Show my nickname on the public page</span>
                        <span className="text-faint fs-8">
                            {anyPublic ? 'Your nickname appears with the live games and results of your public clubs; otherwise you are shown without a name.' : 'None of your clubs is public, so this only matters once one of them is.'}
                        </span>
                    </label>
                    <InputSwitch inputId={`my-player-public-${player.id}`} checked={!!current.publicProfile} onChange={(event) => togglePublic(event.value)} />
                </div>
                <div>
                    <p className="game-setup-section-title mb-2">Ways out in X01</p>
                    <PlayerCheckoutPreferences player={current} clubId={clubId} onSaved={setCurrent} onError={(error) => onError('Ways out', error)} />
                </div>
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

    if (failed) return <div className="container-fluid p-4 text-subtle">Your player profile could not be loaded. Please reload the page.</div>;
    if (!players) return <PageLoader />;

    return (
        <div className="container-fluid p-4 border-0">
            <Toast ref={toast} position="bottom-right" />
            <Panel header="Player profile">
                <p className="text-subtle fs-7 mt-0 mb-3">
                    How you appear in your clubs: your nickname and picture are yours to keep up to date, your name comes from your user profile and your club admins set the date of birth.
                    {players.length > 1 && ' You play as more than one player; your picture is the same for all of them.'}
                </p>
                {players.length === 0
                    ? <p className="text-subtle fs-7 m-0">You do not play in a club yet. A club admin can give your player a login, or add yourself as a player of a club you run under <Link to="/my-clubs">My clubs</Link>.</p>
                    : (
                        <div className="d-flex flex-column gap-3">
                            {players.map(player => <MyPlayer key={`${player.id}-${player.profileImg}-${player.nickname}`} player={player} onSaved={onSaved} onError={onError} />)}
                        </div>
                    )
                }
            </Panel>
        </div>
    );
};

export default MyPlayerPage;
