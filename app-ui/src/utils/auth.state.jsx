import { useCallback, useEffect, useMemo, useState } from 'react';

import AuthContext from './auth.context';
import AuthService from '../services/auth.service';
import ClubService from '../services/club.service';
import { ROLES, CLUB_ROLES } from '../services/user.service';
import { SESSION_ENDED, getActiveClubId, setActiveClubId } from './service.utils';
import { currentLanguage, setLanguage, takeLanguageChosenBeforeLogin } from './i18n';
import { connectGamePreferences } from './game.preferences';
import { accountSaver } from './use.game.preferences';
import { setAppearance, setClubAccent } from './appearance';

// whether this tab already has its club: then a reload keeps it
const CLUB_CHOSEN_KEY = 'darts-score.clubChosen';
const clubChosenInTab = () => {
    try {
        return sessionStorage.getItem(CLUB_CHOSEN_KEY) === '1';
    } catch {
        return false;
    }
};
const markClubChosenInTab = () => {
    try {
        sessionStorage.setItem(CLUB_CHOSEN_KEY, '1');
    } catch {
        // storage unavailable: the default club is chosen on every reload
    }
};

// a copy of the session on this device: a running game opens again after a
// reload without a connection (the API still asks for the login once it is back)
const OFFLINE_SESSION_KEY = 'darts-score.offline-session';
const keepOfflineSession = (user, clubs) => {
    try {
        localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify({ user, clubs }));
    } catch {
        // storage unavailable: without a connection the app starts at the login
    }
};
const offlineSession = () => {
    try {
        return JSON.parse(localStorage.getItem(OFFLINE_SESSION_KEY) || 'null');
    } catch {
        return null;
    }
};
const forgetOfflineSession = () => {
    try {
        localStorage.removeItem(OFFLINE_SESSION_KEY);
    } catch {
        // nothing kept
    }
};

/**
 * The language after logging in: one picked before (on the start page or the
 * login), or the app's when the account has none yet, is saved on the
 * account; otherwise the account's language is used, and the app starts
 * again in it (null then).
 */
const settleLanguage = async (loggedInUser) => {
    const picked = takeLanguageChosenBeforeLogin();
    if (picked || !loggedInUser.language) {
        const wanted = picked ?? currentLanguage();
        return wanted === loggedInUser.language ? loggedInUser : AuthService.saveLanguage(wanted).catch(() => loggedInUser);
    }
    if (loggedInUser.language !== currentLanguage()) {
        setLanguage(loggedInUser.language);
        return null;
    }
    return loggedInUser;
};

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
    // logged out on purpose: the public start page follows, not the login
    const [loggedOut, setLoggedOut] = useState(false);

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

    // fresh: a new login. The user's default club is selected then, and when the
    // app opens in a new tab or browser; a reload keeps the club worked in.
    const startSession = useCallback(async (sessionUser, fresh = false) => {
        const loggedInUser = await settleLanguage(sessionUser);
        // the app starts again in the account's language
        if (!loggedInUser) return false;
        // Clubs first, so the app never renders a logged-in user without their clubs
        const loaded = await refreshClubs();
        const defaultClub = loggedInUser.defaultClub && loaded.find(club => club.id === String(loggedInUser.defaultClub));
        if (defaultClub && (fresh || !clubChosenInTab())) selectClub(defaultClub.id);
        markClubChosenInTab();
        setSessionEnded(false);
        setLoggedOut(false);
        setUser(loggedInUser);
        return true;
    }, [refreshClubs, selectClub]);

    // started from the copy on this device, without a connection
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        const restoreSession = async () => {
            // the app starts again in the account's language: it keeps loading until then
            let reloading = false;
            try {
                AuthService.getConfig().then(config => setMailEnabled(config.mailEnabled)).catch(() => {});
                const current = await AuthService.getCurrentUser();
                if (current) reloading = !(await startSession(current));
            } catch (error) {
                // no connection: the copy of the session kept on this device, until it is back
                const kept = error.offline && offlineSession();
                if (kept?.user) {
                    setClubs(kept.clubs ?? []);
                    setUser(kept.user);
                    setOffline(true);
                } else {
                    console.error('Failed to restore the session', error);
                }
            } finally {
                if (!reloading) setLoading(false);
            }
        };
        restoreSession();
    }, [startSession]);

    // the connection is back: the server says whether the session still is
    useEffect(() => {
        if (!offline) return undefined;
        const check = async () => {
            try {
                const current = await AuthService.getCurrentUser();
                setOffline(false);
                if (current) await startSession(current);
                else {
                    forgetOfflineSession();
                    setReturnTo(`${window.location.pathname}${window.location.search}${window.location.hash}`);
                    setSessionEnded(true);
                    setUser(null);
                    setClubs([]);
                }
            } catch {
                // still without a connection
            }
        };
        window.addEventListener('online', check);
        const timer = setInterval(check, 15000);
        return () => {
            window.removeEventListener('online', check);
            clearInterval(timer);
        };
    }, [offline, startSession]);

    // the copy follows the account and its clubs
    useEffect(() => {
        if (user && !offline) keepOfflineSession(user, clubs);
    }, [user, clubs, offline]);

    // with two-step login the answer asks for its next step ({ mfaRequired, step }),
    // handed back to the page; otherwise the session starts and null comes back
    const login = useCallback(async (email, password) => {
        const answer = await AuthService.login(email, password);
        if (answer?.mfaRequired) return answer;
        await startSession(answer, true);
        return null;
    }, [startSession]);

    const register = useCallback(async (account) => {
        const answer = await AuthService.register({ ...account, language: currentLanguage() });
        if (answer?.mfaRequired) return answer;
        await startSession(answer);
        return null;
    }, [startSession]);

    const resetPassword = useCallback(async (token, password) => {
        const answer = await AuthService.resetPassword(token, password);
        if (answer?.mfaRequired) return answer;
        await startSession(answer, true);
        return null;
    }, [startSession]);

    // after the second step of logging in: the account the server answered
    const completeLogin = useCallback((loggedInUser) => startSession(loggedInUser, true), [startSession]);

    const logout = useCallback(async () => {
        forgetOfflineSession();
        await AuthService.logout().catch(() => {});
        setReturnTo(null);
        setLoggedOut(true);
        setUser(null);
        setClubs([]);
    }, []);

    // the session timed out (or was ended elsewhere): back to the login, with a note
    const endSession = useCallback(async () => {
        forgetOfflineSession();
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

    // the player's preferences for playing, for the setup memory and the way darts are entered
    useEffect(() => {
        connectGamePreferences(user?.gamePreferences, user ? accountSaver(setUser) : null);
    }, [user]);

    const activeClub = clubs.find(club => club.id === activeClubId) ?? null;

    // the look the account chose (kept on the device too), and the club's accent colour
    const ownAppearance = user?.gamePreferences?.appearance;
    useEffect(() => {
        if (ownAppearance) setAppearance(ownAppearance);
    }, [ownAppearance]);
    useEffect(() => {
        setClubAccent(activeClub?.accent ?? null);
    }, [activeClub?.accent]);

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
        completeLogin,
        login,
        register,
        logout,
        endSession,
        sessionEnded,
        returnTo,
        loggedOut,
        refreshClubs,
        selectClub
    }), [user, clubs, activeClub, loading, mailEnabled, resetPassword, completeLogin, login, register, logout, endSession, sessionEnded, returnTo, loggedOut, refreshClubs, selectClub]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthState;
