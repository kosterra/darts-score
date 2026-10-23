import { useMemo } from 'react';

import { useAuth } from '../../../utils/auth.context';
import { GAME_SETTINGS, fitsRules, isLocked, lockedSettings, normalizeClubRules, offeredValues, startingSettings } from '../../../rules/club.rules';

/**
 * The selected club's rules for one game, for its setup: the settings to
 * start with, the choices it offers, what it locks, its formats, whether a
 * game may be marked friendly, the handicap policy and the ways out.
 */
const useClubGameRules = (game) => {
    const { activeClub } = useAuth();
    const raw = activeClub?.gameRules;
    return useMemo(() => {
        const rules = normalizeClubRules(raw);
        const own = rules.games[game] ?? { enabled: true, defaults: {}, offered: {}, locked: [] };
        return {
            rules,
            raw,
            enabled: own.enabled,
            // the settings a fresh setup starts with: the club's, then the layers given (e.g. what was remembered)
            start: (...layers) => startingSettings(game, raw, ...layers),
            // the club's locks on top of settings
            withLocks: (settings) => ({ ...settings, ...lockedSettings(game, raw) }),
            locked: (key) => isLocked(game, raw, key),
            // options ({ value, … }) narrowed to the choices the club offers
            options: (key, options) => {
                // the club's own Halve-It targets only when it has them
                const offered = offeredValues(game, raw, key).filter(value => !(game === 'halveit' && value === 'club' && !rules.halveItTargets.length));
                return options.filter(option => offered.includes(option.value ?? option));
            },
            houseRules: (GAME_SETTINGS[game] ?? []).filter(setting => setting.house),
            formats: rules.formats.filter(format => format.game === game),
            // the quick formats of the setup: the club's own first, then the app's (builtIn) that keep to the club's rules
            quickFormats: (builtIn = []) => [
                ...rules.formats.filter(format => format.game === game).map(format => ({ ...format, club: true })),
                ...(rules.builtInFormats ? builtIn.filter(format => fitsRules(game, raw, format.settings)) : []),
            ],
            friendlyChoice: rules.friendlyChoice,
            builtInFormats: rules.builtInFormats,
            handicap: rules.handicap,
            waysOut: rules.waysOut,
        };
    }, [raw, game]);
};

export default useClubGameRules;
