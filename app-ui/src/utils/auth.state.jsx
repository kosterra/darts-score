import { useCallback, useEffect, useMemo, useState } from 'react';

import AuthContext from './auth.context';
import AuthService from '../services/auth.service';
import ClubService from '../services/club.service';
import { ROLES, CLUB_ROLES } from '../services/user.service';
import { SESSION_ENDED, getActiveClubId, setActiveClubId } from './service.utils';

/**
 * Holds the logged-in user, the clubs they can manage and the club the app
 * currently works in.
 */
const AuthState = ({ children }) => {
    const [user, setUser] = useState(null);
    const [clubs, setClubs] = useState([]);
    const [activeClubId, setActiveClub] = useState(getActiveClubId());
    const [loading, setLoading] = useState(true);
    // Whether the server can send mails (password reset, invitations)
    const [mailEnabled, setMailEnabled] = useState(false);
    // the session ran out: the login says so
    const [sessionEnded, setSessionEnded] = useState(false);
    // the page open when it ran out, to come back to after logging in again
    const [returnTo, setReturnTo] = useState(null);

    const selectClub = useCallback((clubId) => {
        setActiveClubId(clubId);
        setActiveClub(clubId || '');
    }, []);

    const refreshClubs = useCallback(async () => {
        const loaded = await ClubService.loadClubs();
        setClubs(loaded);
        // Keep the stored choice when it is still valid, otherwise fall back to the first club
        const current = getActiveClubId();
        if (!loaded.some(club => club.id === current)) selectClub(loaded[0]?.id ?? '');
        return loaded;
    }, [selectClub]);

    const startSession = useCallback(async (loggedInUser) => {
        // Clubs first, so the app never renders a logged-in user without their clubs
        await refreshClubs();
        setSessionEnded(false);
        setUser(loggedInUser);
    }, [refreshClubs]);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                AuthService.getConfig().then(config => setMailEnabled(config.mailEnabled)).catch(() => {});
                const current = await AuthService.getCurrentUser();
                if (current) await startSession(current);
            } catch (error) {
                console.error('Failed to restore the session', error);
            } finally {
                setLoading(false);
            }
        };
        restoreSession();
    }, [startSession]);

    const login = useCallback(async (email, password) => {
        await startSession(await AuthService.login(email, password));
    }, [startSession]);

    const register = useCallback(async (account) => {
        await startSession(await AuthService.register(account));
    }, [startSession]);

    const resetPassword = useCallback(async (token, password) => {
        await startSession(await AuthService.resetPassword(token, password));
    }, [startSession]);

    const logout = useCallback(async () => {
        await AuthService.logout().catch(() => {});
        setReturnTo(null);
        setUser(null);
        setClubs([]);
    }, []);

    // the session timed out (or was ended elsewhere): back to the login, with a note
    const endSession = useCallback(async () => {
        await AuthService.logout().catch(() => {});
        setReturnTo(`${window.location.pathname}${window.location.search}${window.location.hash}`);
        setSessionEnded(true);
        setUser(null);
        setClubs([]);
    }, []);

    useEffect(() => {
        if (!user) return undefined;
        window.addEventListener(SESSION_ENDED, endSession);
        return () => window.removeEventListener(SESSION_ENDED, endSession);
    }, [user, endSession]);

    const activeClub = clubs.find(club => club.id === activeClubId) ?? null;

    const value = useMemo(() => ({
        user,
        setUser,
        clubs,
        activeClub,
        isGlobalAdmin: user?.role === ROLES.GLOBAL_ADMIN,
        // Admins manage the club's players; players only play and train in it
        isClubAdmin: activeClub?.role === CLUB_ROLES.ADMIN,
        loading,
        mailEnabled,
        resetPassword,
        login,
        register,
        logout,
        endSession,
        sessionEnded,
        returnTo,
        refreshClubs,
        selectClub
    }), [user, clubs, activeClub, loading, mailEnabled, resetPassword, login, register, logout, endSession, sessionEnded, returnTo, refreshClubs, selectClub]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthState;
