import { thrownDarts } from './badges.js';
import { outModeOf, startingScoreOf } from './x01.rules.js';
import { cricketMarks } from './kpi.data.js';
import { gameOf } from '../rules/games.js';
import { trainingOf } from '../rules/trainings.js';
import { replayGame, replayTraining, withGameState } from '../rules/engine.js';
import { withView } from './game.view.js';
import { sideKeysOf } from '../rules/x01.js';

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
    // a player's own date of birth moved later by more than this many days
    birthLaterDays: 31,
    // the newer games: what a professional does
    shanghaiHitRate: 0.8,
    golfStrokesPerHole: 1.3,
    tacticsHighMarks: 5,
    halveItHighPoints: 400,
    // the newer trainings: far out of reach for a club player
    bobs27High: 1000,
    randomCheckoutsPerfect: 100,
    randomCheckoutsAttempts: 10,
    scoringHighAverage: 100,
    doublesAroundFewDarts: 25,
    catch40High: 110,
    checkout121High: 160,
    // a training's darts entered faster than they can be thrown (seconds per dart)
    trainingImpossibleSecondsPerDart: 0.5,
    trainingFastSecondsPerDart: 1.3,
    trainingFastDarts: 30,
    // the same win again and again within a day against someone who hardly plays otherwise
    farmingWins: 5,
    farmingHours: 24,
    farmingRarelyFactor: 2,
    // many tiny games within an hour (darts of all players together)
    tinyGameDarts: 30,
    tinyGames: 10,
    tinyMinutes: 60,
    // a player asking to delete games, mostly ones they lost
    deletionRequests: 3,
    deletionLostShare: 0.8,
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
        // the winner, and in doubles their partner
        if (id === winnerId || game.playerModels?.[id]?.hasWonGame) continue;
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
// whose score a visit of X01 counts on: the player's own, or in doubles their team's (kept under its first player)
const scoreKeysOf = sideKeysOf;

/**
 * X01. usualAverage(playerId): the player's usual 3-dart average from their
 * other games, or null.
 */
export const checkX01 = (stored, { usualAverage = () => null } = {}) => {
    // the legs, with what was left after every visit, follow from the visits
    const game = withView('x01', stored);
    const found = [];
    const entries = legEntries(game);
    const legs = entries.map(entry => entry.visits);
    let visitCount = 0;

    const keyOf = scoreKeysOf(game);
    entries.forEach(({ set, leg: legNumber, visits: leg }, legIndex) => {
        // per player, or in doubles per team: what is left and the darts thrown
        const left = Object.fromEntries((game.players ?? []).map(id => [keyOf[id], startingScoreOf(game, id)]));
        const darts = Object.fromEntries((game.players ?? []).map(id => [keyOf[id], 0]));
        leg.forEach((visit, visitIndex) => {
            const id = visit?.playerId;
            const key = keyOf[id];
            if (!(key in left)) return;
            visitCount += 1;
            const where = `in leg ${legIndex + 1}`;
            const place = { set, leg: legNumber, visit: visitIndex };
            found.push(...visitProblems(visit, id, where, place));
            const thrown = thrownDarts(visit.darts);
            darts[key] += thrown.length;
            const sum = thrown.filter(isDart).reduce((total, dart) => total + dartValue(dart), 0);
            if (Number.isFinite(visit.roundScore) && visit.roundScore !== sum) {
                found.push(finding('impossible', 'scoreMismatch', 'The score does not match the darts', `${visit.roundScore} entered for ${thrown.join(' ')} (${sum}) ${where}`, id, place));
            }
            const scoreLeft = Number(visit.scoreLeft);
            const bust = scoreLeft === left[key];
            if (!bust && Number.isFinite(scoreLeft) && left[key] - sum !== scoreLeft) {
                // no cheat: nobody gains from it, and an undo of the app wrote such rests
                found.push(finding('error', 'leftMismatch', 'A score left that does not add up', `${left[key]} − ${sum} leaves ${left[key] - sum}, ${scoreLeft} was saved ${where}`, id, place));
            }
            if (scoreLeft === 0) {
                const last = String(thrown.at(-1) ?? '').toUpperCase();
                const mode = outModeOf(game, id);
                const allowed = mode === 'Double Out' ? /^D/.test(last) : mode === 'Master Out' ? /^[DT]/.test(last) : true;
                if (!allowed) found.push(finding('impossible', 'wrongFinish', `Checked out without a ${mode === 'Master Out' ? 'double or treble' : 'double'}`, `${last || 'no dart'} ${where} with ${mode}`, id, place));
                const start = startingScoreOf(game, id);
                const fewest = Math.ceil(start / 60);
                if (darts[key] < fewest) {
                    found.push(finding('impossible', 'tooFewDarts', 'A leg won with too few darts', `${start} checked out with ${darts[key]} darts ${where}: at least ${fewest} are needed`, id, place));
                } else if (start === 501 && darts[key] <= 9) {
                    found.push(finding('suspicious', 'nineDarter', 'A nine-darter', `the perfect leg ${where}: worth a look`, id, place));
                }
            }
            if (Number.isFinite(scoreLeft)) left[key] = scoreLeft;
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

export const checkCricket = (stored) => {
    const game = withView('cricket', stored);
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

export const checkElimination = (stored) => {
    const game = withView('elimination', stored);
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

export const checkClock = (stored) => {
    const game = withView('clock', stored);
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
export const repairX01 = (stored) => {
    const game = withView('x01', stored);
    const allSetsThrows = structuredClone(game.allSetsThrows ?? {});
    let changed = 0;
    const keyOf = scoreKeysOf(game);
    for (const { setKey, legKey, set, leg, visits } of legEntries({ allSetsThrows })) {
        const left = Object.fromEntries((game.players ?? []).map(id => [keyOf[id], startingScoreOf(game, id)]));
        for (const [index, visit] of visits.entries()) {
            const id = visit?.playerId;
            const key = keyOf[id];
            if (!(key in left)) continue;
            const thrown = thrownDarts(visit.darts);
            if (!thrown.every(isDart)) return { possible: false, reason: `A dart that is not on the board in set ${set}, leg ${leg}` };
            const rest = left[key] - thrown.reduce((total, dart) => total + dartValue(dart), 0);
            const scoreLeft = isBust(rest, thrown.at(-1), outModeOf(game, id)) ? left[key] : rest;
            const last = index === visits.length - 1;
            if (scoreLeft === 0 && !last) return { possible: false, reason: `Set ${set}, leg ${leg} would have ended earlier` };
            if (last && scoreLeft !== 0) return { possible: false, reason: `The darts do not finish set ${set}, leg ${leg}` };
            if (Number(visit.scoreLeft) !== scoreLeft) {
                allSetsThrows[setKey][legKey][index] = { ...visit, scoreLeft };
                changed += 1;
            }
            left[key] = scoreLeft;
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
export const x01Legs = (stored) => {
    const game = withView('x01', stored);
    const repair = repairX01(game);
    const keyOf = scoreKeysOf(game);
    return legEntries(game).map(({ setKey, legKey, set, leg, visits }) => {
        const left = Object.fromEntries((game.players ?? []).map(id => [keyOf[id], startingScoreOf(game, id)]));
        return {
            set,
            leg,
            visits: visits.map((visit, index) => {
                const id = visit?.playerId;
                const thrown = thrownDarts(visit?.darts);
                const before = left[keyOf[id]];
                const rest = before - thrown.filter(isDart).reduce((total, dart) => total + dartValue(dart), 0);
                const expected = Number.isFinite(before) ? (isBust(rest, thrown.at(-1), outModeOf(game, id)) ? before : rest) : null;
                const scoreLeft = Number(visit?.scoreLeft);
                if (Number.isFinite(scoreLeft) && keyOf[id] in left) left[keyOf[id]] = scoreLeft;
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

const DAY_MS = 24 * 60 * 60 * 1000;
const dateText = (value) => {
    const date = new Date(value);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
};
const addYears = (value, years) => {
    const date = new Date(value);
    date.setFullYear(date.getFullYear() + years);
    return date;
};

/**
 * A player moved their own date of birth: later by more than a month makes
 * them younger, and games they played as adults may then count as played as
 * a child (left out of the Hall of Shame). minAge: the club's age limit;
 * gameDates: when the player played in the club. Suspicious, with how many
 * games changed sides.
 */
export const checkBirthChange = (change, { minAge = 16, gameDates = [] } = {}) => {
    if (!change?.from || !change?.to) return [];
    const from = new Date(change.from);
    const to = new Date(change.to);
    if (to - from <= THRESHOLDS.birthLaterDays * DAY_MS) return [];
    // played from the old birthday of minAge on, but before the new one
    const start = addYears(from, minAge);
    const end = addYears(to, minAge);
    const moved = gameDates.filter(value => new Date(value) >= start && new Date(value) < end).length;
    const years = Math.round((to - from) / (365.25 * DAY_MS) * 10) / 10;
    const effect = moved
        ? `${moved} ${moved === 1 ? 'game' : 'games'} now count as played under ${minAge}`
        : `no games played under ${minAge} because of it so far`;
    return [finding('suspicious', 'birthLater', 'Made themselves younger', `date of birth moved from ${dateText(from)} to ${dateText(to)} (${years} ${years === 1 ? 'year' : 'years'} younger) by the player: ${effect}`)];
};

// a training's dart: a field of the board, or H and M for a hit or a miss
const TRAINING_DART = /^(?:[SDT](?:[1-9]|1\d|20)|[SD]25|0|H|M)$/;

/**
 * A game of Shanghai, Killer, Halve-It, Golf or Tactics: darts that cannot be
 * thrown, a stored result that is not what its darts give (impossible), and
 * far out of the ordinary (suspicious): played very fast, an opponent who
 * only missed, or the play of a professional.
 */
export const checkRulesGame = (stored) => {
    const found = [];
    const definition = gameOf(stored.kind);
    if (!definition) return found;
    const visits = stored.visits ?? [];
    visits.forEach((visit, index) => {
        const darts = (visit.darts ?? []).filter(dart => dart !== '' && dart != null);
        if (darts.length > 3) found.push(finding('impossible', 'tooManyDarts', 'More than three darts in a visit', `${darts.length} darts in visit ${index + 1}`, visit.player, { visit: index + 1 }));
        const wrong = darts.filter(dart => !isDart(dart));
        if (wrong.length) found.push(finding('impossible', 'invalidDart', 'A dart that is not on the board', `${wrong.join(', ')} in visit ${index + 1}`, visit.player, { visit: index + 1 }));
    });
    if (found.length) return found;

    let replayed;
    let worked;
    try {
        replayed = replayGame(definition, stored);
        worked = withGameState(definition, stored);
    } catch {
        return [finding('error', 'unreadable', 'The darts cannot be played through', 'The game\'s darts do not fit its rules')];
    }
    // the stored result against what the darts give
    for (const id of stored.players ?? []) {
        const saved = stored.playerModels?.[id] ?? {};
        const real = worked.playerModels?.[id] ?? {};
        if (Boolean(saved.hasWonGame) !== Boolean(real.hasWonGame) || (saved.score != null && Number(saved.score) !== Number(real.score))) {
            found.push(finding('impossible', 'resultMismatch', 'The result is not what the darts give', `Stored ${saved.hasWonGame ? 'a win' : 'no win'} with ${saved.score ?? '–'}, the darts give ${real.hasWonGame ? 'a win' : 'no win'} with ${real.score ?? '–'}`, id));
        }
    }

    found.push(...tooFast(stored, visits.length));
    // an opponent whose visits (nearly) all missed
    const winner = winnerOf(stored);
    if ((stored.players ?? []).length > 1 && winner) {
        found.push(...padding(stored, (id) => visits.filter(visit => visit.player === id), (visit) => (visit.darts ?? []).some(dart => String(dart).trim() !== '0' && String(dart).trim() !== ''), winner));
    }

    // the play of a professional
    for (const id of stored.players ?? []) {
        const player = replayed.state.players?.[id];
        if (!player || !replayed.over) continue;
        if (stored.kind === 'shanghai' && player.darts >= 15 && player.hits / player.darts > THRESHOLDS.shanghaiHitRate) {
            found.push(finding('suspicious', 'proPlay', 'The play of a professional', `${Math.round(player.hits / player.darts * 100)} % of the darts on the number of the round`, id));
        }
        if (stored.kind === 'golf' && player.holes.length >= 9 && player.strokes / player.holes.length <= THRESHOLDS.golfStrokesPerHole) {
            found.push(finding('suspicious', 'proPlay', 'The play of a professional', `${(player.strokes / player.holes.length).toFixed(2)} strokes per hole over ${player.holes.length} holes`, id));
        }
        if (stored.kind === 'tactics' && player.darts >= 15 && player.totalMarks / player.darts * 3 >= THRESHOLDS.tacticsHighMarks) {
            found.push(finding('suspicious', 'proPlay', 'The play of a professional', `${(player.totalMarks / player.darts * 3).toFixed(1)} marks per round`, id));
        }
        if (stored.kind === 'halveit' && player.halved === 0 && player.points >= THRESHOLDS.halveItHighPoints) {
            found.push(finding('suspicious', 'proPlay', 'The play of a professional', `${player.points} points without being halved once`, id));
        }
        if (stored.kind === 'killer' && id === winner) {
            // the fewest darts a win can take: one to become a killer, one per life of every opponent
            const fewest = 1 + (replayed.settings.lives ?? 3) * ((stored.players ?? []).length - 1);
            if (player.darts <= Math.ceil(fewest / 3) * 3) {
                found.push(finding('suspicious', 'proPlay', 'A perfect game', `Won with ${player.darts} darts; it cannot take fewer than ${fewest}`, id));
            }
        }
    }
    return found;
};

/**
 * A training of the rules engine (Bob's 27, 121 Checkout, …): darts that
 * cannot be thrown or a score that is not what its darts give (impossible),
 * darts entered faster than they can be thrown, a score far out of reach for
 * a club player or a sudden jump over the player's best (suspicious).
 * history: the player's earlier trainings of the same kind.
 */
export const checkRulesTraining = (entry, history = []) => {
    const found = [];
    const playerId = entry.player?.id ?? null;
    const definition = trainingOf(entry.kind);
    if (!definition) return found;
    const darts = (entry.darts ?? []).map(String);
    const wrong = darts.filter(dart => !TRAINING_DART.test(dart.trim().toUpperCase()));
    if (wrong.length) return [finding('impossible', 'invalidDart', 'A dart that is not on the board', wrong.slice(0, 5).join(', '), playerId)];

    const replayed = replayTraining(definition, { settings: entry.settings ?? {}, darts });
    if (!replayed.done || Number(replayed.result?.score) !== Number(entry.score)) {
        found.push(finding('impossible', 'scoreMismatch', 'The score is not what the darts give', `Stored ${entry.score}, the darts give ${replayed.done ? replayed.result.score : 'an unfinished training'}`, playerId));
    }

    // the darts entered faster than they can be thrown
    const seconds = entry.startedAt ? (new Date(entry.createdAt) - new Date(entry.startedAt)) / 1000 : NaN;
    if (Number.isFinite(seconds) && darts.length >= THRESHOLDS.trainingFastDarts) {
        const perDart = seconds / darts.length;
        if (perDart < THRESHOLDS.trainingImpossibleSecondsPerDart) {
            found.push(finding('impossible', 'tooFast', 'Faster than darts can be thrown', `${darts.length} darts in ${Math.round(seconds)} s`, playerId));
        } else if (perDart < THRESHOLDS.trainingFastSecondsPerDart) {
            found.push(finding('suspicious', 'tooFast', 'Played very fast', `${darts.length} darts in ${Math.round(seconds)} s: typed in afterwards?`, playerId));
        }
    }

    // far out of reach for a club player
    const score = Number(entry.score);
    const out = {
        bobs27: score > THRESHOLDS.bobs27High && `${score} points in Bob's 27`,
        randomcheckouts: score >= THRESHOLDS.randomCheckoutsPerfect && (Number(entry.result?.attempts ?? entry.settings?.attempts) || 0) >= THRESHOLDS.randomCheckoutsAttempts && `Every one of ${entry.result?.attempts ?? entry.settings?.attempts} random finishes checked out`,
        scoring: score > THRESHOLDS.scoringHighAverage && `A training average of ${score}`,
        doublesaround: score > 0 && score < THRESHOLDS.doublesAroundFewDarts && `Every double and the bull with ${score} darts`,
        catch40: score > THRESHOLDS.catch40High && `${score} of 120 points in Catch 40`,
        checkout121: score >= THRESHOLDS.checkout121High && `Checked out up to ${score} in 121 Checkout`,
    }[entry.kind];
    if (out) found.push(finding('suspicious', 'proPlay', 'The play of a professional', out, playerId));

    // a personal best far better than the one before
    const higher = definition.higherIsBetter !== false;
    const earlier = history.map(item => Number(item.score)).filter(value => Number.isFinite(value) && value > 0);
    if (Number.isFinite(score) && score > 0 && earlier.length >= THRESHOLDS.personalBestHistory) {
        const best = higher ? Math.max(...earlier) : Math.min(...earlier);
        const jump = higher ? score > best * (1 + THRESHOLDS.personalBestJump) : score < best * (1 - THRESHOLDS.personalBestJump);
        if (jump) found.push(finding('suspicious', 'bestJump', 'A sudden jump', `${score} against a best of ${best} in ${earlier.length} trainings before`, playerId));
    }
    return found;
};

/**
 * What only shows over many games of a club, as findings per game:
 * { key: 'type|id' → findings }. The games: [{ type, id, at, players, winners,
 * friendly, darts }] (darts of all players, or null); owners: playerId → the
 * account that plays them; guests: the ids of guests; requests: the deletion
 * requests [{ gameId, gameType, playerId, lost, at }].
 * - own players: two players of the same account in one game
 * - rating farming: the same win within a day again and again against someone
 *   who hardly plays otherwise (or a guest)
 * - tiny games: many very short games within an hour
 * - deleting losses: a player asking to delete games, mostly ones they lost
 */
export const patternFindings = ({ games = [], owners = new Map(), guests = new Set(), requests = [] }) => {
    const out = new Map();
    const add = (game, item) => {
        const key = `${game.type}|${game.id}`;
        out.set(key, [...(out.get(key) ?? []), item]);
    };
    const ordered = [...games].sort((a, b) => new Date(a.at) - new Date(b.at));

    for (const game of ordered) {
        const byAccount = new Map();
        for (const id of game.players) {
            const owner = owners.get(id);
            if (owner) byAccount.set(owner, [...(byAccount.get(owner) ?? []), id]);
        }
        for (const ids of byAccount.values()) {
            if (ids.length > 1) add(game, finding('suspicious', 'ownPlayers', 'Players of the same account against each other', `${ids.length} players of one login in this game: wins, badges and the rating padded?`, ids[0]));
        }
    }

    // rating farming: per winner and loser of two-player games
    const gamesOf = new Map();
    for (const game of ordered) for (const id of game.players) gamesOf.set(id, (gamesOf.get(id) ?? 0) + 1);
    const pairs = new Map();
    for (const game of ordered) {
        if (game.friendly || game.players.length !== 2 || game.winners.length !== 1) continue;
        const winner = game.winners[0];
        const loser = game.players.find(id => id !== winner);
        const key = `${winner}|${loser}`;
        pairs.set(key, [...(pairs.get(key) ?? []), game]);
    }
    const day = THRESHOLDS.farmingHours * 60 * 60 * 1000;
    for (const [key, list] of pairs) {
        const [winner, loser] = key.split('|');
        let start = 0;
        let flagged = null;
        for (let end = 0; end < list.length; end += 1) {
            while (new Date(list[end].at) - new Date(list[start].at) > day) start += 1;
            const count = end - start + 1;
            const rarely = guests.has(loser) || (gamesOf.get(loser) ?? 0) <= count * THRESHOLDS.farmingRarelyFactor;
            if (count >= THRESHOLDS.farmingWins && rarely) flagged = { game: list[end], count };
        }
        if (flagged) add(flagged.game, finding('suspicious', 'ratingFarming', 'The same win again and again', `${flagged.count} wins within ${THRESHOLDS.farmingHours} hours against ${guests.has(loser) ? 'a guest' : 'a player who hardly plays otherwise'}: the rating and badges padded?`, winner));
    }

    // many tiny games within an hour
    const tiny = ordered.filter(game => game.darts != null && game.darts <= THRESHOLDS.tinyGameDarts);
    const window = THRESHOLDS.tinyMinutes * 60 * 1000;
    let begin = 0;
    let lastFlagged = -1;
    for (let end = 0; end < tiny.length; end += 1) {
        while (new Date(tiny[end].at) - new Date(tiny[begin].at) > window) begin += 1;
        const count = end - begin + 1;
        if (count >= THRESHOLDS.tinyGames && begin > lastFlagged) {
            add(tiny[end], finding('suspicious', 'tinyBurst', 'Many tiny games in a short time', `${count} games of at most ${THRESHOLDS.tinyGameDarts} darts within ${THRESHOLDS.tinyMinutes} minutes: club badges and goals padded?`, tiny[end].players[0]));
            lastFlagged = end;
        }
    }

    // deleting losses
    const byPlayer = new Map();
    for (const request of requests) byPlayer.set(request.playerId, [...(byPlayer.get(request.playerId) ?? []), request]);
    for (const [playerId, list] of byPlayer) {
        if (list.length < THRESHOLDS.deletionRequests) continue;
        const lost = list.filter(request => request.lost).length;
        if (lost / list.length < THRESHOLDS.deletionLostShare) continue;
        const latest = [...list].sort((a, b) => new Date(b.at) - new Date(a.at))[0];
        const game = games.find(entry => entry.id === latest.gameId);
        if (game) add(game, finding('suspicious', 'deletesLosses', 'Asks to delete the games they lose', `${lost} of ${list.length} deletion requests for games the player lost`, playerId));
    }
    return out;
};

/**
 * The check of each kind of game and training, by its type on the fair play page.
 */
export const INTEGRITY_CHECKS = {
    x01: (doc) => checkX01(doc),
    cricket: checkCricket,
    elimination: checkElimination,
    clock: checkClock,
    rules: checkRulesGame,
    training: (doc) => checkTraining({ ...doc, scoring: doc.scoring ?? 'Time' }),
    rulesTraining: (doc) => checkRulesTraining(doc),
    x01training: (doc) => checkX01(doc),
};

// true when a game or training has data that cannot be real
export const isImpossible = (type, doc) => {
    try {
        return (INTEGRITY_CHECKS[type]?.(doc) ?? []).some(item => item.level === 'impossible');
    } catch {
        return false;
    }
};
