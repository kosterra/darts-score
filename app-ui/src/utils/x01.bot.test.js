import { describe, it, expect } from 'vitest';
import { botDart, botSkill, botStrength, botStrengthFrom, botTarget, knowsPlayer, throwAt } from './x01.bot';
import { isBust } from './x01.rules';

// a seeded random generator, so the tests always throw the same darts
const seeded = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};
const VALUE = { S: 1, D: 2, T: 3 };
const valueOf = (dart) => dart === '0' ? 0 : VALUE[dart[0]] * Number(dart.slice(1));

// a leg of 501 double out: the bot's 3-dart average over it, and the last dart
const playLeg = (skill, random) => {
    let score = 501;
    let darts = 0;
    for (let visit = 0; visit < 200; visit++) {
        const before = score;
        const thrown = [];
        for (let left = 3; left > 0; left--) {
            const { dart } = botDart({ score, dartsLeft: left, outMode: 'Double Out', inMode: 'Straight In', started: true, skill, random });
            thrown.push(dart);
            darts += 1;
            score -= valueOf(dart);
            if (isBust(score, thrown, 'Double Out')) { score = before; break; }
            if (score === 0) return { average: 501 / darts * 3, last: dart };
        }
    }
    return { average: 0, last: null };
};
const averageOver = (average, checkoutRate = null, legs = 300) => {
    const skill = botSkill({ average, checkoutRate });
    const random = seeded(7);
    const results = Array.from({ length: legs }, () => playLeg(skill, random));
    return { average: results.reduce((sum, leg) => sum + leg.average, 0) / legs, lasts: results.map(leg => leg.last) };
};

describe('training bot', () => {
    it('aims like a player: the way out, a setup shot, the treble', () => {
        expect(botTarget({ score: 40, dartsLeft: 3 })).toBe('D20');
        expect(botTarget({ score: 170, dartsLeft: 3 })).toBe('T20');
        expect(botTarget({ score: 501, dartsLeft: 3 })).toBe('T20');
        expect(botTarget({ score: 50, dartsLeft: 1 })).toBe('D25');
        expect(botTarget({ score: 0, started: false, inMode: 'Double In' })).toBe('D20');
    });

    it('scores about the average of the player it plays like', () => {
        for (const target of [35, 55, 75, 95]) {
            const { average } = averageOver(target);
            // whole legs, the finishing darts included, as in the statistics
            expect(average).toBeGreaterThan(target * 0.9);
            expect(average).toBeLessThan(target * 1.1);
        }
    });

    it('finishes on a double and gets better with a better player', () => {
        const weak = averageOver(40, 0.15);
        const strong = averageOver(85, 0.4);
        expect(weak.lasts.every(dart => dart.startsWith('D'))).toBe(true);
        expect(strong.average).toBeGreaterThan(weak.average + 20);
    });

    it('misses a treble into the single or next door, a double into the single or off the board', () => {
        const random = seeded(3);
        const skill = { treble: 0, double: 0, wild: 0 };
        const trebles = new Set(Array.from({ length: 300 }, () => throwAt('T20', skill, random)));
        expect([...trebles].every(dart => ['S20', 'S1', 'S5', 'T1', 'T5'].includes(dart))).toBe(true);
        const doubles = new Set(Array.from({ length: 300 }, () => throwAt('D16', skill, random)));
        expect([...doubles].every(dart => ['S16', '0', 'D8', 'D7'].includes(dart))).toBe(true);
    });
});

describe('bot strength', () => {
    it('plays like the player: recent form first, then the average, then the level or age', () => {
        const stats = { playedGames: { x01: 20 }, avg: { overallX01: 48.2 }, checkouts: { hit: 30, total: 100 } };
        expect(botStrengthFrom({ form: { games: 8, recentAverage: 52.4 }, stats })).toEqual({ average: 52.4, checkoutRate: 0.3, basis: 'last 5 X01 games' });
        expect(botStrengthFrom({ form: { games: 3, recentAverage: 60 }, stats })).toMatchObject({ average: 48.2, basis: 'all X01 games' });
        expect(botStrengthFrom({ stats: { playedGames: {}, checkouts: { hit: 1, total: 4 } }, fallback: { average: 22, text: 'no X01 games yet' } })).toEqual({ average: 22, checkoutRate: null, basis: 'no X01 games yet' });
    });

    it('plays easier or harder on request', () => {
        const stats = { playedGames: { x01: 20 }, avg: { overallX01: 60 }, checkouts: { hit: 30, total: 100 } };
        expect(botStrengthFrom({ stats, level: 'easier' })).toMatchObject({ average: 51, checkoutRate: 0.255 });
        expect(botStrengthFrom({ stats, level: 'harder' })).toMatchObject({ average: 69, checkoutRate: 0.345 });
    });
});

describe('bot presets', () => {
    it('plays a fixed level, or like the player', () => {
        expect(botStrength({ mode: 'hard' })).toEqual({ average: 60, checkoutRate: 0.28, basis: 'the hard bot' });
        const stats = { playedGames: { x01: 20 }, avg: { overallX01: 60 }, checkouts: { hit: 30, total: 100 } };
        expect(botStrength({ mode: 'me', level: 'harder', stats })).toMatchObject({ average: 69 });
        expect(knowsPlayer({ stats })).toBe(true);
        expect(knowsPlayer({ stats: { playedGames: {} } })).toBe(false);
    });
});
