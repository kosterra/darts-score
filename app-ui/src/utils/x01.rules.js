// The rules a player plays an X01 game by. With a handicap each player may
// have their own starting score and in/out mode (kept in their player model);
// without one, the game's settings apply to everyone.
import { validateDartValue } from './game.utils';

const own = (game, playerId) => game?.playerModels?.[playerId] ?? {};

export const startingScoreOf = (game, playerId) => Number(own(game, playerId).startingScore ?? game?.startingScore);

export const inModeOf = (game, playerId) => own(game, playerId).legInMode ?? game?.legInMode;

export const outModeOf = (game, playerId) => own(game, playerId).legOutMode ?? game?.legOutMode;

export const rulesOf = (game, playerId) => ({
    startingScore: startingScoreOf(game, playerId),
    legInMode: inModeOf(game, playerId),
    legOutMode: outModeOf(game, playerId),
});

// whether the players do not all play by the game's settings
export const hasHandicap = (game) => (game?.players ?? []).some(playerId => {
    const rules = rulesOf(game, playerId);
    return rules.startingScore !== Number(game.startingScore)
        || rules.legInMode !== game.legInMode
        || rules.legOutMode !== game.legOutMode;
});

const MODE_SHORT = {
    'Straight In': 'SI', 'Double In': 'DI', 'Master In': 'MI',
    'Straight Out': 'SO', 'Double Out': 'DO', 'Master Out': 'MO',
};

// e.g. "301 · SI/SO"
export const describeRules = ({ startingScore, legInMode, legOutMode }) =>
    `${startingScore} · ${MODE_SHORT[legInMode] ?? legInMode}/${MODE_SHORT[legOutMode] ?? legOutMode}`;

/**
 * Whether what is left after the darts of the visit so far is a bust: below
 * zero, or with double (master) out a rest of 1 or a finish on the wrong
 * dart. A rest of 0 without a dart in this visit is no bust: that is the
 * player who has just won, while the game shows its end.
 */
export const isBust = (score, currentThrow = [], outMode = 'Double Out') => {
    if (score < 0) return true;
    const thrown = currentThrow.filter(dart => dart && String(dart).trim() !== '');
    const last = String(thrown.at(-1) ?? '').toUpperCase();
    if (outMode === 'Double Out') return score === 1 || (score === 0 && thrown.length > 0 && !last.startsWith('D'));
    if (outMode === 'Master Out') return score === 1 || (score === 0 && thrown.length > 0 && !/^[DT]/.test(last));
    return false;
};

/**
 * The darts of a visit with the player's in mode: until a dart opens the leg
 * (Double In: a double; Master In: a double or a treble) the others are
 * misses, by the darts before them (not by what the visit scores in the end).
 * started: the leg was opened in an earlier visit. A dart not entered yet or
 * still being typed leaves those after it as they are, until it is known.
 */
export const withInMode = (darts, inMode, started) => {
    if (started || (inMode !== 'Double In' && inMode !== 'Master In')) return darts;
    const opens = inMode === 'Double In' ? /^d/i : /^[dt]/i;
    const result = [...darts];
    for (let index = 0; index < result.length; index++) {
        const dart = String(result[index] ?? '').trim();
        if (dart === '' || !validateDartValue(dart)) break;
        if (Number(dart) !== 0 && opens.test(dart)) break;
        result[index] = '0';
    }
    return result;
};

