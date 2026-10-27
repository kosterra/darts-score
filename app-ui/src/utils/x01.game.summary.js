import { t } from './i18n';
import { partnersOf } from '../rules/x01';

/**
 * What the statistics page of one finished X01 game shows, worked out from
 * the game itself: every leg, the race to zero of a leg, each player's key
 * figures and the moments of the match.
 */

const number = (key) => Number(String(key).replace(/\D/g, '')) || 0;
const round1 = (value) => Math.round(value * 10) / 10;

// '' stands for a dart not thrown because the leg was over; '0' is a miss
const dartsIn = (visit) => (Array.isArray(visit?.darts) ? visit.darts : []).filter(dart => dart !== '' && dart != null).length;

/**
 * Every leg in the order it was played:
 * [{ key, set, legInSet, number, visits, starter, winner, winnerDarts, checkout, highest: { playerId, score } }]
 */
export const legsOf = (game) => {
    const legs = [];
    Object.entries(game?.allSetsThrows ?? {})
        .sort(([a], [b]) => number(a) - number(b))
        .forEach(([setKey, set]) => {
            Object.entries(set ?? {})
                .sort(([a], [b]) => number(a) - number(b))
                .filter(([, visits]) => Array.isArray(visits) && visits.length > 0)
                .forEach(([legKey, visits], index) => {
                    const finish = visits.find(visit => visit?.scoreLeft === 0);
                    const highest = visits.reduce((best, visit) => (visit?.roundScore ?? 0) > best.score
                        ? { playerId: visit.playerId, score: visit.roundScore }
                        : best, { playerId: null, score: 0 });
                    legs.push({
                        key: `${setKey}/${legKey}`,
                        set: number(setKey),
                        legInSet: index + 1,
                        number: legs.length + 1,
                        visits,
                        starter: visits[0]?.playerId ?? null,
                        winner: finish?.playerId ?? null,
                        // the darts of the winner, in doubles of the team
                        winnerDarts: finish
                            ? visits.filter(visit => [finish.playerId, ...partnersOf(game, finish.playerId)].includes(visit.playerId)).reduce((sum, visit) => sum + dartsIn(visit), 0)
                            : null,
                        checkout: finish?.roundScore ?? null,
                        highest,
                    });
                });
        });
    return legs;
};

/**
 * The race to zero of one leg: the score each player had left after each of
 * their visits, as rows [{ visit, [playerId]: scoreLeft }] starting at visit 0.
 * startingScore: one for all, or a function of the player id (handicap)
 */
export const raceOf = (leg, playerIds, startingScore) => {
    const startOf = typeof startingScore === 'function' ? startingScore : () => startingScore;
    const lefts = Object.fromEntries(playerIds.map(id => [id, [Number(startOf(id))]]));
    (leg?.visits ?? []).forEach(visit => {
        if (lefts[visit.playerId]) lefts[visit.playerId].push(visit.scoreLeft);
    });
    const length = Math.max(...Object.values(lefts).map(list => list.length));
    return Array.from({ length }, (_, visit) => ({
        visit,
        ...Object.fromEntries(playerIds.map(id => [id, lefts[id][visit] ?? null])),
    }));
};

/**
 * One player's key figures in this game. Higher is better for all of them
 * but the best leg; null when the game has nothing to show yet.
 */
export const playerFigures = (game, playerId, legs = legsOf(game)) => {
    const model = game?.playerModels?.[playerId] ?? {};
    const visitsByLeg = legs.map(leg => leg.visits.filter(visit => visit.playerId === playerId));
    const visits = visitsByLeg.flat();
    // the first three visits of every leg
    const firstNine = visitsByLeg.flatMap(legVisits => legVisits.slice(0, 3));
    const checkout = model.checkout?.game ?? {};
    // the legs won, in doubles also those the partner checked out
    const team = [playerId, ...partnersOf(game, playerId)];
    const wonLegs = legs.filter(leg => team.includes(leg.winner));
    const checkouts = Object.keys(model.checkoutScores?.game ?? {}).map(Number).filter(Boolean);

    return {
        average: model.averages?.game?.overall != null ? round1(model.averages.game.overall) : null,
        firstNine: firstNine.length ? round1(firstNine.reduce((sum, visit) => sum + (visit.roundScore ?? 0), 0) / firstNine.length) : null,
        checkoutRate: checkout.total ? Math.round(checkout.hit / checkout.total * 100) : null,
        checkoutDetail: checkout.total ? `${checkout.hit}/${checkout.total}` : null,
        highestCheckout: checkouts.length ? Math.max(...checkouts) : null,
        bestLeg: wonLegs.length ? Math.min(...wonLegs.map(leg => leg.winnerDarts)) : null,
        highestVisit: visits.length ? Math.max(...visits.map(visit => visit.roundScore ?? 0)) : null,
        oneEighties: model.scoreRanges?.game?.['180'] ?? 0,
        // the high scores below 180, as in the side by side of a set
        ton60: model.scoreRanges?.game?.['160-179'] ?? 0,
        ton40: model.scoreRanges?.game?.['140-159'] ?? 0,
        ton20: model.scoreRanges?.game?.['120-139'] ?? 0,
        ton: model.scoreRanges?.game?.['100-119'] ?? 0,
        dartsThrown: model.totalThrow?.game?.darts ?? visits.reduce((sum, visit) => sum + dartsIn(visit), 0),
        legsWon: model.legsWon?.game ?? wonLegs.length,
        setsWon: model.setsWon ?? 0,
    };
};

/**
 * The moments worth a line: highest visit, best checkout, the 180s, the
 * quickest leg and a deciding last leg. [{ id, label, value, playerId, detail }]
 */
export const matchMoments = (game, legs = legsOf(game)) => {
    const moments = [];
    const legName = (leg) => (game?.setsPlayed ?? 1) > 1 ? t('set {{set}}, leg {{legInSet}}', { set: leg.set, legInSet: leg.legInSet }) : t('leg {{legInSet}}', { legInSet: leg.legInSet });

    const highest = legs.reduce((best, leg) => leg.highest.score > (best?.highest.score ?? 0) ? leg : best, null);
    if (highest) moments.push({ id: 'highest', label: t('Highest visit'), value: highest.highest.score, playerId: highest.highest.playerId, detail: legName(highest) });

    const finished = legs.filter(leg => leg.winner);
    const bestCheckout = finished.reduce((best, leg) => leg.checkout > (best?.checkout ?? 0) ? leg : best, null);
    if (bestCheckout) moments.push({ id: 'checkout', label: t('Best checkout'), value: bestCheckout.checkout, playerId: bestCheckout.winner, detail: legName(bestCheckout) });

    const quickest = finished.reduce((best, leg) => leg.winnerDarts < (best?.winnerDarts ?? Infinity) ? leg : best, null);
    if (quickest) moments.push({ id: 'quickest', label: t('Quickest leg'), value: t('{{winnerDarts}} darts', { winnerDarts: quickest.winnerDarts }), playerId: quickest.winner, detail: legName(quickest) });

    const oneEighties = Object.values(game?.playerModels ?? {}).reduce((sum, model) => sum + (model?.scoreRanges?.game?.['180'] ?? 0), 0);
    if (oneEighties > 0) moments.push({ id: '180s', label: oneEighties === 1 ? '180' : '180s', value: oneEighties, playerId: null, detail: t('in this game') });

    // the last leg decided it when everyone still in it had won as many legs of that set
    const last = finished[finished.length - 1];
    if (last && (game?.players?.length ?? 0) > 1) {
        const inLastSet = finished.filter(leg => leg.set === last.set && leg !== last);
        const won = (game.players).map(id => inLastSet.filter(leg => leg.winner === id).length);
        const setsBefore = (game.players).map(id => {
            const total = game.playerModels?.[id]?.setsWon ?? 0;
            return id === last.winner ? total - 1 : total;
        });
        const levelLegs = won.every(count => count === won[0]) && won[0] > 0;
        const levelSets = (game?.setsPlayed ?? 1) === 1 || setsBefore.every(count => count === setsBefore[0]);
        if (levelLegs && levelSets) moments.push({ id: 'decider', label: t('Deciding leg'), value: legName(last), playerId: last.winner, detail: t('won the last leg at all square') });
    }
    return moments;
};
