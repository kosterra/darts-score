import { Avatar } from 'primereact/avatar';

import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

/**
 * A player in an admin table: picture, nickname and full name.
 */
export const PlayerCell = ({ player, size = 'sm', children }) => (
    <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
        <Avatar
            label={resolvePlayerInitials(player?.firstname, player?.lastname)}
            image={resolvePlayerImg(player?.profileImg)}
            shape="circle"
            className={`avatar-${size} bg-surface-high flex-shrink-0`}
        />
        <div className="d-flex flex-column" style={{ minWidth: 0 }}>
            <span className="text-default fw-semibold text-truncate">{player?.nickname ?? 'Deleted player'}{children}</span>
            {player && <span className="text-faint fs-8 text-truncate">{player.firstname} {player.lastname}</span>}
        </div>
    </div>
);

/**
 * Filters above an admin table, wrapping on small screens.
 */
export const AdminToolbar = ({ children }) => (
    <div className="admin-toolbar d-flex flex-wrap align-items-center gap-3 mb-3">{children}</div>
);
