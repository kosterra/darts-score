import { useEffect, useState } from 'react';

import StatsService from '../../services/stats.service';
import { useAuth } from '../../utils/auth.context';

/**
 * The Hall of Shame of the club, loaded once: null while loading,
 * { enabled, badges } afterwards (badges empty when it fails). Without a
 * login (a quick game) there is no club and no Hall of Shame.
 */
export const useClubShame = () => {
    const loggedIn = Boolean(useAuth().user);
    const [shame, setShame] = useState(null);
    useEffect(() => {
        if (!loggedIn) {
            setShame({ enabled: false, badges: [] });
            return undefined;
        }
        let alive = true;
        StatsService.loadClubShame()
            .then(loaded => alive && setShame(loaded))
            .catch(error => {
                console.error('Failed to load the Hall of Shame', error);
                if (alive) setShame({ enabled: false, badges: [] });
            });
        return () => { alive = false; };
    }, [loggedIn]);
    return shame;
};

/**
 * The shame badges a player holds in the club right now.
 */
export const heldBy = (shame, playerId) => (shame?.enabled ? shame.badges.filter(badge => badge.holder?.id === playerId) : []);
