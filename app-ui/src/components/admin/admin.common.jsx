import { useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';

import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { t } from '../../utils/i18n';
import useMediaQuery from '../../utils/use.media.query';
import CountryFlag from '../elements/country.flag';

/**
 * A player in an admin table: picture, nickname and full name.
 */
export const PlayerCell = ({ player, size = 'sm', children }) => (
    <div className="d-flex align-items-center gap-2 min-w-0">
        <Avatar
            label={resolvePlayerInitials(player?.firstname, player?.lastname)}
            image={resolvePlayerImg(player?.profileImg)}
            shape="circle"
            className={`avatar-${size} bg-surface-high flex-shrink-0`}
        />
        <div className="d-flex flex-column min-w-0">
            <span className="text-default fw-semibold text-truncate">{player?.nickname ?? t('Deleted player')}{player?.country && <>{' '}<CountryFlag code={player.country} /></>}{children}</span>
            {player && <span className="text-faint fs-8 text-truncate">{player.firstname} {player.lastname}</span>}
        </div>
    </div>
);

/**
 * Filters above an admin table, wrapping on small screens.
 */
export const AdminToolbar = ({ children, actions = null, changed = 0, startOpen = false }) => {
    // on a phone the filters fold away behind a button, as the filters of the statistics;
    // what the list holds and what can be done with it stays in sight
    const phone = useMediaQuery('(max-width: 575.98px)');
    const [open, setOpen] = useState(startOpen);
    if (!phone) {
        return (
            <div className="admin-toolbar d-flex flex-wrap align-items-center gap-3 mb-3">
                {children}
                {actions && <div className="ms-auto d-flex align-items-center gap-3">{actions}</div>}
            </div>
        );
    }
    return (
        <div className="admin-toolbar d-flex flex-wrap align-items-center gap-3 mb-3">
            <div className="d-flex align-items-center gap-3 w-100">
                <Button
                    type="button"
                    icon={changed ? 'pi pi-filter-fill' : 'pi pi-filter'}
                    label={t('Filters')}
                    badge={changed ? String(changed) : undefined}
                    severity="secondary"
                    size="small"
                    className={`filter-panel-toggle ${open ? 'is-open' : ''}`}
                    aria-expanded={open}
                    onClick={() => setOpen(!open)}
                />
                {actions && <div className="ms-auto d-flex align-items-center gap-3">{actions}</div>}
            </div>
            {/* one under another, each as wide as the list */}
            {open && <div className="admin-toolbar-filters">{children}</div>}
        </div>
    );
};
