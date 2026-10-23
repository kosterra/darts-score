import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACCENT, GAME_COLORS, PODIUM } from './palette';

// the palette of JavaScript and the tokens of the stylesheets are the same colours
const tokens = fs.readFileSync(path.join(import.meta.dirname, '../theme/base/_tokens.scss'), 'utf8');
const token = (name) => tokens.match(new RegExp(`\\$${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

describe('the palette', () => {
    it('has the colours of the tokens', () => {
        expect(ACCENT.gold).toBe(token('accentGold'));
        expect(ACCENT.amber).toBe(token('accentAmber'));
        expect(ACCENT.pink).toBe(token('accentPink'));
        expect(ACCENT.blue).toBe(token('accentBlue'));
        expect(ACCENT.red).toBe(token('accentRed'));
        expect(ACCENT.cream).toBe(token('accentCream'));
        expect(PODIUM).toEqual([token('podiumGold'), token('podiumSilver'), token('podiumBronze')]);
        expect(GAME_COLORS.cricket).toBe(token('gameColorCricket'));
        expect(GAME_COLORS.elimination).toBe(token('gameColorElimination'));
        expect(GAME_COLORS.clock).toBe(token('gameColorClock'));
    });

    it('has the theme\'s lighter green as the accent green', () => {
        const theme = fs.readFileSync(path.join(import.meta.dirname, '../theme/dark/green/theme.scss'), 'utf8');
        expect(ACCENT.green).toBe(theme.match(/\$primaryLighterColor:\s*(#[0-9a-fA-F]{6})/)[1]);
    });
});
