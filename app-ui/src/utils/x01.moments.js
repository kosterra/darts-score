import { startingScoreOf } from './x01.rules';

const thrown = (darts) => (darts ?? []).map(dart => String(dart ?? '').trim().toUpperCase()).filter(Boolean);

/**
 * The big moment of an X01 visit, the biggest one if there are several, or
 * null: 'nineDarter' (a 501 leg won with nine darts), 'bigFish' (170 out),
 * 'bull' (a finish on the bull), 'checkout' (a finish of 100 or more),
 * 'oneEighty', 'bedAndBreakfast' (26 with S20, S5, S1).
 *
 * legThrows: the visits of the leg, this one included; won: whether this
 * visit won the leg; busted: whether it is a bust.
 */
export const x01VisitMoment = ({ game, playerId, darts, roundScore, legThrows, won, busted }) => {
    if (busted) return null;
    const visit = thrown(darts);
    if (won) {
        const dartsInLeg = legThrows.filter(entry => entry.playerId === playerId).reduce((sum, entry) => sum + thrown(entry.darts).length, 0);
        if (startingScoreOf(game, playerId) === 501 && dartsInLeg > 0 && dartsInLeg <= 9) return { kind: 'nineDarter' };
        if (roundScore === 170) return { kind: 'bigFish' };
        if (visit.at(-1) === 'D25') return { kind: 'bull', checkout: roundScore };
        if (roundScore >= 100) return { kind: 'checkout', checkout: roundScore };
    }
    if (roundScore === 180) return { kind: 'oneEighty' };
    if (visit.length === 3 && [...visit].sort().join() === ['S1', 'S20', 'S5'].join()) return { kind: 'bedAndBreakfast' };
    return null;
};
