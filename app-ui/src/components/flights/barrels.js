/**
 * The barrels by the ids of the API (app-api utils/flights.js): a profile,
 * a grip and a finish each, as the dart from the side draws them (x from 30,
 * the point, to 80, the shaft; y across, the axis at 0). Lit from the front
 * like the rest of the dart.
 */

// the outlines, from the point to the shaft
export const PROFILES = {
    classic: { path: 'M 30,-2.2 Q 34,-3.9 40,-3.9 L 72,-3.9 Q 78,-3.9 80,-2.6 L 80,2.6 Q 78,3.9 72,3.9 L 40,3.9 Q 34,3.9 30,2.2 Z', radius: 3.9, grip: [44, 69] },
    straight: { path: 'M 30,-2.6 L 33,-3.3 L 77,-3.3 L 80,-2.4 L 80,2.4 L 77,3.3 L 33,3.3 L 30,2.6 Z', radius: 3.3, grip: [36, 75] },
    torpedo: { path: 'M 30,-2.4 Q 33,-4.4 42,-4.4 L 56,-4.2 Q 70,-3.4 80,-2.2 L 80,2.2 Q 70,3.4 56,4.2 L 42,4.4 Q 33,4.4 30,2.4 Z', radius: 4.3, grip: [36, 58] },
    bomb: { path: 'M 30,-2.2 Q 40,-4.9 55,-4.9 Q 70,-4.9 80,-2.2 L 80,2.2 Q 70,4.9 55,4.9 Q 40,4.9 30,2.2 Z', radius: 4.7, grip: [44, 66] },
};

// lit from the front: the same shade at both edges, brightest a little above the middle
export const FINISHES = {
    silver: { stops: ['#7d8791', '#dfe4e9', '#b3bcc5', '#7d8791'], grip: 'rgba(30, 35, 40, 0.55)' },
    brass: { stops: ['#8a6a1f', '#f2d27a', '#c9a240', '#8a6a1f'], grip: 'rgba(70, 50, 10, 0.6)' },
    copper: { stops: ['#7a3b1c', '#eaa47c', '#c06a3c', '#7a3b1c'], grip: 'rgba(70, 30, 10, 0.6)' },
    gunmetal: { stops: ['#3a4048', '#a3acb6', '#5f6770', '#3a4048'], grip: 'rgba(15, 18, 22, 0.7)' },
    black: { stops: ['#16181b', '#5c626a', '#2c3035', '#16181b'], grip: '#c9a240' },
    blue: { stops: ['#0c2c5a', '#5fb0ff', '#1f5fbf', '#0c2c5a'], grip: 'rgba(5, 20, 45, 0.65)' },
    gold: { stops: ['#8a6412', '#ffe28a', '#e9ac2f', '#8a6412'], grip: 'rgba(90, 60, 5, 0.6)' },
    rainbow: { stops: ['#4b3a6e', '#c7b8ff', '#7a8cff', '#4b3a6e'], grip: 'rgba(20, 15, 40, 0.55)', rainbow: true },
};

export const BARRELS = {
    classic: { profile: 'classic', grip: 'rings', finish: 'silver' },
    brass: { profile: 'straight', grip: 'rings', finish: 'brass' },
    slim: { profile: 'straight', grip: 'fineRings', finish: 'silver' },
    copper: { profile: 'torpedo', grip: 'rings', finish: 'copper' },
    scallop: { profile: 'classic', grip: 'scallop', finish: 'silver' },
    shark: { profile: 'torpedo', grip: 'shark', finish: 'gunmetal' },
    pixel: { profile: 'straight', grip: 'pixel', finish: 'silver' },
    bomb: { profile: 'bomb', grip: 'rings', finish: 'black' },
    blueCoat: { profile: 'straight', grip: 'shark', finish: 'blue' },
    pro: { profile: 'classic', grip: 'fineRings', finish: 'black' },
    champion: { profile: 'torpedo', grip: 'pixel', finish: 'gold' },
    legend: { profile: 'bomb', grip: 'scallop', finish: 'gold' },
    rainbow: { profile: 'straight', grip: 'rings', finish: 'rainbow' },
};

// the colour of a barrel's finish, for the darts on the board
export const barrelColor = (barrel) => FINISHES[(BARRELS[barrel] ?? BARRELS.classic).finish].stops[2];
