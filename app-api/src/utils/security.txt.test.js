import { describe, expect, it } from 'vitest';
import { ADVISORY_URL, POLICY_URL, securityTxtOf } from './security.txt.js';

describe('security.txt', () => {
    const now = new Date('2026-10-31T10:00:00.000Z');

    it('names the operator first, then the project, and expires in 90 days', () => {
        const text = securityTxtOf('https://darts.example.ch/', { email: 'ops@example.ch' }, now);
        expect(text.split('\n')).toEqual([
            'Contact: mailto:ops@example.ch',
            `Contact: ${ADVISORY_URL}`,
            'Expires: 2027-01-29T10:00:00.000Z',
            'Preferred-Languages: en, de, fr, it, es',
            'Canonical: https://darts.example.ch/.well-known/security.txt',
            `Policy: ${POLICY_URL}`,
            '',
        ]);
    });

    it('falls back to the project when the operator set no address', () => {
        const text = securityTxtOf('http://localhost:3001', {}, now);
        expect(text).not.toContain('mailto:');
        expect(text.match(/^Contact: /gm)).toHaveLength(1);
        expect(text).toContain('Canonical: http://localhost:3001/.well-known/security.txt');
    });
});
