import { useEffect, useState } from 'react';

import StatsService from '../../services/stats.service';

/**
 * The Hall of Shame of the club, loaded once: null while loading,
 * { enabled, badges } afterwards (badges empty when it fails).
 */
export const useClubShame = () => {
    const [shame, setShame] = useState(null);
    useEffect(() => {
        let alive = true;
        StatsService.loadClubShame()
            .then(loaded => alive && setShame(loaded))
            .catch(error => {
                console.error('Failed to load the Hall of Shame', error);
                if (alive) setShame({ enabled: false, badges: [] });
            });
        return () => { alive = false; };
    }, []);
    return shame;
};

/**
 * The shame badges a player holds in the club right now.
 */
export const heldBy = (shame, playerId) => (shame?.enabled ? shame.badges.filter(badge => badge.holder?.id === playerId) : []);
