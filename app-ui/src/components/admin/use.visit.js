import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../utils/auth.context';

/**
 * For global admins: opens a page of a club (a game, a training) as its
 * admins see it. The app works in that club in this tab until they leave it
 * with the bar on top.
 */
export const useVisit = () => {
    const { visitClub } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    return async (clubId, to) => {
        await visitClub(clubId, `${location.pathname}${location.search}`);
        navigate(to);
    };
};
