import { lastDartIsDouble, lastDartIsTriple } from './game.utils';

/**
 * The visit being entered in Elimination, from the score it would leave
 * ("currentScore": the score before it and its darts so far).
 */

// the darts so far bust the visit: past the target, one short of it with a
// double (or master) out, or on it without the double (or the double or treble)
export const eliminationBust = (game, currentScore) => {
    if (game.hasWinner) return false;
    const target = game.targetScore;
    if (currentScore > target) return true;
    const mode = game.gameOutMode;
    if (mode !== 'Double Out' && mode !== 'Master Out') return false;
    // one short cannot be finished on a double (or a treble)
    if (currentScore === target - 1) return true;
    if (currentScore !== target) return false;
    return mode === 'Double Out'
        ? !lastDartIsDouble(game.currentThrow)
        : !lastDartIsDouble(game.currentThrow) && !lastDartIsTriple(game.currentThrow);
};

// another dart may be thrown: fewer than three so far and the visit not bust (a bust ends it, as in X01)
export const eliminationCanThrow = (game, currentScore) => {
    if (game.hasWinner) return false;
    const thrown = game.currentThrow?.filter(dart => dart.trim() !== '').length ?? 0;
    return thrown < 3 && !eliminationBust(game, currentScore);
};

// darts are missing before the visit can be entered: each of three unless it is bust or on the target
export const eliminationDartsMissing = (game, values, currentScore) => {
    const empties = values.filter(value => value.trim() === '').length;
    const ended = currentScore >= game.targetScore || eliminationBust(game, currentScore);
    return (!ended && empties > 0) || values[0] === '' || (values[1] === '' && values[2] !== '');
};
