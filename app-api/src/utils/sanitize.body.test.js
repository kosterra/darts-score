import { describe, it, expect } from 'vitest';
import { cleanDeep } from './sanitize.body.js';

describe('cleanDeep', () => {
    it('strips angle brackets from free text', () => {
        expect(cleanDeep('<img src=x onerror=alert(1)>')).toBe('img src=x onerror=alert(1)');
        expect(cleanDeep({ name: 'Red <b>Lion</b>' })).toEqual({ name: 'Red bLion/b' });
    });
    it('removes control characters but keeps tab, newline and carriage return', () => {
        expect(cleanDeep('a\u0000b\u0007c')).toBe('abc');
        expect(cleanDeep('line1\nline2\tend')).toBe('line1\nline2\tend');
    });
    it('cleans nested arrays and objects (e.g. club night notes)', () => {
        const body = { nights: [{ day: 'tuesday', note: 'back <room>' }] };
        expect(cleanDeep(body)).toEqual({ nights: [{ day: 'tuesday', note: 'back room' }] });
    });
    it('leaves secrets and auth payloads untouched', () => {
        const body = { email: 'a@b.c', password: 'p<ss>word!', code: '<123>', token: 'a<b', response: { id: 'x<y' } };
        expect(cleanDeep(body)).toEqual({ email: 'a@b.c', password: 'p<ss>word!', code: '<123>', token: 'a<b', response: { id: 'x<y' } });
    });
    it('passes non-string values through unchanged', () => {
        expect(cleanDeep({ n: 5, ok: true, nope: null })).toEqual({ n: 5, ok: true, nope: null });
    });
});
