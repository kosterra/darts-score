import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

import ClubService from '../../services/club.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';

/**
 * The user's own part in a club: the player they play as there (its
 * statistics and badges, the player profile to edit it); or, without a
 * player, adding themselves as one.
 */
const ClubMembership = ({ club, onSuccess, onError }) => {
    const navigate = useNavigate();
    const { user, refreshClubs, selectClub } = useAuth();
    // undefined while loading, null without a player
    const [player, setPlayer] = useState(undefined);
    const [nickname, setNickname] = useState('');

    useEffect(() => {
        ClubService.findPlayerOfUser(club.id, user.id).then(found => setPlayer(found ?? null)).catch(() => setPlayer(null));
    }, [club.id, user.id]);

    if (player === undefined) return null;

    const addAsPlayer = async (event) => {
        event.preventDefault();
        try {
            const added = await ClubService.addCurrentUserAsPlayer(club.id, nickname);
            setPlayer(added);
            await refreshClubs();
            onSuccess(t('Player added'), t('You now play in {{name}} as {{nickname}}.', { name: club.name, nickname: added.nickname }));
        } catch (error) {
            onError(t('Add as player'), error);
        }
    };

    // the profile belongs to a club, so the app switches to it first
    const showProfile = (event) => {
        event.preventDefault();
        selectClub(club.id);
        navigate(`/players/${player.id}`);
    };

    if (!player) {
        // only admins can add themselves; a player always has a player
        return (
            <form onSubmit={addAsPlayer} className="my-club-part">
                <span className="text-subtle fs-7 flex-grow-1">{t('You do not play in this club yet. Add yourself as a player to be picked for games like anyone else.')}</span>
                <span className="d-flex flex-wrap gap-2">
                    <InputText
                        value={nickname}
                        onChange={(event) => setNickname(event.target.value)}
                        placeholder={t('Nickname')}
                        aria-label={t('Nickname in {{name}}', { name: club.name })}
                        minLength={3}
                        maxLength={25}
                        required
                    />
                    <Button type="submit" label={t('Add me as player')} icon="pi pi-user-plus" size="small" />
                </span>
            </form>
        );
    }

    return (
        <div className="my-club-part">
            <span className="text-subtle fs-7">
                {t('You play as')}{' '}
                <a href={`/players/${player.id}`} className="fw-semibold" onClick={showProfile} title={t('Your statistics and badges in this club')}>{player.nickname}</a>
            </span>
            <Button type="button" label={t('Profile')} icon="pi pi-user-edit" size="small" severity="secondary" className="ms-auto" onClick={() => navigate('/profile#player')} />
        </div>
    );
};

export default ClubMembership;
