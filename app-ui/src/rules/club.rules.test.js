import { describe, expect, it } from 'vitest';
import { appDefaults, isLocked, lockedSettings, normalizeClubRules, offeredValues, ruleViolations, startingSettings } from './club.rules.js';

const rules = {
    games: {
        x01: { defaults: { startingScore: 301, legOutMode: 'Double Out' }, offered: { startingScore: [301, 501], legOutMode: ['Double Out'] }, locked: ['legOutMode', 'unknown'] },
        cricket: { enabled: false },
        killer: { defaults: { lives: 5 }, locked: ['lives'] },
    },
    formats: [
        { id: 'club-night', game: 'x01', name: 'Club night', settings: { startingScore: 501, numberOfLegs: 5, nonsense: 1 }, friendly: false },
        { id: 'warm-up', game: 'x01', name: 'Warm-up', settings: { startingScore: 301, numberOfLegs: 1 }, friendly: true },
        { game: 'darts', name: 'Unknown game' },
    ],
    friendlyChoice: false,
    handicap: { mode: 'offered', maxDifference: 100 },
};

describe('normalizeClubRules', () => {
    it('keeps what the games know, and the formats of known games', () => {
        const club = normalizeClubRules(rules);
        expect(club.games.x01.locked).toEqual(['legOutMode']);
        expect(club.games.x01.offered).toEqual({ startingScore: [301, 501], legOutMode: ['Double Out'] });
        expect(club.games.cricket.enabled).toBe(false);
        expect(club.formats.map(format => format.id)).toEqual(['club-night', 'warm-up']);
        expect(club.formats[0].settings).toEqual({ startingScore: 501, numberOfLegs: 5 });
        expect(club.handicap).toEqual({ mode: 'offered', maxDifference: 100 });
    });

    it('starts a restricted choice on one it offers', () => {
        const club = normalizeClubRules({ games: { x01: { offered: { startingScore: [301, 701] } } } });
        expect(club.games.x01.defaults.startingScore).toBe(301);
    });

    it('is the app as it is without rules', () => {
        const club = normalizeClubRules();
        expect(club.games.x01).toEqual({ enabled: true, defaults: {}, offered: {}, locked: [] });
        expect(club).toMatchObject({ builtInFormats: true, friendlyChoice: true, waysOut: true, handicap: { mode: 'suggested', maxDifference: 0 } });
    });
});

describe('the settings of a setup', () => {
    it('start from the club, take what was remembered where it is offered, and keep the locks', () => {
        const settings = startingSettings('x01', rules, { startingScore: 1001, legOutMode: 'Straight Out', numberOfLegs: 5 });
        expect(settings).toMatchObject({ startingScore: 301, legOutMode: 'Double Out', numberOfLegs: 5, legInMode: 'Straight In' });
        expect(startingSettings('x01', rules, { startingScore: 501 }).startingScore).toBe(501);
    });

    it('know the locks and the choices offered', () => {
        expect(lockedSettings('killer', rules)).toEqual({ lives: 5 });
        expect(isLocked('x01', rules, 'legOutMode')).toBe(true);
        expect(offeredValues('x01', rules, 'startingScore')).toEqual([301, 501]);
        expect(offeredValues('x01', rules, 'legInMode')).toEqual(['Straight In', 'Double In', 'Master In']);
        expect(appDefaults('shanghai')).toEqual({ rounds: 7, instantWin: true });
    });
});

describe('ruleViolations', () => {
    const x01 = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3 };

    it('accepts a game by the rules', () => {
        expect(ruleViolations('x01', rules, x01)).toEqual([]);
    });

    it('refuses a locked rule changed, a choice not offered and a game the club does not play', () => {
        expect(ruleViolations('x01', rules, { ...x01, legOutMode: 'Straight Out' })).toHaveLength(1);
        expect(ruleViolations('x01', rules, { ...x01, startingScore: 701 })).toHaveLength(1);
        expect(ruleViolations('cricket', rules, { variant: 'Standard' })).toEqual(['The club does not play cricket.']);
        expect(ruleViolations('killer', rules, { kind: 'killer', settings: { lives: 3 } })).toHaveLength(1);
    });

    it('holds a handicap to the club\'s policy', () => {
        const handicap = { a: { startingScore: 501 }, b: { startingScore: 301 } };
        expect(ruleViolations('x01', rules, { ...x01, handicap })).toHaveLength(1);
        expect(ruleViolations('x01', { handicap: { mode: 'off' } }, { ...x01, handicap: { a: { startingScore: 501 } } })).toEqual(['The club plays without handicaps.']);
    });

    it('lets a game be friendly only as one of the club\'s friendly formats when the players may not choose', () => {
        expect(ruleViolations('x01', rules, { ...x01, friendly: true })).toHaveLength(1);
        expect(ruleViolations('x01', rules, { ...x01, startingScore: 301, numberOfLegs: 1, friendly: true, format: 'warm-up' })).toEqual([]);
        expect(ruleViolations('x01', rules, { ...x01, startingScore: 301, numberOfLegs: 3, friendly: true, format: 'warm-up' })).toHaveLength(1);
        expect(ruleViolations('x01', {}, { ...x01, friendly: true })).toEqual([]);
    });
});
