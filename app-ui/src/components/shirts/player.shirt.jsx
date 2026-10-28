import { useId } from 'react';

import { ShirtPicture } from './shirt.art';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';

/**
 * The shirt a player plays in, small, next to their name in the game
 * headers: the club shirt (as its admins designed it) or their own. Players
 * of a quick game have none.
 */
const PlayerShirt = ({ player, className = '' }) => {
    const uid = `player-shirt-${useId().replace(/:/g, '')}`;
    const { activeClub } = useAuth();
    if (!player?.shirt) return null;
    return (
        <span className={`player-shirt ${className}`} title={t('{{nickname}}\'s shirt', { nickname: player.nickname })}>
            <ShirtPicture {...player.shirt} nickname={player.nickname} club={activeClub} uid={uid} />
        </span>
    );
};

export default PlayerShirt;
