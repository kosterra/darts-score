// The dartboard of the app in its own coordinates: a 420 × 420 viewBox with the
// centre at (210, 210), the 20 on top. Used to show where a dart that was not
// tapped (e.g. one of the training bot) stuck in the board.

export const CENTRE = 210;

// the numbers round the board, clockwise from the top
const BOARD = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// the rings by radius, as the board draws them
export const RINGS = {
    bullseye: [0, 16],
    outerBull: [16, 41],
    innerSingle: [41, 85],
    treble: [85, 107],
    outerSingle: [107, 150],
    double: [150, 170],
    outside: [170, 210],
};

// a little away from the wires, so a dart never seems to sit on the line
const MARGIN = 2.5;

const between = ([from, to], random) => from + MARGIN + random() * Math.max(0, to - from - 2 * MARGIN);

// the angle (degrees, counter-clockwise from the right) of a number's middle
const angleOf = (number) => 90 - 18 * BOARD.indexOf(number);

const toPoint = (radius, degrees) => {
    const radians = degrees * Math.PI / 180;
    return { x: CENTRE + radius * Math.cos(radians), y: CENTRE - radius * Math.sin(radians) };
};

/**
 * A point in the field of a dart ("T20", "S5", "D25", "S25", "0"), somewhere
 * inside it rather than on its middle. random: numbers from 0 to 1.
 */
export const pointForDart = (dart, random = Math.random) => {
    const text = String(dart ?? '').toUpperCase();
    if (text === 'D25') return toPoint(between(RINGS.bullseye, random) * random(), random() * 360);
    if (text === 'S25') return toPoint(between(RINGS.outerBull, random), random() * 360);
    const ring = text[0];
    const number = Number(text.slice(1));
    // off the board (a miss), or something unknown
    if (!BOARD.includes(number) || !'SDT'.includes(ring)) return toPoint(between(RINGS.outside, random), random() * 360);
    // within the number's 18 degrees, away from its wires
    const degrees = angleOf(number) + (random() - 0.5) * 13;
    const band = ring === 'T' ? RINGS.treble : ring === 'D' ? RINGS.double : random() < 0.5 ? RINGS.innerSingle : RINGS.outerSingle;
    return toPoint(between(band, random), degrees);
};

/**
 * The field at a point of the board, the opposite of pointForDart: "T20",
 * "S25", "0" (off the board) …
 */
export const dartAt = ({ x, y }) => {
    const dx = x - CENTRE;
    const dy = CENTRE - y;
    const radius = Math.hypot(dx, dy);
    if (radius < RINGS.bullseye[1]) return 'D25';
    if (radius < RINGS.outerBull[1]) return 'S25';
    if (radius >= RINGS.double[1]) return '0';
    const degrees = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const index = Math.round(((90 - degrees) % 360 + 360) % 360 / 18) % 20;
    const number = BOARD[index];
    if (radius >= RINGS.double[0]) return `D${number}`;
    if (radius >= RINGS.treble[0] && radius < RINGS.treble[1]) return `T${number}`;
    return `S${number}`;
};

// a seeded random generator, so a dart keeps its point while the page redraws
export const seededRandom = (seedText) => {
    let seed = [...String(seedText)].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) | 0;
    return () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};
