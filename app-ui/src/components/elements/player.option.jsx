import { Avatar } from 'primereact/avatar';

import LevelBadge from '../players/level.badge';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

/**
 * A player in a list to pick from (a dropdown, a multiselect): their picture,
 * their nickname with their name beside it, and, when known, their level. player: { id, nickname,
 * firstname, lastname, profileImg }; level: as the levels of the club have it,
 * or none (a guest, or not loaded yet).
 */
const PlayerOption = ({ player, level = null }) => (
    <span className="player-option">
        <Avatar
            label={player?.profileImg ? undefined : resolvePlayerInitials(player?.firstname, player?.lastname)}
            image={resolvePlayerImg(player?.profileImg)}
            shape="circle"
            className="avatar-sm bg-surface-high flex-shrink-0 player-option-avatar"
        />
        {/* the nickname with the name beside it, and the level under them on a line of its own */}
        <span className="player-option-text">
            <span className="player-option-name text-truncate">
                {player?.nickname ?? '?'}
                {(player?.firstname || player?.lastname) && <span className="player-option-fullname">{[player.firstname, player.lastname].filter(Boolean).join(' ')}</span>}
            </span>
            {level && <LevelBadge level={level} size="xs" />}
        </span>
    </span>
);

export default PlayerOption;
