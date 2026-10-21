/**
 * A darts player for the demo games: aims like one (treble 20, then a way
 * to a double, then the double) and hits like one of a given skill, from
 * 0 (a beginner) to 1 (very good). random: a seeded random number generator,
 * so the same demo games come out every time.
 */
export const seeded = (seed) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};

const NEIGHBOURS = { 20: [1, 5], 19: [7, 3], 18: [4, 1], 17: [3, 2], 16: [8, 7], 15: [10, 2], 14: [9, 11], 13: [6, 4], 12: [5, 9], 11: [14, 8], 10: [6, 15], 9: [12, 14], 8: [11, 16], 7: [16, 19], 6: [13, 10], 5: [20, 12], 4: [18, 13], 3: [19, 17], 2: [17, 15], 1: [18, 20] };
const value = (dart) => dart === '0' ? 0 : ({ S: 1, D: 2, T: 3 })[dart[0]] * Number(dart.slice(1));
// the doubles one likes to leave, best first
const LEAVES = [40, 32, 36, 24, 16, 8, 20, 12, 4, 2];

const aim = (left) => {
    if (left <= 40 && left % 2 === 0) return `D${left / 2}`;
    if (left === 50) return 'D25';
    if (left <= 60) {
        const leave = LEAVES.find(target => left - target >= 1 && left - target <= 20);
        if (leave) return `S${left - leave}`;
    }
    if (left <= 100 && left > 60) {
        const leave = LEAVES.find(target => (left - target) % 3 === 0 && (left - target) / 3 <= 20 && (left - target) / 3 >= 1);
        if (leave) return `T${(left - leave) / 3}`;
    }
    return left >= 140 || left > 100 ? 'T20' : 'T20';
};

// where a dart aimed at "target" lands
const land = (target, skill, random) => {
    const ring = target[0];
    const number = Number(target.slice(1));
    const roll = random();
    const neighbour = () => NEIGHBOURS[number]?.[random() < 0.5 ? 0 : 1] ?? number;
    if (number === 25) return roll < 0.15 + 0.25 * skill ? 'D25' : roll < 0.6 ? 'S25' : `S${1 + Math.floor(random() * 20)}`;
    if (ring === 'T') {
        if (roll < 0.06 + 0.3 * skill) return `T${number}`;
        if (roll < 0.8) return `S${number}`;
        if (roll < 0.97) return random() < 0.15 ? `T${neighbour()}` : `S${neighbour()}`;
        return '0';
    }
    if (ring === 'D') {
        if (roll < 0.15 + 0.35 * skill) return `D${number}`;
        if (roll < 0.6) return `S${number}`;
        return '0';
    }
    return roll < 0.85 + 0.1 * skill ? `S${number}` : `S${neighbour()}`;
};

/**
 * The darts of one visit with "left" to go in a double-out game: up to three,
 * fewer when the last one finishes. A dart that would bust lands outside instead.
 */
export const visit = (left, skill, random) => {
    const darts = [];
    for (let i = 0; i < 3; i++) {
        let dart = land(aim(left), skill, random);
        const rest = left - value(dart);
        const finishes = rest === 0 && dart[0] === 'D';
        if (!finishes && rest < 2) dart = '0';
        darts.push(dart);
        left -= value(dart);
        if (left === 0) break;
    }
    return darts;
};

// a Cricket visit: at the numbers 15 to 20 and the bull, the open ones first
export const cricketVisit = (targets, skill, random) => Array.from({ length: 3 }, () => {
    const target = targets[Math.floor(random() * Math.min(2, targets.length))] ?? 20;
    return target === 25 ? land('D25', skill, random) : land(`T${target}`, skill, random);
});
