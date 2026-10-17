/**
 * What the statistics page of one Cricket game shows, worked out by replaying
 * its visits with the rules of the game: a number is closed with three marks;
 * further marks score its value as long as not every other player has closed
 * it too. The bull counts 25.
 */

export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25];
const MULTIPLIER = { S: 1, D: 2, T: 3 };
const round2 = (value) => Math.round(value * 100) / 100;

// "T20" → { multiplier: 3, number: 20 }; misses and other numbers count nothing on the board
const parseDart = (dart) => {
    const match = /^([SDT])(\d{1,2})$/i.exec(String(dart ?? '').trim());
    if (!match) return null;
    return { multiplier: MULTIPLIER[match[1].toUpperCase()], number: Number(match[2]) };
};

const thrown = (darts) => (Array.isArray(darts) ? darts : []).filter(dart => dart !== '' && dart != null);

/**
 * Replays the game. Returns every visit with what it did and the final board:
 * { visits: [{ index, playerId, turn, darts, marks, points, closed, totalPoints, closedMarks }],
 *   board: { [number]: { marks: { [playerId]: count }, points: { [playerId]: points }, closedBy, closedAt } } }
 * "marks" counts every mark on 15–20 and the bull, as marks per round does;
 * closedMarks is how far a player is towards closing all seven numbers (0–21).
 */
export const replayCricket = (game) => {
    const players = game?.players ?? [];
    const counts = Object.fromEntries(players.map(id => [id, Object.fromEntries(CRICKET_NUMBERS.map(n => [n, 0]))]));
    const totals = Object.fromEntries(players.map(id => [id, 0]));
    const turns = Object.fromEntries(players.map(id => [id, 0]));
    const board = Object.fromEntries(CRICKET_NUMBERS.map(n => [n, {
        marks: Object.fromEntries(players.map(id => [id, 0])),
        points: Object.fromEntries(players.map(id => [id, 0])),
        closedBy: null,
        closedAt: null,
    }]));

    const visits = (game?.allThrows ?? []).filter(visit => counts[visit?.playerId]).map((visit, index) => {
        const { playerId } = visit;
        const mine = counts[playerId];
        const others = players.filter(id => id !== playerId);
        let marks = 0;
        let points = 0;
        const closed = [];

        thrown(visit.darts).forEach(dart => {
            const hit = parseDart(dart);
            if (!hit || !CRICKET_NUMBERS.includes(hit.number)) return;
            marks += hit.multiplier;
            const closedByOthers = others.length > 0 && others.every(id => counts[id][hit.number] >= 3);
            const before = mine[hit.number];
            if (before >= 3 && closedByOthers) return;
            const after = closedByOthers ? Math.min(3, before + hit.multiplier) : before + hit.multiplier;
            mine[hit.number] = after;
            const scored = (Math.max(after, 3) - Math.max(before, 3)) * hit.number;
            points += scored;
            board[hit.number].points[playerId] += scored;
            if (before < 3 && after >= 3) {
                closed.push(hit.number);
                if (!board[hit.number].closedBy) {
                    board[hit.number].closedBy = playerId;
                    board[hit.number].closedAt = index;
                }
            }
        });

        totals[playerId] += points;
        turns[playerId] += 1;
        return {
            index,
            playerId,
            turn: turns[playerId],
            darts: thrown(visit.darts),
            marks,
            points,
            closed,
            totalPoints: totals[playerId],
            closedMarks: CRICKET_NUMBERS.reduce((sum, n) => sum + Math.min(3, mine[n]), 0),
        };
    });

    players.forEach(id => CRICKET_NUMBERS.forEach(n => { board[n].marks[id] = counts[id][n]; }));
    return { visits, board };
};

/**
 * One player's key figures in this game.
 */
export const cricketFigures = (game, playerId, replay = replayCricket(game)) => {
    const model = game?.playerModels?.[playerId] ?? {};
    const visits = replay.visits.filter(visit => visit.playerId === playerId);
    const marks = visits.reduce((sum, visit) => sum + visit.marks, 0);
    const rounds = Number(model.totalThrow?.game?.rounds ?? visits.length);
    const darts = visits.flatMap(visit => visit.darts);
    const hitsOf = (pattern) => darts.filter(dart => pattern.test(dart)).length;

    return {
        marksPerRound: rounds ? round2(marks / rounds) : null,
        points: Number(model.score ?? visits.reduce((sum, visit) => sum + visit.points, 0)),
        marks,
        bestRound: visits.length ? Math.max(...visits.map(visit => visit.marks)) : null,
        bestPoints: visits.length ? Math.max(...visits.map(visit => visit.points)) : null,
        triples: hitsOf(/^T(1[5-9]|20)$/i),
        bulls: hitsOf(/^S25$/i) + 2 * hitsOf(/^D25$/i),
        closedFirst: CRICKET_NUMBERS.filter(n => replay.board[n].closedBy === playerId).length,
        dartsThrown: Number(model.totalThrow?.game?.darts ?? darts.length),
        rounds,
    };
};

/**
 * Progress over the game, one row per round:
 * [{ round, [playerId]: closedMarks }] and [{ round, [playerId]: totalPoints }], starting at round 0.
 */
export const cricketProgress = (game, replay = replayCricket(game)) => {
    const players = game?.players ?? [];
    const rounds = Math.max(0, ...replay.visits.map(visit => visit.turn));
    const rowsOf = (key) => Array.from({ length: rounds + 1 }, (_, round) => ({
        round,
        ...Object.fromEntries(players.map(id => {
            if (round === 0) return [id, 0];
            const visit = replay.visits.find(entry => entry.playerId === id && entry.turn === round);
            return [id, visit ? visit[key] : null];
        })),
    }));
    return { closing: rowsOf('closedMarks'), points: rowsOf('totalPoints') };
};

/**
 * The moments worth a line: the best round in marks, the most points in one
 * visit, the triples and the bull hits. [{ id, label, value, playerId, detail }]
 */
export const cricketMoments = (game, replay = replayCricket(game)) => {
    const moments = [];
    const best = (key) => replay.visits.reduce((top, visit) => visit[key] > (top?.[key] ?? 0) ? visit : top, null);

    const bestMarks = best('marks');
    if (bestMarks) moments.push({ id: 'marks', label: 'Best round', value: `${bestMarks.marks} marks`, playerId: bestMarks.playerId, detail: `round ${bestMarks.turn}` });

    const bestPoints = best('points');
    if (bestPoints) moments.push({ id: 'points', label: 'Most points in a round', value: bestPoints.points, playerId: bestPoints.playerId, detail: `round ${bestPoints.turn}` });

    const darts = replay.visits.flatMap(visit => visit.darts);
    const triples = darts.filter(dart => /^T(1[5-9]|20)$/i.test(dart)).length;
    if (triples) moments.push({ id: 'triples', label: triples === 1 ? 'Triple' : 'Triples', value: triples, playerId: null, detail: 'on 15 to 20' });

    const bullseyes = darts.filter(dart => /^D25$/i.test(dart)).length;
    if (bullseyes) moments.push({ id: 'bullseyes', label: bullseyes === 1 ? 'Bullseye' : 'Bullseyes', value: bullseyes, playerId: null, detail: 'in this game' });

    return moments;
};

/**
 * A player's hits per number and ring ({ T20: 2, S25: 1, … }) in the form of
 * the hits heatmap: [{ section: '20', S, D, T }].
 */
export const hitsBySection = (hits = {}) => {
    const sections = new Map();
    Object.entries(hits).forEach(([dart, count]) => {
        const hit = /^([SDT])(\d{1,2})$/i.exec(dart);
        if (!hit) return;
        const section = String(Number(hit[2]));
        const entry = sections.get(section) ?? { section, S: 0, D: 0, T: 0 };
        entry[hit[1].toUpperCase()] += Number(count) || 0;
        sections.set(section, entry);
    });
    return [...sections.values()];
};
