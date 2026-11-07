/**
 * The newer games, each as one definition of the rules engine (see engine.js):
 * Shanghai, Killer, Halve-It, Golf, Tactics, Baseball and Scram.
 */
import { isBull, isDouble, isTreble } from './darts.js';
import { t, tn } from '../utils/i18n.js';
import { HALVE_IT_CLASSIC, HALVE_IT_SHORT } from './club.rules.js';

const sum = (values) => values.reduce((total, value) => total + value, 0);
const playersOf = (ids, make) => Object.fromEntries(ids.map(id => [id, make(id)]));
const roundsLeft = (round, rounds) => Math.max(0, rounds - round + 1);
// fewer darts than this say too little about the level a game was played at (see levels.play.js)
const LEVEL_DARTS = 9;
const levelPercent = (value) => `${Math.round(value)} %`;
// marks per round as in Cricket (fixed with the developer): about an eighth of the points per dart
const MARKS_BANDS = [2, 3, 4];

/**
 * Shanghai: round 1 on the 1s, round 2 on the 2s, and so on. Only the number
 * of the round scores (single, double, treble); a single, double and treble
 * of it in one visit is a Shanghai and wins at once. After the last round
 * the most points win.
 */
export const SHANGHAI = {
    id: 'shanghai',
    title: t('Shanghai'),
    description: t('Round by round from 1 upwards: only the number of the round scores, and a single, double and treble of it in one visit wins at once.'),
    rules: [
        t('Round 1 is played on the 1, round 2 on the 2, and so on: every player throws three darts at the number of the round.'),
        t('Only that number scores: a single its value, a double twice and a treble three times its value.'),
        t('A single, a double and a treble of the number in one visit is a Shanghai: the game is won at once.'),
        t('After the last round the most points win.'),
    ],
    minPlayers: 1,
    maxPlayers: 8,
    options: [{ key: 'rounds', label: t('Rounds'), values: [{ value: 7, label: t('7 rounds (1 to 7)') }, { value: 20, label: t('20 rounds (1 to 20)') }], default: 7 }],
    init: (settings, ids) => ({ players: playersOf(ids, () => ({ points: 0, shanghai: false, hits: 0, darts: 0, last: null })), shanghaiBy: null }),
    visit: (state, id, darts, { round, settings }) => {
        const player = state.players[id];
        const onTarget = darts.filter(dart => dart.number === round);
        player.points += sum(onTarget.map(dart => dart.points));
        player.last = sum(onTarget.map(dart => dart.points));
        player.hits += onTarget.length;
        player.darts += darts.length;
        const rings = new Set(onTarget.map(dart => dart.ring));
        if (rings.has('S') && rings.has('D') && rings.has('T')) {
            player.shanghai = true;
            // a house rule may let a Shanghai only score
            if (settings?.instantWin !== false) {
                player.shanghaiWin = true;
                state.shanghaiBy = state.shanghaiBy ?? id;
            }
        }
        return state;
    },
    over: (state, { settings, round, roundComplete }) => Boolean(state.shanghaiBy) || (roundComplete && round > settings.rounds),
    // a Shanghai beats any score
    score: (player) => (player.shanghaiWin ? 100000 : 0) + player.points,
    progress: { label: t('Points'), value: (player) => player.points },
    hero: (player) => ({
        score: player.points,
        note: player.shanghai ? t('Shanghai!') : tn(player.hits, '{{count}} hit', '{{count}} hits'),
        line: [[t('Last visit'), player.last ?? '–'], [t('Hit rate'), player.darts ? `${Math.round(player.hits / player.darts * 100)} %` : '–']],
    }),
    moment: (before, after) => (after.shanghai && !before.shanghai ? { words: t('Shanghai!'), number: 'S·D·T', sign: t('Shanghai') } : null),
    // the same for everyone in a round: shown as the stage of the game in its header
    roundStage: true,
    target: (state, id, { round, settings }) => t('Aim at the {{number}} · {{left}}', { number: round, left: tn(roundsLeft(round, settings.rounds), '{{count}} round left', '{{count}} rounds left') }),
    columns: [
        { key: 'points', label: t('Points'), value: (player) => player.points },
        { key: 'hits', label: t('Hits'), value: (player) => player.hits },
    ],
    figures: (player) => [
        [t('Points'), player.points],
        [t('Hit rate'), player.darts ? `${Math.round(player.hits / player.darts * 100)} %` : '–'],
        [t('Shanghai'), player.shanghai ? t('Yes') : t('No')],
    ],
    // the points against what marks per round as in Cricket score on the numbers played: round r
    // is worth r a mark, so 2, 3 and 4 marks a round on 1 to 7 are 56, 84 and 112 points
    level: {
        by: t('the points'),
        of: (player) => (player.darts >= LEVEL_DARTS ? player.points : null),
        bands: (player) => {
            const rounds = Math.ceil(player.darts / 3);
            return MARKS_BANDS.map(marks => marks * rounds * (rounds + 1) / 2);
        },
    },
    preview: (state, id, darts, { round, settings }) => {
        const points = sum(darts.filter(dart => dart.number === round).map(dart => dart.points));
        const rings = new Set(darts.filter(dart => dart.number === round).map(dart => dart.ring));
        if (!(rings.has('S') && rings.has('D') && rings.has('T'))) return t('{{points}} points this visit', { points });
        return settings?.instantWin === false ? t('Shanghai! {{points}} points this visit', { points }) : t('Shanghai! The game is won.');
    },
};

/**
 * Killer: every player has a number. Hitting its double makes a player a
 * killer; a killer takes a life with each double of an opponent's number (a
 * killer hitting their own double loses one). The last one with lives wins.
 */
export const KILLER = {
    id: 'killer',
    title: t('Killer'),
    description: t('Everyone has a number: hit its double to become a killer, then take the others\' lives on their doubles. The last one standing wins.'),
    rules: [
        t('Every player gets a number of their own, shown next to their name.'),
        t('Hit the double of your number to become a killer.'),
        t('A killer takes a life from a player with each dart in the double of that player\'s number. A killer who hits their own double loses a life.'),
        t('A player without lives is out; the last one with lives wins.'),
    ],
    minPlayers: 2,
    maxPlayers: 8,
    options: [{ key: 'lives', label: t('Lives'), values: [{ value: 3, label: t('3 lives') }, { value: 5, label: t('5 lives') }], default: 3 }],
    // the numbers are drawn when the game starts, different for everyone
    prepare: (settings, ids) => {
        const numbers = Array.from({ length: 20 }, (_, index) => index + 1).sort(() => Math.random() - 0.5);
        return { ...settings, numbers: Object.fromEntries(ids.map((id, index) => [id, numbers[index]])) };
    },
    init: (settings, ids) => ({
        players: playersOf(ids, id => ({ number: settings.numbers?.[id] ?? ids.indexOf(id) + 1, lives: settings.lives, killer: false, kills: 0, outAt: null, darts: 0, ownLost: 0, bestVisit: 0, onTarget: 0 })),
        visits: 0,
    }),
    visit: (state, id, darts, { settings } = {}) => {
        state.visits += 1;
        const player = state.players[id];
        player.darts += darts.length;
        // house rules: any hit on the number may make a killer, and a killer's own double may be safe
        const anyHit = settings?.become === 'any';
        const ownSafe = settings?.ownDouble === 'safe';
        // for the badges: the lives taken in this visit, and those lost on the own double
        const killsBefore = player.kills;
        for (const dart of darts) {
            if (player.lives <= 0) continue;
            if (!player.killer && anyHit && dart.number === player.number) {
                player.killer = true;
                player.onTarget += 1;
                continue;
            }
            if (!isDouble(dart)) continue;
            if (dart.number === player.number) {
                if (!player.killer) {
                    player.killer = true;
                    player.onTarget += 1;
                } else if (!ownSafe) {
                    player.lives -= 1;
                    player.ownLost = (player.ownLost ?? 0) + 1;
                }
                continue;
            }
            if (!player.killer) continue;
            const victim = Object.values(state.players).find(other => other.number === dart.number && other.lives > 0);
            if (victim) {
                victim.lives -= 1;
                player.kills += 1;
                player.onTarget += 1;
            }
        }
        player.bestVisit = Math.max(player.bestVisit ?? 0, player.kills - killsBefore);
        Object.values(state.players).forEach(other => {
            if (other.lives <= 0 && other.outAt === null) other.outAt = state.visits;
        });
        return state;
    },
    active: (state, id) => state.players[id].lives > 0,
    over: (state) => Object.values(state.players).filter(player => player.lives > 0).length <= 1,
    // the last one standing first, then the one out last
    score: (player) => player.lives > 0 ? 100000 + player.lives : player.outAt ?? 0,
    progress: { label: t('Lives'), value: (player) => Math.max(0, player.lives) },
    hero: (player) => ({
        score: player.lives > 0 ? '♥'.repeat(player.lives) : t('Out'),
        note: t('Number {{number}}', { number: player.number }),
        line: [[t('Lives taken'), player.kills], [t('Darts'), player.darts]],
        tags: [player.killer && player.lives > 0 ? t('Killer') : null].filter(Boolean),
    }),
    moment: (before, after) => (after.killer && !before.killer ? { words: t('Killer!'), number: String(after.number), sign: t('Killer') }
        : after.kills - before.kills >= 2 ? { words: t('{{count}} lives taken!', { count: after.kills - before.kills }), number: String(after.kills - before.kills), sign: t('Killer') } : null),
    target: (state, id, { settings } = {}) => state.players[id].killer
        ? t('Killer: hit the doubles of the others')
        : settings?.become === 'any'
            ? t('Hit the {{number}} to become a killer', { number: state.players[id].number })
            : t('Hit double {{number}} to become a killer', { number: state.players[id].number }),
    columns: [
        { key: 'number', label: t('Number'), value: (player) => player.number },
        { key: 'lives', label: t('Lives'), value: (player) => player.lives > 0 ? '♥'.repeat(player.lives) : t('Out') },
        { key: 'killer', label: t('Killer'), value: (player) => player.killer ? '✔' : '' },
    ],
    figures: (player) => [
        [t('Number'), player.number],
        [t('Lives left'), Math.max(0, player.lives)],
        [t('Lives taken'), player.kills],
    ],
    // the throwing, not the result: the share of darts in the double that counted (one's own to
    // become a killer, then the others'), as the hit rate on doubles of Doubles around the board
    level: {
        by: t('the hit rate on the doubles'),
        of: (player) => (player.darts >= LEVEL_DARTS && player.onTarget != null ? player.onTarget / player.darts * 100 : null),
        bands: [10, 25, 40],
        format: levelPercent,
    },
    preview: (state, id, darts, { settings } = {}) => {
        const player = state.players[id];
        const becomes = (dart) => dart.number === player.number && (isDouble(dart) || settings?.become === 'any');
        const taken = player.killer || darts.some(becomes)
            ? darts.filter(dart => isDouble(dart) && dart.number !== player.number && Object.values(state.players).some(other => other.number === dart.number && other.lives > 0)).length
            : 0;
        return taken ? tn(taken, '{{count}} life taken', '{{count}} lives taken') : t('Nobody hit yet');
    },
};

// Halve-It: a target of a round, from its key (a number, 'double', 'treble', '41' or 'bull')
const onNumber = (number) => (darts) => sum(darts.filter(dart => dart.number === number).map(dart => dart.points));
const HALVE_IT_SPECIAL = {
    double: { label: t('Any double'), points: (darts) => sum(darts.filter(isDouble).map(dart => dart.points)) },
    treble: { label: t('Any treble'), points: (darts) => sum(darts.filter(isTreble).map(dart => dart.points)) },
    41: { label: t('Exactly 41'), points: (darts) => sum(darts.map(dart => dart.points)) === 41 ? 41 : 0 },
    bull: { label: t('Bull'), points: (darts) => sum(darts.filter(isBull).map(dart => dart.points)) },
};
export const halveItTarget = (key) => ({ key, ...(HALVE_IT_SPECIAL[key] ?? { label: String(key), points: onNumber(Number(key)) }) });
// the targets of the rounds, in order: the classic ones, unless the setup chose others (a club's own: targetList)
const halveItTargetsOf = (settings) => (settings?.targetList?.length ? settings.targetList
    : settings?.targets === 'short' ? HALVE_IT_SHORT : HALVE_IT_CLASSIC).map(halveItTarget);
const HALVE_IT_TARGETS = HALVE_IT_CLASSIC.map(halveItTarget);
const HALVE_IT_START = 40;

/**
 * Halve-It: nine rounds, each with its target (20, 16, any double, 17, any
 * treble, 18, exactly 41, 19, bull). A visit without a hit halves the score.
 * The most points win.
 */
export const HALVE_IT = {
    id: 'halveit',
    title: t('Halve-It'),
    description: t('Nine rounds with a target each: hit it to score, miss it with all three darts and your score is halved.'),
    rules: [
        t('Everyone starts with 40 points and plays nine rounds: 20, 16, any double, 17, any treble, 18, exactly 41 with the three darts, 19 and the bull.'),
        t('Darts in the target of the round add their points.'),
        t('A visit without a hit on the target halves the score, rounded down.'),
        t('After the last round the most points win.'),
    ],
    minPlayers: 1,
    maxPlayers: 8,
    options: [],
    init: (settings, ids) => ({ players: playersOf(ids, () => ({ points: HALVE_IT_START, halved: 0, best: 0, rounds: [], darts: 0 })) }),
    visit: (state, id, darts, { round, settings }) => {
        const player = state.players[id];
        const target = halveItTargetsOf(settings)[round - 1];
        const points = target ? target.points(darts) : 0;
        player.darts += darts.length;
        if (points > 0) {
            player.points += points;
            player.best = Math.max(player.best, points);
        } else {
            player.points = Math.floor(player.points / 2);
            player.halved += 1;
        }
        player.rounds.push(points);
        return state;
    },
    over: (state, { round, roundComplete, settings }) => roundComplete && round > halveItTargetsOf(settings).length,
    score: (player) => player.points,
    progress: { label: t('Points'), value: (player) => player.points },
    hero: (player) => ({
        score: player.points,
        note: player.halved ? tn(player.halved, 'Halved {{count}} time', 'Halved {{count}} times') : t('Never halved'),
        line: [[t('Last round'), player.rounds.length ? (player.rounds.at(-1) || t('halved')) : '–'], [t('Best round'), player.best || '–']],
    }),
    moment: (before, after) => {
        const last = after.rounds.at(-1);
        return last >= 100 ? { words: t('{{points}} in one round!', { points: last }), number: String(last), sign: t('Halve-It') } : null;
    },
    // the same for everyone in a round: shown as the stage of the game in its header
    roundStage: true,
    target: (state, id, { round, settings }) => {
        const targets = halveItTargetsOf(settings);
        return t('Round {{round}} of {{rounds}}: {{target}}', { round, rounds: targets.length, target: targets[round - 1]?.label ?? '' });
    },
    columns: [
        { key: 'points', label: t('Points'), value: (player) => player.points },
        { key: 'halved', label: t('Halved'), value: (player) => player.halved },
    ],
    figures: (player) => [
        [t('Points'), player.points],
        [t('Halved'), player.halved],
        [t('Best round'), player.best],
    ],
    // the points after every round, from a simple model of the darts (50, 75 and 95 averages with
    // their treble, double and bull rates): the classic nine rounds give about 70, 200 and 330, the
    // short six about 75, 200 and 350. A club's own targets have no level, nor a game not played to the end.
    level: {
        by: t('the points'),
        of: (player, state, settings) => (!settings?.targetList?.length && player.rounds.length >= halveItTargetsOf(settings).length ? player.points : null),
        bands: (player, state, settings) => (settings?.targets === 'short' ? [75, 200, 350] : [70, 200, 330]),
    },
    preview: (state, id, darts, { round, settings }) => {
        const target = halveItTargetsOf(settings)[round - 1];
        const points = target ? target.points(darts) : 0;
        return points > 0 ? t('{{points}} points this visit', { points }) : t('No hit yet: the score would be halved');
    },
};

// Golf: what the last dart at the hole counts, in strokes
const strokesOf = (darts, hole) => {
    const last = darts[darts.length - 1];
    if (!last || last.number !== hole) return 5;
    return { D: 1, T: 2, S: 3 }[last.ring] ?? 5;
};

/**
 * Golf: hole 1 on the 1, hole 2 on the 2, … Up to three darts a hole; the
 * last dart thrown counts: a double 1 stroke, a treble 2, a single 3, a miss
 * 5. The fewest strokes win.
 */
export const GOLF = {
    id: 'golf',
    title: t('Golf'),
    description: t('Nine or eighteen holes, one number each: the last dart counts as strokes, the fewest strokes win.'),
    rules: [
        t('Hole 1 is played on the 1, hole 2 on the 2, and so on.'),
        t('Throw up to three darts at the hole and stop when you like: only the last dart counts.'),
        t('A double is 1 stroke, a treble 2, a single 3; a miss of the number is 5.'),
        t('After the last hole the fewest strokes win.'),
    ],
    minPlayers: 1,
    maxPlayers: 8,
    options: [{ key: 'holes', label: t('Holes'), values: [{ value: 9, label: t('9 holes') }, { value: 18, label: t('18 holes') }], default: 9 }],
    higherIsBetter: false,
    stopAnyTime: true,
    progress: { label: t('Strokes'), value: (player) => player.strokes },
    hero: (player) => {
        const toPar = player.strokes - 3 * player.holes.length;
        return {
            score: player.strokes,
            note: player.holes.length ? t('{{toPar}} to par', { toPar: toPar > 0 ? `+${toPar}` : toPar === 0 ? '±0' : toPar }) : t('Par 3 a hole'),
            line: [[t('Last hole'), player.holes.at(-1) ?? '–'], [t('Holes in one stroke'), player.holes.filter(strokes => strokes === 1).length]],
        };
    },
    moment: (before, after) => (after.holes.length > before.holes.length && after.holes.at(-1) === 1 ? { words: t('Hole in one!'), number: '1', sign: t('Golf') } : null),
    init: (settings, ids) => ({ players: playersOf(ids, () => ({ strokes: 0, holes: [], darts: 0 })) }),
    visit: (state, id, darts, { round }) => {
        const player = state.players[id];
        const strokes = strokesOf(darts, round);
        player.strokes += strokes;
        player.holes.push(strokes);
        player.darts += darts.length;
        return state;
    },
    over: (state, { settings, round, roundComplete }) => roundComplete && round > settings.holes,
    score: (player) => player.strokes,
    // the same for everyone in a round: shown as the stage of the game in its header
    roundStage: true,
    target: (state, id, { round, settings }) => t('Hole {{hole}} of {{holes}}: the {{hole}}', { hole: round, holes: settings.holes }),
    columns: [
        { key: 'strokes', label: t('Strokes'), value: (player) => player.strokes },
        { key: 'birdies', label: t('Doubles'), value: (player) => player.holes.filter(strokes => strokes === 1).length },
    ],
    figures: (player) => [
        [t('Strokes'), player.strokes],
        [t('Holes in one stroke'), player.holes.filter(strokes => strokes === 1).length],
        [t('Strokes per hole'), player.holes.length ? (player.strokes / player.holes.length).toFixed(1) : '–'],
    ],
    // strokes per hole (the holes played, so 9 or 18 alike), from a simple model of darts at the
    // double: about 2.8 for a 50 average, 2.2 for 75 and 1.6 for 95; par is 3
    level: {
        by: t('the strokes per hole'),
        of: (player) => (player.holes.length >= 3 ? player.strokes / player.holes.length : null),
        bands: [2.8, 2.2, 1.6],
        lowerIsBetter: true,
        format: (value) => Number(value).toFixed(1),
    },
    preview: (state, id, darts, { round }) => darts.length ? tn(strokesOf(darts, round), 'This hole: {{count}} stroke', 'This hole: {{count}} strokes') : t('Throw at the {{number}}', { number: round }),
};

// Tactics: 10 to 20 and the bull, as in Cricket
const TACTICS_NUMBERS = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 25];
const marksOf = (dart) => (dart.number === 25 ? (dart.ring === 'D' ? 2 : 1) : dart.multiplier);

/**
 * Tactics: Cricket with the numbers 10 to 20 and the bull. Three marks close a
 * number; marks beyond score its points while an opponent still has it open.
 * The game ends when a player has closed everything and has the most points.
 */
export const TACTICS = {
    id: 'tactics',
    title: t('Tactics'),
    description: t('Cricket with 10 to 20 and the bull: close all twelve numbers and score on the ones the others still have open.'),
    rules: [
        t('The numbers 10 to 20 and the bull are in play. A single is one mark, a double two, a treble three; the outer bull one, the bullseye two.'),
        t('Three marks close a number for you. Marks beyond that score its points while an opponent still has it open.'),
        t('The first to close every number with the most points (or as many) wins.'),
    ],
    minPlayers: 2,
    maxPlayers: 4,
    options: [],
    init: (settings, ids) => ({ players: playersOf(ids, () => ({ marks: Object.fromEntries(TACTICS_NUMBERS.map(number => [number, 0])), points: 0, darts: 0, totalMarks: 0 })) }),
    visit: (state, id, darts) => {
        const player = state.players[id];
        player.darts += darts.length;
        for (const dart of darts) {
            if (!TACTICS_NUMBERS.includes(dart.number)) continue;
            const marks = marksOf(dart);
            player.totalMarks += marks;
            const before = player.marks[dart.number];
            const closing = Math.min(marks, Math.max(0, 3 - before));
            player.marks[dart.number] = before + marks;
            const extra = marks - closing;
            const open = Object.entries(state.players).some(([other, them]) => other !== id && them.marks[dart.number] < 3);
            if (extra > 0 && open) player.points += extra * dart.number;
        }
        return state;
    },
    over: (state) => {
        const players = Object.values(state.players);
        const top = Math.max(...players.map(player => player.points));
        return players.some(player => TACTICS_NUMBERS.every(number => player.marks[number] >= 3) && player.points >= top);
    },
    // closing everything first ranks the winner
    progress: { label: t('Points'), value: (player) => player.points },
    hero: (player) => ({
        score: player.points,
        note: t('Closed {{closed}} / 12', { closed: TACTICS_NUMBERS.filter(number => player.marks[number] >= 3).length }),
        line: [[t('Marks per round'), player.darts ? (player.totalMarks / player.darts * 3).toFixed(1) : '–'], [t('Darts'), player.darts]],
    }),
    moment: (before, after) => (after.totalMarks - before.totalMarks >= 9 ? { words: t('Nine marks!'), number: '9', sign: t('9 marks') } : null),
    score: (player) => (TACTICS_NUMBERS.every(number => player.marks[number] >= 3) ? 100000 : 0) + player.points,
    target: (state, id) => {
        const open = TACTICS_NUMBERS.filter(number => state.players[id].marks[number] < 3);
        return open.length ? t('Still open: {{numbers}}', { numbers: open.map(number => number === 25 ? t('Bull') : number).join(' · ') }) : t('All closed: score on the numbers the others have open');
    },
    columns: [
        { key: 'points', label: t('Points'), value: (player) => player.points },
        { key: 'closed', label: t('Closed'), value: (player) => `${TACTICS_NUMBERS.filter(number => player.marks[number] >= 3).length}/12` },
    ],
    figures: (player) => [
        [t('Points'), player.points],
        [t('Numbers closed'), `${TACTICS_NUMBERS.filter(number => player.marks[number] >= 3).length} / 12`],
        [t('Marks per round'), player.darts ? (player.totalMarks / player.darts * 3).toFixed(1) : '–'],
    ],
    // the throwing, not the tactics: marks per round as in Cricket
    level: {
        by: t('the marks per round'),
        of: (player) => (player.darts >= LEVEL_DARTS ? player.totalMarks / player.darts * 3 : null),
        bands: MARKS_BANDS,
        format: (value) => Number(value).toFixed(1),
    },
    preview: (state, id, darts) => tn(sum(darts.filter(dart => TACTICS_NUMBERS.includes(dart.number)).map(marksOf)), '{{count}} mark this visit', '{{count}} marks this visit'),
};

// Baseball: nine innings on 1 to 9, extra innings on the bull while the lead is shared
const BASEBALL_INNINGS = 9;
const BASEBALL_EXTRA = 3;
const BULL = 25;
// the runs of a dart: the number of the inning a run per ring (single 1, double 2, treble 3);
// the bullseye is a home run, 4 runs, in every inning; in extra innings the outer bull is 1
const runsOf = (dart, inning) => {
    if (dart.number === BULL && dart.ring === 'D') return 4;
    const target = inning > BASEBALL_INNINGS ? BULL : inning;
    return dart.number === target ? dart.multiplier : 0;
};
const inningName = (inning) => (inning > BASEBALL_INNINGS ? t('Bull') : String(inning));
// the players with the most runs
const leadersOf = (state, ids = Object.keys(state.players)) => {
    const top = Math.max(...ids.map(id => state.players[id].runs));
    return ids.filter(id => state.players[id].runs === top);
};

/**
 * Baseball: nine innings, inning 1 on the 1, inning 2 on the 2, … A single
 * scores a run, a double two, a treble three; the bullseye is a home run (4)
 * in any inning. A lead shared after nine goes to extra innings on the bull
 * (at most three), played by the leaders only. The most runs win.
 */
export const BASEBALL = {
    id: 'baseball',
    title: t('Baseball'),
    description: t('Nine innings on the numbers 1 to 9: every hit of the inning\'s number is a run, the bullseye a home run. A tie goes to extra innings on the bull.'),
    rules: [
        t('Inning 1 is played on the 1, inning 2 on the 2, and so on up to 9: three darts each.'),
        t('A single of the inning\'s number is one run, a double two, a treble three.'),
        t('The bullseye is a home run in every inning: four runs.'),
        t('After nine innings the most runs win. Level at the top: the leaders play extra innings on the bull (outer bull one run), up to three.'),
    ],
    minPlayers: 1,
    maxPlayers: 8,
    options: [],
    init: (settings, ids) => ({ players: playersOf(ids, () => ({ runs: 0, innings: [], darts: 0, homeRuns: 0 })), extra: null }),
    visit: (state, id, darts, { round }) => {
        const player = state.players[id];
        const runs = sum(darts.map(dart => runsOf(dart, round)));
        player.runs += runs;
        player.innings.push(runs);
        player.darts += darts.length;
        player.homeRuns += darts.filter(dart => dart.number === BULL && dart.ring === 'D').length;
        // the inning over for everyone who plays it: a shared lead goes on, the leaders alone
        const playing = state.extra ?? Object.keys(state.players);
        if (round >= BASEBALL_INNINGS && playing.every(other => state.players[other].innings.length >= round)) {
            const leaders = leadersOf(state, playing);
            state.extra = leaders.length > 1 && round < BASEBALL_INNINGS + BASEBALL_EXTRA ? leaders : state.extra;
            state.decided = leaders.length === 1 || round >= BASEBALL_INNINGS + BASEBALL_EXTRA;
        }
        return state;
    },
    active: (state, id) => !state.extra || state.extra.includes(id),
    over: (state, { roundComplete }) => Boolean(roundComplete && state.decided),
    score: (player) => player.runs,
    progress: { label: t('Runs'), value: (player) => player.runs },
    hero: (player) => ({
        score: player.runs,
        // the runs are the big number already: the home runs under it
        note: tn(player.homeRuns, '{{count}} home run', '{{count}} home runs'),
        line: [[t('Last inning'), player.innings.at(-1) ?? '–'], [t('Runs per inning'), player.innings.length ? (player.runs / player.innings.length).toFixed(1) : '–']],
    }),
    moment: (before, after) => (after.runs - before.runs >= 9 ? { words: t('Grand slam!'), number: String(after.runs - before.runs), sign: t('Baseball') } : null),
    // the same for everyone in a round: shown as the stage of the game in its header
    roundStage: true,
    target: (state, id, { round }) => (round > BASEBALL_INNINGS
        ? t('Extra inning {{inning}}: the bull', { inning: round - BASEBALL_INNINGS })
        : t('Inning {{inning}} of 9: the {{inning}}', { inning: round })),
    columns: [
        { key: 'runs', label: t('Runs'), value: (player) => player.runs },
        { key: 'homeRuns', label: t('Home runs'), value: (player) => player.homeRuns },
    ],
    figures: (player) => [
        [t('Runs'), player.runs],
        [t('Runs per inning'), player.innings.length ? (player.runs / player.innings.length).toFixed(1) : '–'],
        [t('Best inning'), player.innings.length ? Math.max(...player.innings) : '–'],
        [t('Home runs'), player.homeRuns],
    ],
    // runs per inning of the nine on the numbers (not the extra ones on the bull): a run a mark, so
    // as the marks per round of Cricket
    level: {
        by: t('the runs per inning'),
        of: (player) => {
            const innings = player.innings.slice(0, BASEBALL_INNINGS);
            return innings.length >= 3 ? sum(innings) / innings.length : null;
        },
        bands: MARKS_BANDS,
        format: (value) => Number(value).toFixed(1),
    },
    preview: (state, id, darts, { round }) => tn(sum(darts.map(dart => runsOf(dart, round))), 'Inning {{inning}}: {{count}} run', 'Inning {{inning}}: {{count}} runs', { inning: inningName(round) }),
};

// Scram: the numbers in play, the bull last
const SCRAM_NUMBERS = {
    cricket: [20, 19, 18, 17, 16, 15, BULL],
    all: [...Array.from({ length: 20 }, (_, index) => 20 - index), BULL],
};
const numbersOf = (settings) => SCRAM_NUMBERS[settings?.numbers] ?? SCRAM_NUMBERS.cricket;
const numberName = (number) => (number === BULL ? t('Bull') : String(number));

/**
 * Scram: two players, two innings. In the first the first player is the
 * stopper, who closes a number with any hit on it; the other scores the
 * points of every dart on a number still open. All closed: the roles swap.
 * After the second innings the most points win.
 */
export const SCRAM = {
    id: 'scram',
    title: t('Scram'),
    description: t('Two players, two innings: one closes the numbers, the other scores on the ones still open. Then the roles swap, and the most points win.'),
    rules: [
        t('In the first innings the first player is the stopper: any hit on a number in play closes it.'),
        t('The other player is the scorer: every dart on a number still open scores its points (the bull 25, the bullseye 50).'),
        t('When the stopper has closed every number, the roles swap and the numbers open again.'),
        t('After the second innings the most points win.'),
    ],
    minPlayers: 2,
    maxPlayers: 2,
    options: [{ key: 'numbers', label: t('Numbers'), values: [{ value: 'cricket', label: t('15 to 20 and the bull') }, { value: 'all', label: t('1 to 20 and the bull') }], default: 'cricket' }],
    init: (settings, ids) => ({ order: ids, innings: 1, closed: [], over: false, players: playersOf(ids, id => ({ id, points: 0, darts: 0, stopDarts: 0, scoreDarts: 0, closed: 0 })) }),
    visit: (state, id, darts, { settings }) => {
        const player = state.players[id];
        const numbers = numbersOf(settings);
        const stopper = state.order[state.innings - 1];
        player.darts += darts.length;
        if (id === stopper) {
            player.stopDarts += darts.length;
            for (const dart of darts) {
                if (numbers.includes(dart.number) && !state.closed.includes(dart.number)) {
                    state.closed.push(dart.number);
                    player.closed += 1;
                }
            }
            if (numbers.every(number => state.closed.includes(number))) {
                if (state.innings === 1) {
                    state.innings = 2;
                    state.closed = [];
                } else {
                    state.over = true;
                }
            }
        } else {
            player.scoreDarts += darts.length;
            player.points += sum(darts.filter(dart => numbers.includes(dart.number) && !state.closed.includes(dart.number)).map(dart => dart.points));
        }
        return state;
    },
    over: (state) => state.over,
    score: (player) => player.points,
    progress: { label: t('Points'), value: (player) => player.points },
    hero: (player, state, ctx) => {
        const stopping = state.order[state.innings - 1] === player.id;
        return {
            score: player.points,
            note: stopping ? t('Stopper: closing') : t('Scorer'),
            line: [[t('Innings'), `${state.innings} / 2`], [t('Open'), numbersOf(ctx?.settings).filter(number => !state.closed.includes(number)).length]],
        };
    },
    moment: () => null,
    target: (state, id, { settings }) => {
        const open = numbersOf(settings).filter(number => !state.closed.includes(number)).map(numberName).join(' · ');
        return state.order[state.innings - 1] === id
            ? t('Close: {{numbers}}', { numbers: open })
            : t('Score on: {{numbers}}', { numbers: open });
    },
    columns: [
        { key: 'points', label: t('Points'), value: (player) => player.points },
        { key: 'role', label: t('Role'), value: (player, state) => (state.order[state.innings - 1] === player.id ? t('Stopper') : t('Scorer')) },
    ],
    figures: (player) => [
        [t('Points'), player.points],
        [t('Points per visit'), player.scoreDarts ? (player.points / player.scoreDarts * 3).toFixed(1) : '–'],
        [t('Darts to close'), player.stopDarts || '–'],
    ],
    // the throwing, not the result: the numbers closed as stopper per dart, any ring of the number
    // as in Around the Clock (about 55 % of the darts for a 50 average, 70 % for 75, 85 % for 95)
    level: {
        by: t('the hit rate as stopper'),
        of: (player) => (player.stopDarts >= 6 ? player.closed / player.stopDarts * 100 : null),
        bands: [50, 70, 85],
        format: levelPercent,
    },
    preview: (state, id, darts, { settings }) => {
        const numbers = numbersOf(settings);
        const open = darts.filter(dart => numbers.includes(dart.number) && !state.closed.includes(dart.number));
        return state.order[state.innings - 1] === id
            ? tn(new Set(open.map(dart => dart.number)).size, '{{count}} number closed this visit', '{{count}} numbers closed this visit')
            : t('{{points}} points this visit', { points: sum(open.map(dart => dart.points)) });
    },
};

export const GAMES = [SHANGHAI, KILLER, HALVE_IT, GOLF, TACTICS, BASEBALL, SCRAM];
export const gameOf = (id) => GAMES.find(game => game.id === id) ?? null;
export const TACTICS_TARGETS = TACTICS_NUMBERS;
export const scramNumbers = numbersOf;
export const HALVE_IT_ROUNDS = HALVE_IT_TARGETS;
