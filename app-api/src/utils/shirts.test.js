import { describe, it, expect } from 'vitest';
import { PRO_LEVEL, SHIRT_DEFAULTS, reachedLevel, shirtCheck, shirtOf, shirtStanding } from './shirts.js';

const LEVELS = ['Rookie', 'Pub Player', 'Club Regular', 'League Player', 'County Player', 'Pro', 'World Class', 'Legend'].map(name => ({ name }));

describe('the shirts', () => {
    it('are the club\'s below Pro, whatever was chosen', () => {
        expect(shirtOf({ notifiedLevel: 5, shirt: { design: 'flames' } }).design).toBe('club');
        expect(shirtOf({}).design).toBe('club');
        expect(shirtOf({}).color).toBe(SHIRT_DEFAULTS.color);
    });

    it('stay once a level opened them, also when the level went down again', () => {
        const player = { bestLevel: PRO_LEVEL, notifiedLevel: 4, shirt: { design: 'flames', color: '#0090ff', accent: '#ffc53d' } };
        expect(shirtOf(player)).toEqual({ design: 'flames', color: '#0090ff', accent: '#ffc53d' });
        expect(reachedLevel(player, 3)).toBe(PRO_LEVEL);
    });

    it('open more designs with World Class and Legend', () => {
        const standing = shirtStanding({}, { current: 7, levels: LEVELS });
        const owned = (id) => standing.designs.find(design => design.id === id).owned;
        expect(owned('flames')).toBe(true);
        expect(owned('splash')).toBe(true);
        expect(owned('goldTrim')).toBe(false);
        expect(standing.designs.find(design => design.id === 'goldTrim').levelName).toBe('Legend');
    });

    it('are chosen only as the level allows, in the colours of the list', () => {
        expect(shirtCheck({}, { design: 'flames' }, 5)).toMatchObject({ ok: false });
        expect(shirtCheck({}, { design: 'flames', color: '#123456' }, 6)).toMatchObject({ ok: false });
        expect(shirtCheck({}, { design: 'nonsense' }, 8)).toMatchObject({ ok: false });
        expect(shirtCheck({ shirt: { design: 'club' } }, { design: 'laurel', color: '#e5484d' }, 8))
            .toEqual({ ok: true, shirt: { design: 'laurel', color: '#e5484d', accent: SHIRT_DEFAULTS.accent } });
        // a player who never chose: the colours start from the defaults
        expect(shirtCheck({ shirt: { design: 'club', color: null, accent: null } }, { design: 'waves' }, 6))
            .toEqual({ ok: true, shirt: { design: 'waves', color: SHIRT_DEFAULTS.color, accent: SHIRT_DEFAULTS.accent } });
        // the club shirt is always there
        expect(shirtCheck({ shirt: { design: 'flames' } }, { design: 'club' }, 1)).toMatchObject({ ok: true });
    });
});

describe('the club shirt', async () => {
    const { CLUB_SHIRT_DEFAULTS, SHIRT_COLORS, clubShirtCheck, clubShirtOf } = await import('./shirts.js');

    it('takes a pattern, the colours of the palette and the logo', () => {
        expect(clubShirtCheck({ pattern: 'hoops', color: SHIRT_COLORS[0], accent: SHIRT_COLORS[1], logo: true })).toEqual({ shirt: { pattern: 'hoops', color: SHIRT_COLORS[0], accent: SHIRT_COLORS[1], logo: true } });
        expect(clubShirtCheck({})).toEqual({ shirt: { pattern: 'plain', color: null, accent: CLUB_SHIRT_DEFAULTS.accent, logo: false } });
        expect(clubShirtCheck({ pattern: 'polkadots' }).error).toBeTruthy();
        expect(clubShirtCheck({ color: '#123456' }).error).toBeTruthy();
    });

    it('falls back to the defaults for a club that chose none', () => {
        expect(clubShirtOf({})).toEqual(CLUB_SHIRT_DEFAULTS);
        expect(clubShirtOf({ shirt: { pattern: 'sash' } }).pattern).toBe('sash');
    });
});
