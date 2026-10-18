/**
 * What the statistics page of one Elimination game shows, worked out by
 * replaying its visits with the rules of the game: everyone climbs from 0 to
 * the target score, and a dart that lands exactly on an opponent's score
 * sends that opponent back to 0. A bust changes nothing; busts are stored
 * since 2026-10, so older games do not show them.
 */

const round1 = (value) => Math.round(value * 10) / 10;

// "T20" → 60, "D25" → 50, "0" or "" → 0
const dartValue = (dart) => {
    const text = String(dart ?? '').trim();
    const match = /^([SDT])(\d{1,2})$/i.exec(text);
    if (!match) return 0;
    return Number(match[2]) * ({ S: 1, D: 2, T: 3 })[match[1].toUpperCase()];
};

const thrown = (darts) => (Array.isArray(darts) ? darts : []).filter(dart => dart !== '' && dart != null);

/**
 * Replays the game:
 * { visits: [{ index, playerId, turn, darts, score, before, after }],
 *   eliminations: [{ visit, turn, by, victim, at }] }
 * "at" is the score the victim lost; after a visit "after" is the player's score.
 */
export const replayElimination = (game) => {
    const players = game?.players ?? [];
    const scores = Object.fromEntries(players.map(id => [id, 0]));
    const turns = Object.fromEntries(players.map(id => [id, 0]));
    const eliminations = [];

    const visits = (game?.allThrows ?? []).filter(visit => visit?.playerId in scores).map((visit, index) => {
        const { playerId } = visit;
        const before = scores[playerId];
        turns[playerId] += 1;
        if (visit.bust) return { index, playerId, turn: turns[playerId], darts: thrown(visit.darts), score: 0, before, after: before, bust: true };
        let running = before;
        thrown(visit.darts).forEach(dart => {
            running += dartValue(dart);
            players.filter(id => id !== playerId).forEach(id => {
                if (running > 0 && scores[id] === running) {
                    eliminations.push({ visit: index, turn: turns[playerId], by: playerId, victim: id, at: scores[id] });
                    scores[id] = 0;
                }
            });
            scores[playerId] = running;
        });
        scores[playerId] = running;
        return { index, playerId, turn: turns[playerId], darts: thrown(visit.darts), score: visit.roundScore ?? running - before, before, after: running };
    });

    return { visits, eliminations, finalScores: scores };
};

/**
 * One player's key figures in this game.
 */
export const eliminationFigures = (game, playerId, replay = replayElimination(game)) => {
    const visits = replay.visits.filter(visit => visit.playerId === playerId);
    const scores = visits.map(visit => visit.score);
    const lost = replay.eliminations.filter(event => event.victim === playerId);
    return {
        score: replay.finalScores[playerId] ?? 0,
        average: scores.length ? round1(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
        highestVisit: scores.length ? Math.max(...scores) : null,
        tonPlus: scores.filter(score => score >= 100).length,
        eliminationsMade: replay.eliminations.filter(event => event.by === playerId).length,
        timesEliminated: lost.length,
        pointsLost: lost.reduce((sum, event) => sum + event.at, 0),
        dartsThrown: visits.reduce((sum, visit) => sum + visit.darts.length, 0),
        visits: visits.length,
    };
};

/**
 * Every player's score after each visit of the game, as rows
 * [{ round, [playerId]: score }] from 0 ("round" counts the visits, so a
 * knock-out and the reply in the same round both show).
 */
export const eliminationRace = (game, replay = replayElimination(game)) => {
    const players = game?.players ?? [];
    const current = Object.fromEntries(players.map(id => [id, 0]));
    const rows = [{ round: 0, ...current }];
    replay.visits.forEach(visit => {
        current[visit.playerId] = visit.after;
        replay.eliminations.filter(event => event.visit === visit.index).forEach(event => { current[event.victim] = 0; });
        rows.push({ round: visit.index + 1, ...current });
    });
    return rows;
};

/**
 * How often each score range was thrown, in the form of the score ranges
 * chart: [{ range, player1Count, … }] in the order of "players".
 */
const RANGES = [[180, 180, '180'], [160, 179, '160-179'], [140, 159, '140-159'], [120, 139, '120-139'], [100, 119, '100-119'],
    [80, 99, '80-99'], [60, 79, '60-79'], [40, 59, '40-59'], [20, 39, '20-39'], [1, 19, '1-19'], [0, 0, 'ZERO']];

export const eliminationScoreRanges = (playerIds, replay) => RANGES.map(([min, max, range]) => ({
    range,
    ...Object.fromEntries(playerIds.map((id, index) => [`player${index + 1}Count`,
        replay.visits.filter(visit => visit.playerId === id && visit.score >= min && visit.score <= max).length])),
})).filter(row => playerIds.some((_, index) => row[`player${index + 1}Count`] > 0));

/**
 * A player's darts by number and ring for the hits heatmap: [{ section, S, D, T }].
 */
export const eliminationHits = (playerId, replay) => {
    const sections = new Map();
    replay.visits.filter(visit => visit.playerId === playerId).flatMap(visit => visit.darts).forEach(dart => {
        const hit = /^([SDT])(\d{1,2})$/i.exec(String(dart).trim());
        if (!hit) return;
        const section = String(Number(hit[2]));
        const entry = sections.get(section) ?? { section, S: 0, D: 0, T: 0 };
        entry[hit[1].toUpperCase()] += 1;
        sections.set(section, entry);
    });
    return [...sections.values()];
};

/**
 * The moments worth a line: the highest visit, the biggest knock-out, the
 * winning visit and a comeback after being knocked out.
 */
export const eliminationMoments = (game, replay = replayElimination(game)) => {
    const moments = [];
    const highest = replay.visits.reduce((top, visit) => visit.score > (top?.score ?? 0) ? visit : top, null);
    if (highest) moments.push({ id: 'highest', label: 'Highest visit', value: highest.score, playerId: highest.playerId, detail: `round ${highest.turn}` });

    const biggest = replay.eliminations.reduce((top, event) => event.at > (top?.at ?? 0) ? event : top, null);
    if (biggest) moments.push({ id: 'knockout', label: 'Biggest knock-out', value: `${biggest.at} points`, playerId: biggest.by, detail: `round ${biggest.turn}`, victim: biggest.victim });

    if (replay.eliminations.length) {
        moments.push({ id: 'eliminations', label: replay.eliminations.length === 1 ? 'Knock-out' : 'Knock-outs', value: replay.eliminations.length, playerId: null, detail: 'in this game' });
    }

    const winnerId = (game?.players ?? []).find(id => game.playerModels?.[id]?.hasWonGame);
    const finish = winnerId ? [...replay.visits].reverse().find(visit => visit.playerId === winnerId) : null;
    if (finish) moments.push({ id: 'finish', label: 'Winning visit', value: finish.score, playerId: winnerId, detail: `round ${finish.turn}, ${finish.darts.join(' ')}` });

    if (winnerId && replay.eliminations.some(event => event.victim === winnerId)) {
        moments.push({ id: 'comeback', label: 'Comeback', value: 'Back from 0', playerId: winnerId, detail: 'won after a knock-out' });
    }
    return moments;
};
