import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { appearanceOf } from '../rules/club.rules';

// the themes and accent colours as the stylesheet defines them
const source = fs.readFileSync(path.join(import.meta.dirname, '../theme/base/_theme-vars.scss'), 'utf8');
const colorsOf = (block) => Object.fromEntries([...block.matchAll(/\n\s*([a-z0-9-]+):\s*(#[0-9a-f]{3,6})\b/gi)].map(([, key, value]) => [key, value]));
const blockOf = (name) => {
    const start = source.indexOf(`$theme-${name}:`);
    return source.slice(start, source.indexOf(');', start));
};
const dark = colorsOf(blockOf('dark'));
const THEMES = {
    dark,
    black: { ...dark, ...colorsOf(blockOf('black')) },
    contrast: { ...dark, ...colorsOf(blockOf('contrast')) },
    light: colorsOf(blockOf('light')),
};
const ACCENTS = Object.fromEntries([...source.matchAll(/\n\s*'?(\w+)'?: \(primary: (#\w+), dark: (#\w+), light: (#\w+), lighter: (#\w+), lightest: (#\w+)\)/g)]
    .map(([, name, primary, darkShade, light, lighter, lightest]) => [name, { primary, dark: darkShade, light, lighter, lightest }]));

// WCAG relative luminance and contrast ratio
const luminance = (hex) => {
    const full = hex.length === 4 ? `#${[...hex.slice(1)].map(char => char + char).join('')}` : hex;
    const [r, g, b] = [1, 3, 5].map(index => parseInt(full.slice(index, index + 2), 16) / 255)
        .map(channel => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
    const [light, darkOne] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (darkOne + 0.05);
};

describe('the themes', () => {
    it('are all there, with the five accent colours', () => {
        expect(Object.keys(THEMES)).toEqual(['dark', 'black', 'contrast', 'light']);
        expect(Object.keys(ACCENTS)).toEqual(['green', 'red', 'blue', 'gold', 'purple']);
    });

    for (const [name, theme] of Object.entries(THEMES)) {
        it(`keep the text readable on every surface: ${name}`, () => {
            // text (100) and subtle text (300) on the panels (800), raised boxes (700) and the
            // highest surface (650, hovers and highlighted rows); faint text and good figures on
            // the panels and raised boxes
            const pairs = [
                ...['shade-100', 'shade-300'].flatMap(text => ['shade-800', 'shade-700', 'shade-650'].map(surface => [text, surface])),
                ...['text-faint', 'positive'].flatMap(text => ['shade-800', 'shade-700'].map(surface => [text, surface])),
            ];
            for (const [text, surface] of pairs) {
                expect(contrast(theme[text], theme[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
            }
        });
    }

    for (const [name, accent] of Object.entries(ACCENTS)) {
        it(`have filled buttons and accent text that read: ${name}`, () => {
            // the light text of the buttons on the filled button
            expect(contrast('#f7f2f2', accent.dark), 'button text').toBeGreaterThanOrEqual(4.5);
            // accent text (lighter on dark themes, the dark shade on the light one) on the panels
            expect(contrast(accent.lighter, THEMES.dark['shade-800']), 'on dark').toBeGreaterThanOrEqual(4.5);
            expect(contrast(accent.dark, THEMES.light['shade-800']), 'on light').toBeGreaterThanOrEqual(4.5);
        });
    }
});

describe('the look of an account', () => {
    it('takes known choices only, with the usual look by default', () => {
        expect(appearanceOf(undefined)).toEqual({ theme: 'dark', accent: null, background: 'photo' });
        expect(appearanceOf({ theme: 'light', accent: 'red', background: 'plain' })).toEqual({ theme: 'light', accent: 'red', background: 'plain' });
        expect(appearanceOf({ theme: 'neon', accent: 'pink', background: 'video' })).toEqual({ theme: 'dark', accent: null, background: 'photo' });
    });
});
