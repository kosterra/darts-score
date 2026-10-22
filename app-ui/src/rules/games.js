/**
 * The newer games, each as one definition of the rules engine (see engine.js):
 * Shanghai, Killer, Halve-It, Golf and Tactics.
 */
import { isBull, isDouble, isTreble } from './darts';
import { t, tn } from '../utils/i18n';

const sum = (values) => values.reduce((total, value) => total + value, 0);
const playersOf = (ids, make) => Object.fromEntries(ids.map(id => [id, make(id)]));
const roundsLeft = (round, rounds) => Math.max(0, rounds - round + 1);

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
    init: (settings, ids) => ({ players: playersOf(ids, () => ({ points: 0, shanghai: false, hits: 0, darts: 0 })), shanghaiBy: null }),
    visit: (state, id, darts, { round }) => {
        const player = state.players[id];
        const onTarget = darts.filter(dart => dart.number === round);
        player.points += sum(onTarget.map(dart => dart.points));
        player.hits += onTarget.length;
        player.darts += darts.length;
        const rings = new Set(onTarget.map(dart => dart.ring));
        if (rings.has('S') && rings.has('D') && rings.has('T')) {
            player.shanghai = true;
            state.shanghaiBy = state.shanghaiBy ?? id;
        }
        return state;
    },
    over: (state, { settings, round, roundComplete }) => Boolean(state.shanghaiBy) || (roundComplete && round > settings.rounds),
    // a Shanghai beats any score
    score: (player) => (player.shanghai ? 100000 : 0) + player.points,
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
    preview: (state, id, darts, { round }) => {
        const points = sum(darts.filter(dart => dart.number === round).map(dart => dart.points));
        const rings = new Set(darts.filter(dart => dart.number === round).map(dart => dart.ring));
        return rings.has('S') && rings.has('D') && rings.has('T') ? t('Shanghai! The game is won.') : t('{{points}} points this visit', { points });
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
        players: playersOf(ids, id => ({ number: settings.numbers?.[id] ?? ids.indexOf(id) + 1, lives: settings.lives, killer: false, kills: 0, outAt: null, darts: 0 })),
        visits: 0,
    }),
    visit: (state, id, darts) => {
        state.visits += 1;
        const player = state.players[id];
        player.darts += darts.length;
        for (const dart of darts) {
            if (!isDouble(dart) || player.lives <= 0) continue;
            if (dart.number === player.number) {
                if (player.killer) player.lives -= 1;
                else player.killer = true;
                continue;
            }
            if (!player.killer) continue;
            const victim = Object.values(state.players).find(other => other.number === dart.number && other.lives > 0);
            if (victim) {
                victim.lives -= 1;
                player.kills += 1;
            }
        }
        Object.values(state.players).forEach(other => {
            if (other.lives <= 0 && other.outAt === null) other.outAt = state.visits;
        });
        return state;
    },
    active: (state, id) => state.players[id].lives > 0,
    over: (state) => Object.values(state.players).filter(player => player.lives > 0).length <= 1,
    // the last one standing first, then the one out last
    score: (player) => player.lives > 0 ? 100000 + player.lives : player.outAt ?? 0,
    target: (state, id) => state.players[id].killer
        ? t('Killer: hit the doubles of the others')
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
    preview: (state, id, darts) => {
        const player = state.players[id];
        const taken = player.killer || darts.some(dart => isDouble(dart) && dart.number === player.number)
            ? darts.filter(dart => isDouble(dart) && dart.number !== player.number && Object.values(state.players).some(other => other.number === dart.number && other.lives > 0)).length
            : 0;
        return taken ? tn(taken, '{{count}} life taken', '{{count}} lives taken') : t('Nobody hit yet');
    },
};

// Halve-It: the targets of the rounds, in order
const HALVE_IT_TARGETS = [
    { key: '20', label: '20', points: (darts) => sum(darts.filter(dart => dart.number === 20).map(dart => dart.points)) },
    { key: '16', label: '16', points: (darts) => sum(darts.filter(dart => dart.number === 16).map(dart => dart.points)) },
    { key: 'double', label: t('Any double'), points: (darts) => sum(darts.filter(isDouble).map(dart => dart.points)) },
    { key: '17', label: '17', points: (darts) => sum(darts.filter(dart => dart.number === 17).map(dart => dart.points)) },
    { key: 'treble', label: t('Any treble'), points: (darts) => sum(darts.filter(isTreble).map(dart => dart.points)) },
    { key: '18', label: '18', points: (darts) => sum(darts.filter(dart => dart.number === 18).map(dart => dart.points)) },
    { key: '41', label: t('Exactly 41'), points: (darts) => sum(darts.map(dart => dart.points)) === 41 ? 41 : 0 },
    { key: '19', label: '19', points: (darts) => sum(darts.filter(dart => dart.number === 19).map(dart => dart.points)) },
    { key: 'bull', label: t('Bull'), points: (darts) => sum(darts.filter(isBull).map(dart => dart.points)) },
];
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
    visit: (state, id, darts, { round }) => {
        const player = state.players[id];
        const target = HALVE_IT_TARGETS[round - 1];
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
    over: (state, { round, roundComplete }) => roundComplete && round > HALVE_IT_TARGETS.length,
    score: (player) => player.points,
    target: (state, id, { round }) => t('Round {{round}} of {{rounds}}: {{target}}', { round, rounds: HALVE_IT_TARGETS.length, target: HALVE_IT_TARGETS[round - 1]?.label ?? '' }),
    columns: [
        { key: 'points', label: t('Points'), value: (player) => player.points },
        { key: 'halved', label: t('Halved'), value: (player) => player.halved },
    ],
    figures: (player) => [
        [t('Points'), player.points],
        [t('Halved'), player.halved],
        [t('Best round'), player.best],
    ],
    preview: (state, id, darts, { round }) => {
        const target = HALVE_IT_TARGETS[round - 1];
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
    preview: (state, id, darts) => tn(sum(darts.filter(dart => TACTICS_NUMBERS.includes(dart.number)).map(marksOf)), '{{count}} mark this visit', '{{count}} marks this visit'),
};

export const GAMES = [SHANGHAI, KILLER, HALVE_IT, GOLF, TACTICS];
export const gameOf = (id) => GAMES.find(game => game.id === id) ?? null;
export const TACTICS_TARGETS = TACTICS_NUMBERS;
export const HALVE_IT_ROUNDS = HALVE_IT_TARGETS;
