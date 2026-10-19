import { thrownDarts } from './badges.js';
import { outModeOf, startingScoreOf } from './x01.rules.js';
import { cricketMarks } from './kpi.data.js';

/**
 * Fair play: games and trainings that cannot be real (impossible: the data
 * cannot come from darts thrown at a board), whose data is wrong but no cheat
 * (error: e.g. a score left that does not add up, which the app itself wrote
 * after an undo; it can be repaired) or that are worth a look (suspicious:
 * possible, but far out of the ordinary, e.g. a world-class time).
 * Every check returns findings: [{ rule, level: 'impossible' | 'error' |
 * 'suspicious', title, detail, playerId, places }], places: where it happened
 * ([{ set, leg, visit }] in X01, [{ visit }] in Cricket and Elimination).
 */

export const LEVELS = { impossible: 3, error: 2, suspicious: 1 };

export const THRESHOLDS = {
    // Around the Clock against the clock, in hundredths: 21 targets and the
    // darts fetched six times cannot be done in 20 seconds; under a minute is world class
    atcImpossibleTime: 2000,
    atcSuspiciousTime: 6000,
    // fewest darts: a perfect round, or doubles and trebles hit at 60 % and more
    atcHardRingDarts: 35,
    // a personal best this much better than the one before (with a few trainings before it)
    personalBestJump: 0.4,
    personalBestHistory: 3,
    // X01: a 3-dart average of a professional, or far above the player's own level
    x01HighAverage: 100,
    x01AboveUsual: 35,
    usualGames: 5,
    minRounds: 5,
    // the opponent hardly threw: wins padded against a dummy
    paddingShare: 0.9,
    paddingVisits: 10,
    // entered faster than darts can be thrown (seconds per visit)
    fastSecondsPerVisit: 4,
    fastVisits: 10,
    // Cricket: marks per round of a professional
    cricketHighMarks: 5,
    // Elimination: points per visit
    eliminationHighVisit: 100,
};

const DART = /^(?:[SDT](?:[1-9]|1\d|20)|[SD]25|0)$/;
const VALUE = { S: 1, D: 2, T: 3 };
const dartValue = (dart) => {
    const text = String(dart).trim().toUpperCase();
    if (text === '0') return 0;
    return VALUE[text[0]] * Number(text.slice(1));
};
const finding = (level, rule, title, detail, playerId = null, place = null) => ({ level, rule, title, detail, playerId, places: place ? [place] : [] });
const isDart = (dart) => DART.test(String(dart).trim().toUpperCase());

// the darts of a visit: more than three, or one that is not a field of the board
const visitProblems = (visit, playerId, where, place = null) => {
    const darts = thrownDarts(visit?.darts);
    const found = [];
    if (darts.length > 3) found.push(finding('impossible', 'tooManyDarts', 'More than three darts in a visit', `${darts.length} darts ${where}`, playerId, place));
    const wrong = darts.filter(dart => !isDart(dart));
    if (wrong.length) found.push(finding('impossible', 'invalidDart', 'A dart that is not on the board', `${wrong.join(', ')} ${where}`, playerId, place));
    return found;
};

const median = (values) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * The opponent hardly threw: in a game against them every visit (nearly) scored
 * nothing, which pads the winner's wins and badges.
 */
const padding = (game, visitsOf, scored, winnerId) => {
    const found = [];
    for (const id of game.players ?? []) {
        if (id === winnerId) continue;
        const visits = visitsOf(id);
        if (visits.length < THRESHOLDS.paddingVisits) continue;
        const empty = visits.filter(visit => !scored(visit)).length;
        if (empty / visits.length >= THRESHOLDS.paddingShare) {
            found.push(finding('suspicious', 'padding', 'The opponent hardly threw', `${empty} of ${visits.length} visits without a score: a win against a dummy?`, winnerId));
        }
    }
    return found;
};

// entered faster than darts can be thrown: possible when a game is typed in afterwards
const tooFast = (game, visits) => {
    const seconds = (new Date(game.updatedAt) - new Date(game.createdAt)) / 1000;
    if (!Number.isFinite(seconds) || visits < THRESHOLDS.fastVisits) return [];
    if (seconds / visits >= THRESHOLDS.fastSecondsPerVisit) return [];
    return [finding('suspicious', 'tooFast', 'Played very fast', `${visits} visits in ${Math.round(seconds)} s: typed in afterwards?`)];
};

const keyNumber = (key) => Number(String(key).replace(/\D/g, '')) || 0;

/**
 * The finished legs of an X01 game in the order played, with their keys:
 * [{ setKey, legKey, set, leg, visits }].
 */
export const legEntries = (game) =>
    Object.entries(game.allSetsThrows ?? {})
        .sort(([a], [b]) => keyNumber(a) - keyNumber(b))
        .flatMap(([setKey, set]) => Object.entries(set ?? {})
            .sort(([a], [b]) => keyNumber(a) - keyNumber(b))
            .filter(([, visits]) => Array.isArray(visits))
            .map(([legKey, visits]) => ({ setKey, legKey, set: keyNumber(setKey), leg: keyNumber(legKey), visits })));

const winnerOf = (game) => (game.players ?? []).find(id => game.playerModels?.[id]?.hasWonGame);

/**
 * X01. usualAverage(playerId): the player's usual 3-dart average from their
 * other games, or null.
 */
export const checkX01 = (game, { usualAverage = () => null } = {}) => {
    const found = [];
    const entries = legEntries(game);
    const legs = entries.map(entry => entry.visits);
    let visitCount = 0;

    entries.forEach(({ set, leg: legNumber, visits: leg }, legIndex) => {
        const left = Object.fromEntries((game.players ?? []).map(id => [id, startingScoreOf(game, id)]));
        const darts = Object.fromEntries((game.players ?? []).map(id => [id, 0]));
        leg.forEach((visit, visitIndex) => {
            const id = visit?.playerId;
            if (!(id in left)) return;
            visitCount += 1;
            const where = `in leg ${legIndex + 1}`;
            const place = { set, leg: legNumber, visit: visitIndex };
            found.push(...visitProblems(visit, id, where, place));
            const thrown = thrownDarts(visit.darts);
            darts[id] += thrown.length;
            const sum = thrown.filter(isDart).reduce((total, dart) => total + dartValue(dart), 0);
            if (Number.isFinite(visit.roundScore) && visit.roundScore !== sum) {
                found.push(finding('impossible', 'scoreMismatch', 'The score does not match the darts', `${visit.roundScore} entered for ${thrown.join(' ')} (${sum}) ${where}`, id, place));
            }
            const scoreLeft = Number(visit.scoreLeft);
            const bust = scoreLeft === left[id];
            if (!bust && Number.isFinite(scoreLeft) && left[id] - sum !== scoreLeft) {
                // no cheat: nobody gains from it, and an undo of the app wrote such rests
                found.push(finding('error', 'leftMismatch', 'A score left that does not add up', `${left[id]} − ${sum} leaves ${left[id] - sum}, ${scoreLeft} was saved ${where}`, id, place));
            }
            if (scoreLeft === 0) {
                const last = String(thrown.at(-1) ?? '').toUpperCase();
                const mode = outModeOf(game, id);
                const allowed = mode === 'Double Out' ? /^D/.test(last) : mode === 'Master Out' ? /^[DT]/.test(last) : true;
                if (!allowed) found.push(finding('impossible', 'wrongFinish', `Checked out without a ${mode === 'Master Out' ? 'double or treble' : 'double'}`, `${last || 'no dart'} ${where} with ${mode}`, id, place));
                const start = startingScoreOf(game, id);
                const fewest = Math.ceil(start / 60);
                if (darts[id] < fewest) {
                    found.push(finding('impossible', 'tooFewDarts', 'A leg won with too few darts', `${start} checked out with ${darts[id]} darts ${where}: at least ${fewest} are needed`, id, place));
                } else if (start === 501 && darts[id] <= 9) {
                    found.push(finding('suspicious', 'nineDarter', 'A nine-darter', `the perfect leg ${where}: worth a look`, id, place));
                }
            }
            if (Number.isFinite(scoreLeft)) left[id] = scoreLeft;
        });
    });

    for (const id of game.players ?? []) {
        const model = game.playerModels?.[id] ?? {};
        const average = Number(model.averages?.game?.overall ?? 0);
        const rounds = Number(model.totalThrow?.game?.rounds ?? 0);
        if (rounds < THRESHOLDS.minRounds || !average) continue;
        if (average >= THRESHOLDS.x01HighAverage) {
            found.push(finding('suspicious', 'highAverage', 'A professional average', `${average.toFixed(1)} over ${rounds} visits`, id));
        }
        const usual = usualAverage(id);
        if (usual !== null && average - usual >= THRESHOLDS.x01AboveUsual) {
            found.push(finding('suspicious', 'aboveUsual', 'Far above the usual level', `${average.toFixed(1)}, usually about ${usual.toFixed(1)}`, id));
        }
    }

    const scoreOf = (visit) => thrownDarts(visit.darts).filter(isDart).reduce((total, dart) => total + dartValue(dart), 0) > 0;
    const visitsOf = (id) => legs.flatMap(leg => leg.filter(visit => visit?.playerId === id));
    found.push(...padding(game, visitsOf, scoreOf, winnerOf(game)));
    found.push(...tooFast(game, visitCount));
    return found;
};

export const checkCricket = (game) => {
    const found = [];
    const visits = game.allThrows ?? [];
    visits.forEach((visit, index) => found.push(...visitProblems(visit, visit?.playerId, `in visit ${index + 1}`, { visit: index })));
    for (const id of game.players ?? []) {
        const model = game.playerModels?.[id] ?? {};
        const rounds = Number(model.totalThrow?.game?.rounds ?? 0);
        if (rounds < THRESHOLDS.minRounds) continue;
        const marks = cricketMarks(model.hit) / rounds;
        if (marks >= THRESHOLDS.cricketHighMarks) {
            found.push(finding('suspicious', 'highMarks', 'Professional marks per round', `${marks.toFixed(2)} marks per round over ${rounds} rounds`, id));
        }
    }
    const marked = (visit) => thrownDarts(visit.darts).some(dart => /^[SDT](1[5-9]|20|25)$/i.test(String(dart)));
    found.push(...padding(game, (id) => visits.filter(visit => visit?.playerId === id), marked, winnerOf(game)));
    found.push(...tooFast(game, visits.length));
    return found;
};

export const checkElimination = (game) => {
    const found = [];
    const visits = game.allThrows ?? [];
    visits.forEach((visit, index) => {
        found.push(...visitProblems(visit, visit?.playerId, `in visit ${index + 1}`, { visit: index }));
        if (visit?.bust) return;
        const thrown = thrownDarts(visit?.darts);
        const sum = thrown.filter(isDart).reduce((total, dart) => total + dartValue(dart), 0);
        if (Number.isFinite(visit?.roundScore) && visit.roundScore > sum) {
            found.push(finding('impossible', 'scoreMismatch', 'The score does not match the darts', `${visit.roundScore} entered for ${thrown.join(' ')} (${sum}) in visit ${index + 1}`, visit.playerId, { visit: index }));
        }
    });
    for (const id of game.players ?? []) {
        const own = visits.filter(visit => visit?.playerId === id && !visit.bust);
        if (own.length < THRESHOLDS.minRounds) continue;
        const average = own.reduce((sum, visit) => sum + Number(visit.roundScore ?? 0), 0) / own.length;
        if (average >= THRESHOLDS.eliminationHighVisit) {
            found.push(finding('suspicious', 'highAverage', 'A professional average', `${average.toFixed(1)} points per visit over ${own.length} visits`, id));
        }
    }
    found.push(...padding(game, (id) => visits.filter(visit => visit?.playerId === id), (visit) => Number(visit.roundScore ?? 0) > 0, winnerOf(game)));
    found.push(...tooFast(game, visits.length));
    return found;
};

export const checkClock = (game) => {
    const found = [];
    const skip = Boolean(game.skipAhead) && game.mode === 'All';
    const wrong = (game.throws ?? []).filter(value => !Number.isInteger(value) || value < 0 || value > (skip ? 3 : 1));
    if (wrong.length) found.push(finding('impossible', 'invalidDart', 'A dart that cannot be entered', `${wrong.length} darts with the values ${[...new Set(wrong)].join(', ')}`));
    for (const id of game.players ?? []) {
        const model = game.playerModels?.[id] ?? {};
        const darts = Number(model.darts ?? 0);
        if (darts >= 21 && model.hits === darts && (game.mode === 'Double' || game.mode === 'Triple')) {
            found.push(finding('suspicious', 'perfectRound', 'Every dart a hit', `${darts} darts, all hits, on ${game.mode === 'Double' ? 'doubles' : 'trebles'}`, id));
        }
    }
    return found;
};

/**
 * A training of Around the Clock. history: the player's earlier trainings of
 * the same mode and scoring, oldest first.
 */
export const checkTraining = (entry, history = []) => {
    const found = [];
    const playerId = entry.player?.id ?? null;
    const darts = entry.scoring === 'Darts';
    if (darts) {
        if (!(entry.darts >= 21)) found.push(finding('impossible', 'tooFewDarts', 'Fewer darts than targets', `${entry.darts} darts for 21 targets`, playerId));
        const perTarget = entry.dartsPerTarget;
        if (Array.isArray(perTarget) && perTarget.length) {
            const sum = perTarget.reduce((total, value) => total + value, 0);
            if (perTarget.length !== 21 || perTarget.some(value => !(value >= 1)) || sum !== entry.darts) {
                found.push(finding('impossible', 'dartsMismatch', 'The darts per target do not add up', `${perTarget.length} targets with ${sum} darts, ${entry.darts} entered`, playerId));
            }
        }
        if (entry.darts === 21) {
            found.push(finding('suspicious', 'perfectRound', 'Every dart a hit', `21 darts in ${entry.mode}`, playerId));
        } else if ((entry.mode === 'Double' || entry.mode === 'Triple') && entry.darts <= THRESHOLDS.atcHardRingDarts) {
            found.push(finding('suspicious', 'hardRing', `A world-class round on ${entry.mode === 'Double' ? 'doubles' : 'trebles'}`, `${entry.darts} darts: ${Math.round(21 / entry.darts * 100)} % hits`, playerId));
        }
    } else {
        const seconds = (entry.timeMs ?? 0) / 100;
        if (entry.timeMs < THRESHOLDS.atcImpossibleTime) {
            found.push(finding('impossible', 'tooFast', 'Faster than darts can be thrown', `${seconds.toFixed(2)} s for 21 targets, the darts fetched in between`, playerId));
        } else if (entry.timeMs < THRESHOLDS.atcSuspiciousTime) {
            found.push(finding('suspicious', 'worldClassTime', 'A world-class time', `${seconds.toFixed(2)} s: under a minute`, playerId));
        }
    }
    // a personal best far better than the one before
    const value = darts ? entry.darts : entry.timeMs;
    const earlier = history.map(item => darts ? item.darts : item.timeMs).filter(item => Number.isFinite(item) && item > 0);
    if (Number.isFinite(value) && earlier.length >= THRESHOLDS.personalBestHistory) {
        const best = Math.min(...earlier);
        if (value < best * (1 - THRESHOLDS.personalBestJump)) {
            found.push(finding('suspicious', 'bestJump', 'A sudden jump', `${Math.round((1 - value / best) * 100)} % better than the best of ${earlier.length} trainings before`, playerId));
        }
    }
    return found;
};

/**
 * The same finding for the same player once, with how often it came up
 * (e.g. a nine-darter in four legs).
 */
export const compact = (findings) => {
    const merged = new Map();
    for (const item of findings) {
        const key = `${item.level}|${item.rule}|${item.playerId ?? ''}`;
        const seen = merged.get(key);
        if (seen) {
            seen.count += 1;
            seen.places = [...seen.places, ...(item.places ?? [])];
        } else {
            merged.set(key, { ...item, places: item.places ?? [], count: 1 });
        }
    }
    return [...merged.values()].map(({ count, ...item }) => count > 1 ? { ...item, detail: `${count}× · ${item.detail}` } : item);
};

/**
 * The level of a game or training: the worst of its findings.
 */
export const levelOf = (findings) => {
    if (!findings.length) return null;
    return findings.reduce((worst, item) => LEVELS[item.level] > LEVELS[worst] ? item.level : worst, 'suspicious');
};

/**
 * Each player's usual X01 average: the median over their games, without the
 * game being checked; null with too few games. games: finished X01 games.
 */
export const usualAverages = (games) => {
    const byPlayer = new Map();
    for (const game of games) {
        for (const id of game.players ?? []) {
            const model = game.playerModels?.[id] ?? {};
            const average = Number(model.averages?.game?.overall ?? 0);
            if (!average || Number(model.totalThrow?.game?.rounds ?? 0) < THRESHOLDS.minRounds) continue;
            if (!byPlayer.has(id)) byPlayer.set(id, []);
            byPlayer.get(id).push({ gameId: String(game._id ?? game.id), average });
        }
    }
    return (gameId) => (playerId) => {
        const others = (byPlayer.get(playerId) ?? []).filter(item => item.gameId !== String(gameId)).map(item => item.average);
        return others.length >= THRESHOLDS.usualGames ? median(others) : null;
    };
};

// the app's busts: below 0, a rest of 1 or a finish on the wrong dart when the out mode needs a double (or treble)
const isBust = (rest, lastDart, mode) => {
    if (rest < 0) return true;
    const last = String(lastDart ?? '').toUpperCase();
    if (mode === 'Double Out') return rest === 1 || (rest === 0 && !/^D/.test(last));
    if (mode === 'Master Out') return rest === 1 || (rest === 0 && !/^[DT]/.test(last));
    return false;
};

/**
 * Works the scores left of an X01 game out again from the darts, with the
 * app's busts. Possible only when every leg still ends the same way: its last
 * visit checks out and none before it does, so no leg changes hands.
 * { possible: true, changed, allSetsThrows } or { possible: false, reason }.
 */
export const repairX01 = (game) => {
    const allSetsThrows = structuredClone(game.allSetsThrows ?? {});
    let changed = 0;
    for (const { setKey, legKey, set, leg, visits } of legEntries({ allSetsThrows })) {
        const left = Object.fromEntries((game.players ?? []).map(id => [id, startingScoreOf(game, id)]));
        for (const [index, visit] of visits.entries()) {
            const id = visit?.playerId;
            if (!(id in left)) continue;
            const thrown = thrownDarts(visit.darts);
            if (!thrown.every(isDart)) return { possible: false, reason: `A dart that is not on the board in set ${set}, leg ${leg}` };
            const rest = left[id] - thrown.reduce((total, dart) => total + dartValue(dart), 0);
            const scoreLeft = isBust(rest, thrown.at(-1), outModeOf(game, id)) ? left[id] : rest;
            const last = index === visits.length - 1;
            if (scoreLeft === 0 && !last) return { possible: false, reason: `Set ${set}, leg ${leg} would have ended earlier` };
            if (last && scoreLeft !== 0) return { possible: false, reason: `The darts do not finish set ${set}, leg ${leg}` };
            if (Number(visit.scoreLeft) !== scoreLeft) {
                allSetsThrows[setKey][legKey][index] = { ...visit, scoreLeft };
                changed += 1;
            }
            left[id] = scoreLeft;
        }
    }
    return { possible: true, changed, allSetsThrows };
};

/**
 * The legs of an X01 game for a closer look: each visit with what was left
 * before it (as saved), what should be left after it, and what a repair would
 * save. [{ set, leg, visits: [{ playerId, darts, roundScore, scoreLeft, before,
 * expected, repaired }] }]
 */
export const x01Legs = (game) => {
    const repair = repairX01(game);
    return legEntries(game).map(({ setKey, legKey, set, leg, visits }) => {
        const left = Object.fromEntries((game.players ?? []).map(id => [id, startingScoreOf(game, id)]));
        return {
            set,
            leg,
            visits: visits.map((visit, index) => {
                const id = visit?.playerId;
                const thrown = thrownDarts(visit?.darts);
                const before = left[id];
                const rest = before - thrown.filter(isDart).reduce((total, dart) => total + dartValue(dart), 0);
                const expected = Number.isFinite(before) ? (isBust(rest, thrown.at(-1), outModeOf(game, id)) ? before : rest) : null;
                const scoreLeft = Number(visit?.scoreLeft);
                if (Number.isFinite(scoreLeft) && id in left) left[id] = scoreLeft;
                return {
                    playerId: id,
                    darts: thrown,
                    roundScore: visit?.roundScore ?? null,
                    scoreLeft: Number.isFinite(scoreLeft) ? scoreLeft : null,
                    before: before ?? null,
                    expected,
                    repaired: repair.possible ? repair.allSetsThrows[setKey][legKey][index]?.scoreLeft ?? null : null,
                };
            }),
        };
    });
};
