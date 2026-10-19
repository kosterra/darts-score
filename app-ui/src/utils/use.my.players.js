import { useEffect, useState } from 'react';

import AuthService, { MY_PLAYERS_CHANGED } from '../services/auth.service';

/**
 * The players the logged-in user plays as, with their clubs; null while
 * loading. Follows changes on the player profile. enabled: false for global
 * admins, who belong to no club.
 */
export const useMyPlayers = (enabled = true) => {
    const [players, setPlayers] = useState(null);
    useEffect(() => {
        if (!enabled) return undefined;
        let alive = true;
        const load = () => AuthService.getMyPlayers().then(loaded => alive && setPlayers(loaded)).catch(() => alive && setPlayers([]));
        load();
        window.addEventListener(MY_PLAYERS_CHANGED, load);
        return () => {
            alive = false;
            window.removeEventListener(MY_PLAYERS_CHANGED, load);
        };
    }, [enabled]);
    return enabled ? players : [];
};

// the player the user plays as in a club, or null
export const playerInClub = (players, clubId) => (players ?? []).find(player => player.clubs.some(club => club.id === clubId)) ?? null;
