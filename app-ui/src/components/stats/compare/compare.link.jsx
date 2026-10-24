import { Link } from 'react-router-dom';

import { t } from '../../../utils/i18n';

/**
 * The way into the player comparison: these players (and the game type) or,
 * with "vs", you against that player.
 */
const CompareLink = ({ players = [], vs = null, type = null, label = t('Compare these players'), className = '' }) => {
    const params = new URLSearchParams();
    if (vs) params.set('vs', vs);
    else params.set('players', players.map(player => player.id ?? player).join(','));
    if (type) params.set('type', type);
    return (
        <Link to={`/stats/players?${params.toString()}`} className={`compare-link ${className}`}>
            <i className="pi pi-users" aria-hidden="true" />{label}
        </Link>
    );
};

export default CompareLink;
