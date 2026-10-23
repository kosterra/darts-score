import { useAuth } from '../../../utils/auth.context';
import useGamePreferences from '../../../utils/use.game.preferences';
import { useQuickPlaying } from '../../quick/quick.frame';
import { normalizeClubRules } from '../../../rules/club.rules';

/**
 * Which ways out a game shows: 'all' (for every player), 'turn' (only for
 * the one at the oche) or 'off'. The club may play without them (e.g. a
 * league); otherwise the player chooses. A quick game shows them all.
 */
const useWaysOut = () => {
    const { activeClub } = useAuth();
    const [preferences] = useGamePreferences();
    const quick = useQuickPlaying();
    if (quick) return 'all';
    if (!normalizeClubRules(activeClub?.gameRules).waysOut) return 'off';
    return preferences.waysOut;
};

export default useWaysOut;
