/**
 * A dart as the board and the keypad enter it: 'T20', 'D16', 'S5', 'S25'
 * (the outer bull), 'D25' (the bullseye) or '0' (a miss). Parsed once into
 * what the rules need.
 */

const BULL = 25;

/**
 * { field, ring: 'S' | 'D' | 'T' | null, number (1–20, 25, 0 for a miss),
 * multiplier (0–3), points }
 */
export const parseDart = (value) => {
    const field = String(value ?? '').trim().toUpperCase();
    const match = field.match(/^([SDT]?)(\d{1,2})$/);
    if (!match || Number(match[2]) === 0) return { field: '0', ring: null, number: 0, multiplier: 0, points: 0 };
    const number = Number(match[2]);
    const ring = match[1] || 'S';
    // the bull has no treble; a treble 25 is not on the board
    if ((number < 1 || number > 20) && number !== BULL) return { field: '0', ring: null, number: 0, multiplier: 0, points: 0 };
    if (number === BULL && ring === 'T') return { field: '0', ring: null, number: 0, multiplier: 0, points: 0 };
    const multiplier = { S: 1, D: 2, T: 3 }[ring];
    return { field: `${ring}${number}`, ring, number, multiplier, points: number * multiplier };
};

// a dart as the board or the keypad enters it ('20' is read as 'S20')
export const isValidDart = (value) => {
    const field = String(value ?? '').trim().toUpperCase();
    if (field === '0') return true;
    return parseDart(field).field === (/^\d/.test(field) ? `S${field}` : field);
};

export const isDouble = (dart) => dart.ring === 'D';
export const isTreble = (dart) => dart.ring === 'T';
export const isBull = (dart) => dart.number === BULL;
export const hits = (dart, number) => dart.number === number;

// what is left after a dart when checking out with a double: { left, bust, out }
export const afterDart = (left, dart) => {
    const next = left - dart.points;
    if (next < 0 || next === 1) return { left, bust: true, out: false };
    if (next === 0) return isDouble(dart) ? { left: 0, bust: false, out: true } : { left, bust: true, out: false };
    return { left: next, bust: false, out: false };
};

/**
 * A finish with a double out of a score in one visit of three darts: the
 * scores of 2 to 170 except the "bogey numbers" (169, 168, 166, 165, 163, 162, 159).
 */
export const BOGEY = new Set([169, 168, 166, 165, 163, 162, 159]);
export const isCheckout = (score) => score >= 2 && score <= 170 && !BOGEY.has(score);

export const label = (dart) => dart.field === '0' ? '–' : dart.field === 'D25' ? 'Bull' : dart.field === 'S25' ? '25' : dart.field;
