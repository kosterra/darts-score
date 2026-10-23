import { useCallback, useMemo } from 'react';

import { useAuth } from './auth.context';
import AuthService from '../services/auth.service';
import { normalizeGamePreferences } from '../rules/club.rules';
import { saveGamePreferences } from './game.preferences';

/**
 * The player's own preferences for playing, and a way to change them:
 * [preferences, save(changes)]. Without a login, the defaults.
 */
const useGamePreferences = () => {
    const { user } = useAuth();
    const preferences = useMemo(() => normalizeGamePreferences(user?.gamePreferences), [user?.gamePreferences]);
    const save = useCallback((changes) => saveGamePreferences(changes), []);
    return [preferences, save, Boolean(user)];
};

export default useGamePreferences;

// the saver the login state connects: the account answers with itself
export const accountSaver = (setUser) => async (changes) => {
    const updated = await AuthService.setGamePreferences(changes);
    if (updated) setUser(current => (current ? { ...current, gamePreferences: updated.gamePreferences } : current));
    return updated;
};
