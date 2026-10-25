import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACCENT, GAME_COLORS, PODIUM } from './palette';

// without the stylesheets the palette has the default dark theme's colours
const themes = fs.readFileSync(path.join(import.meta.dirname, '../theme/base/_theme-vars.scss'), 'utf8');
const dark = themes.slice(themes.indexOf('$theme-dark: ('), themes.indexOf('$theme-black'));
const color = (key) => dark.match(new RegExp(`\\n\\s*${key}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
const tokens = fs.readFileSync(path.join(import.meta.dirname, '../theme/base/_tokens.scss'), 'utf8');
const token = (name) => tokens.match(new RegExp(`\\$${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

describe('the palette', () => {
    it('falls back to the colours of the dark theme', () => {
        expect(ACCENT.gold).toBe(color('accent-gold'));
        expect(ACCENT.amber).toBe(color('accent-amber'));
        expect(ACCENT.pink).toBe(color('accent-pink'));
        expect(ACCENT.blue).toBe(color('accent-blue'));
        expect(ACCENT.red).toBe(color('accent-red'));
        expect(ACCENT.cream).toBe(color('accent-cream'));
        expect(GAME_COLORS.cricket).toBe(color('game-cricket'));
        expect(GAME_COLORS.elimination).toBe(color('game-elimination'));
        expect(GAME_COLORS.clock).toBe(color('game-clock'));
        expect(PODIUM).toEqual([token('podiumGold'), token('podiumSilver'), token('podiumBronze')]);
    });

    it('has the lighter Legmate green as the green of good figures', () => {
        expect(ACCENT.green).toBe(themes.match(/green: \(primary: #[0-9a-f]{6}, dark: #[0-9a-f]{6}, light: #[0-9a-f]{6}, lighter: (#[0-9a-f]{6})/)[1]);
        expect(ACCENT.green).toBe(color('positive'));
        expect(GAME_COLORS.x01).toBe(ACCENT.green);
    });
});
