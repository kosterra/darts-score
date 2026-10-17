import { describe, it, expect } from 'vitest';
import { hasLink, looksRandom, sentTooFast, createCounter, MIN_FORM_MS } from './spam.rules.js';

describe('hasLink', () => {
    it('finds web addresses', () => {
        expect(hasLink('Cheap pills www.example.com')).toBe(true);
        expect(hasLink('visit https://spam.test')).toBe(true);
        expect(hasLink('casino-bonus.xyz')).toBe(true);
    });

    it('leaves normal names alone', () => {
        expect(hasLink('Dartclub Zürich')).toBe(false);
        expect(hasLink('The Bull. Pub team')).toBe(false);
        expect(hasLink(undefined)).toBe(false);
    });
});

describe('looksRandom', () => {
    it('spots random letters', () => {
        expect(looksRandom('xkqzvbtw')).toBe(true);
        expect(looksRandom('HgTrKpLmQs')).toBe(true);
        expect(looksRandom('bcdfghjk club')).toBe(true);
    });

    it('accepts real names and nicknames', () => {
        for (const name of ['Schwarzenbach', 'The Power', 'Dartfreunde Bern', 'McDonald', 'Strasser', 'Jürg', 'MvG', 'DartsClub', 'Christoph']) {
            expect(looksRandom(name), name).toBe(false);
        }
    });
});

describe('sentTooFast', () => {
    it('is true below the minimum time', () => {
        expect(sentTooFast(400)).toBe(true);
        expect(sentTooFast(MIN_FORM_MS - 1)).toBe(true);
    });

    it('is false for people and when the time is unknown', () => {
        expect(sentTooFast(MIN_FORM_MS)).toBe(false);
        expect(sentTooFast(25000)).toBe(false);
        expect(sentTooFast(undefined)).toBe(false);
        expect(sentTooFast('')).toBe(false);
        expect(sentTooFast('abc')).toBe(false);
    });
});

describe('createCounter', () => {
    it('counts events within the window only', () => {
        let time = 0;
        const counter = createCounter(() => time);
        expect(counter.add('a', 1000)).toBe(1);
        time = 500;
        expect(counter.add('a', 1000)).toBe(2);
        time = 1200;
        expect(counter.count('a', 1000)).toBe(1);
        expect(counter.add('b', 1000)).toBe(1);
        time = 5000;
        counter.prune(1000);
        expect(counter.count('a', 1000)).toBe(0);
    });
});
