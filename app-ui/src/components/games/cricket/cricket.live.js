import { CRICKET_NUMBERS } from '../../../utils/cricket.game.summary';
import { variantOf } from '../../../utils/cricket.variants';

export const numberLabel = (number) => number === 25 ? 'Bull' : String(number);

/**
 * The marks of every player on every number as they are now, the darts of
 * the visit being entered included: { [playerId]: { [number]: marks } }.
 */
export const liveMarks = (game, currentSectionHit) => Object.fromEntries(game.players.map(id => {
    const hits = id === game.currentPlayerTurn && currentSectionHit ? currentSectionHit : game.playerModels[id]?.sectionHit ?? {};
    return [id, Object.fromEntries(CRICKET_NUMBERS.map(n => [n, Number(hits[String(n)] ?? 0)]))];
}));

/**
 * The marks the darts of a visit put on 15 to 20 and the bull, as marks per
 * round counts them.
 */
export const visitMarks = (darts) => darts.reduce((sum, dart) => {
    const match = /^([SDT])(\d+)$/i.exec(String(dart).trim());
    if (!match || !CRICKET_NUMBERS.includes(Number(match[2]))) return sum;
    return sum + { S: 1, D: 2, T: 3 }[match[1].toUpperCase()];
}, 0);

/**
 * What a player should aim at next: score on a number they closed while the
 * others still have it open (when they need points), otherwise close the next
 * number, from 20 down to the bull. { text, title } or null when all is closed.
 */
export const cricketTip = (game, marks, scores, playerId) => {
    const variant = variantOf(game);
    const others = game.players.filter(id => id !== playerId);
    const open = (n, id) => (marks[id]?.[n] ?? 0) < 3;
    const toClose = CRICKET_NUMBERS.filter(n => open(n, playerId));
    const scoring = CRICKET_NUMBERS.filter(n => !open(n, playerId) && others.some(id => open(n, id)));
    const mine = scores[playerId] ?? 0;
    const otherScores = others.map(id => scores[id] ?? 0);

    if (variant !== 'No-score' && scoring.length) {
        // Standard: more points wins; cut-throat: the points go to the others, the lowest wins
        const needsPoints = variant === 'Cut-throat'
            ? otherScores.some(score => score <= mine)
            : otherScores.some(score => score >= mine);
        if (needsPoints || !toClose.length) {
            const number = scoring[0];
            return variant === 'Cut-throat'
                ? { text: `Points on ${numberLabel(number)}`, title: 'Give points to the others while they still have it open' }
                : { text: `Score on ${numberLabel(number)}`, title: 'Your number, still open for the others: every mark scores' };
        }
    }
    if (!toClose.length) return null;
    const number = toClose[0];
    const missing = 3 - (marks[playerId]?.[number] ?? 0);
    return { text: `Close ${numberLabel(number)}`, title: `${missing} ${missing === 1 ? 'mark' : 'marks'} to close it` };
};
