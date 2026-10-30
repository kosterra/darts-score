import { useEffect, useState } from 'react';

import StatsService from '../services/stats.service';
import { useAuth } from './auth.context';

// the levels of the club's players, loaded once per club and kept while the app runs
const cache = new Map();

/**
 * The levels of the players of the club chosen at the top, by player id:
 * { [id]: { id, name, index, xp } }. Empty until loaded, and for guests.
 */
const usePlayerLevels = () => {
    const { activeClub } = useAuth();
    const clubId = activeClub?.id ?? null;
    const [levels, setLevels] = useState(() => cache.get(clubId) ?? {});

    useEffect(() => {
        if (!clubId) return undefined;
        if (cache.has(clubId)) { setLevels(cache.get(clubId)); return undefined; }
        let current = true;
        StatsService.loadPlayerLevels().then(loaded => {
            cache.set(clubId, loaded ?? {});
            if (current) setLevels(loaded ?? {});
        }).catch(() => { if (current) setLevels({}); });
        return () => { current = false; };
    }, [clubId]);

    return levels;
};

export default usePlayerLevels;
