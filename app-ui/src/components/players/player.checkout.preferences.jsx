import { useEffect, useRef, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';

import PlayerService from '../../services/player.service';
import useAutoSave from '../../utils/use.auto.save';
import { t } from '../../utils/i18n';

const DOUBLES = [20, 16, 18, 8, 12, 10, 14, 4, 6, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1].map(n => `D${n}`).concat('D25');
const TREBLES = ['T20', 'T19', 'T18'];
// each choice on a row of its own, as wide as the box: "Automatic (not enough darts at doubles yet)"
// and its translations do not fit in half of it
const WHOLE_ROW = { flexBasis: '100%' };
const nameOf = (double) => double === 'D25' ? 'Bull (D25)' : double;

/**
 * A player's favourite double and main treble, which put their own ways out
 * first during an X01 game. Automatic learns them from the player's games;
 * a change is shown and saved at once.
 *
 * player: { id, preferences }
 * clubId: the club the player is edited in
 * onSaved(player) with the player as saved; onStatus(autosave) how the saving goes
 */
const PlayerCheckoutPreferences = ({ player, clubId, onSaved, onStatus }) => {
    const [preferences, setPreferences] = useState({ favouriteDouble: 'auto', mainTreble: 'auto', handicap: 'accept', ...player.preferences });
    // what the games say, for the "Automatic" choice
    const [learned, setLearned] = useState(null);

    useEffect(() => {
        let cancelled = false;
        PlayerService.loadCheckoutProfiles([player.id], clubId)
            .then(profiles => { if (!cancelled) setLearned(profiles[player.id] ?? null); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [player.id, clubId]);

    // what was chosen here, sent together (one save at a time, the newest wins)
    const chosen = useRef({});
    const preferencesSave = useAutoSave(async (changes) => onSaved?.(await PlayerService.setPreferences(player.id, changes, clubId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => onStatus?.(preferencesSave), [preferencesSave.status, preferencesSave.error]);

    const save = (change) => {
        chosen.current = { ...chosen.current, ...change };
        setPreferences(current => ({ ...current, ...change }));
        preferencesSave.change(chosen.current, { now: true });
    };

    // what the games say, when they are enough to tell
    const learnedDouble = learned?.learnedDouble ?? null;
    const learnedTreble = learned?.learnedTreble ?? null;
    const automatic = (value, what) => value ? t('Automatic ({{value}} from the games)', { value: nameOf(value) }) : t('Automatic (not enough {{what}} yet)', { what });

    return (
        <div className="player-checkout-preferences">
            <label className="d-flex flex-column gap-1 mw-100" style={WHOLE_ROW}>
                <span className="text-subtle fs-8">{t('Favourite double')}</span>
                <Dropdown
                    value={preferences.favouriteDouble}
                    options={[{ label: automatic(learnedDouble, t('darts at doubles')), value: 'auto' }, ...DOUBLES.map(double => ({ label: nameOf(double), value: double }))]}
                    onChange={(e) => save({ favouriteDouble: e.value })}
                    className="w-100"
                />
            </label>
            <label className="d-flex flex-column gap-1 mw-100" style={WHOLE_ROW}>
                <span className="text-subtle fs-8">{t('Main treble')}</span>
                <Dropdown
                    value={preferences.mainTreble}
                    options={[{ label: automatic(learnedTreble, t('games')), value: 'auto' }, ...TREBLES.map(treble => ({ label: treble, value: treble }))]}
                    onChange={(e) => save({ mainTreble: e.value })}
                    className="w-100"
                />
            </label>
            <span className="text-faint fs-8 player-checkout-preferences-hint">
                {t('In X01 the ways out finish on the favourite double first and the scoring tips stay on the main treble.')}
            </span>
            <label className="d-flex flex-column gap-1 mw-100" style={WHOLE_ROW}>
                <span className="text-subtle fs-8">{t('Handicap')}</span>
                <Dropdown
                    value={preferences.handicap ?? 'accept'}
                    options={[
                        { label: t('Plays with a handicap'), value: 'accept' },
                        { label: t('Always from the game\'s own score'), value: 'decline' },
                    ]}
                    onChange={(e) => save({ handicap: e.value })}
                    className="w-100"
                />
            </label>
            <span className="text-faint fs-8 player-checkout-preferences-hint">
                {t('Without a handicap, an X01 game with this player is played from the same score for everyone.')}
            </span>
        </div>
    );
};

export default PlayerCheckoutPreferences;
