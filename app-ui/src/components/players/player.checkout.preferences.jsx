import { useEffect, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';

import PlayerService from '../../services/player.service';

const DOUBLES = [20, 16, 18, 8, 12, 10, 14, 4, 6, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1].map(n => `D${n}`).concat('D25');
const TREBLES = ['T20', 'T19', 'T18'];
const nameOf = (double) => double === 'D25' ? 'Bull (D25)' : double;

/**
 * A player's favourite double and main treble, which put their own ways out
 * first during an X01 game. Automatic learns them from the player's games;
 * a change is saved right away.
 *
 * player: { id, preferences }
 * clubId: the club the player is edited in
 */
const PlayerCheckoutPreferences = ({ player, clubId, onSaved, onError }) => {
    const [preferences, setPreferences] = useState({ favouriteDouble: 'auto', mainTreble: 'auto', ...player.preferences });
    // what the games say, for the "Automatic" choice
    const [learned, setLearned] = useState(null);

    useEffect(() => {
        let cancelled = false;
        PlayerService.loadCheckoutProfiles([player.id], clubId)
            .then(profiles => { if (!cancelled) setLearned(profiles[player.id] ?? null); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [player.id, clubId]);

    const save = async (change) => {
        const next = { ...preferences, ...change };
        setPreferences(next);
        try {
            onSaved?.(await PlayerService.setPreferences(player.id, change, clubId));
        } catch (error) {
            setPreferences(preferences);
            onError?.(error);
        }
    };

    // what the games say, when they are enough to tell
    const learnedDouble = learned?.learnedDouble ?? null;
    const learnedTreble = learned?.learnedTreble ?? null;
    const automatic = (value, what) => `Automatic${value ? ` (${nameOf(value)} from the games)` : ` (not enough ${what} yet)`}`;

    return (
        <div className="player-checkout-preferences">
            <label className="d-flex flex-column gap-1">
                <span className="text-subtle fs-8">Favourite double</span>
                <Dropdown
                    value={preferences.favouriteDouble}
                    options={[{ label: automatic(learnedDouble, 'darts at doubles'), value: 'auto' }, ...DOUBLES.map(double => ({ label: nameOf(double), value: double }))]}
                    onChange={(e) => save({ favouriteDouble: e.value })}
                    className="w-100"
                />
            </label>
            <label className="d-flex flex-column gap-1">
                <span className="text-subtle fs-8">Main treble</span>
                <Dropdown
                    value={preferences.mainTreble}
                    options={[{ label: automatic(learnedTreble, 'games'), value: 'auto' }, ...TREBLES.map(treble => ({ label: treble, value: treble }))]}
                    onChange={(e) => save({ mainTreble: e.value })}
                    className="w-100"
                />
            </label>
            <span className="text-faint fs-8 player-checkout-preferences-hint">
                In X01 the ways out finish on the favourite double first and the scoring tips stay on the main treble.
            </span>
        </div>
    );
};

export default PlayerCheckoutPreferences;
