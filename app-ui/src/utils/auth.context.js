import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

/**
 * The logged-in user, their clubs and the club the app currently works in.
 */
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
