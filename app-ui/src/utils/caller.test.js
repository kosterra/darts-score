import { describe, it, expect } from 'vitest';
import { callsForVisit, voiceFor } from './caller';

const next = (score, extra = {}) => ({ name: 'Anna', score, outMode: 'Double Out', legStarts: false, ...extra });
const texts = (calls) => calls.map(entry => entry.text);
const moods = (calls) => calls.map(entry => entry.mood);

describe('the caller', () => {
    it('calls the score of a visit, and no score for a bust', () => {
        expect(texts(callsForVisit({ score: 60 }, next(301)))).toEqual(['60']);
        expect(texts(callsForVisit({ score: 0, busted: true }, next(301)))).toEqual(['No score']);
        expect(texts(callsForVisit({ score: 0 }, next(301)))).toEqual(['No score']);
    });

    it('calls a ton and more with emphasis, louder from 140, and a low score flat', () => {
        expect(callsForVisit({ score: 100 }, next(401))).toEqual([{ text: '100!', mood: 'ton' }]);
        expect(callsForVisit({ score: 140 }, next(361))).toEqual([{ text: '140!', mood: 'bigTon' }]);
        expect(callsForVisit({ score: 7 }, next(494))).toEqual([{ text: '7', mood: 'flat' }]);
    });

    it('draws the 180 out, in three parts building to the peak', () => {
        const calls = callsForVisit({ score: 180 }, next(321));
        expect(texts(calls)).toEqual(['One hundred', 'and', 'eighty!']);
        expect(moods(calls)).toEqual(['oneEightyBuild', 'oneEightyAnd', 'oneEightyPeak']);
    });

    it('tells a player on a finish what they require, and not on a bogey number', () => {
        expect(texts(callsForVisit({ score: 60 }, next(32)))).toEqual(['60', 'Anna, you require 32']);
        expect(texts(callsForVisit({ score: 60 }, next(169)))).toEqual(['60']);
        expect(texts(callsForVisit({ score: 60 }, next(170)))).toEqual(['60', 'Anna, you require 170']);
    });

    it('calls game shot with the leg, set or match, the bigger the livelier, and who throws first next', () => {
        expect(texts(callsForVisit({ score: 40, wonLeg: true }, next(501, { legStarts: true })))).toEqual(['Game shot, and the leg!', 'Anna to throw first. Game on!']);
        expect(texts(callsForVisit({ score: 40, wonLeg: true, wonSet: true }, next(501, { legStarts: true })))).toEqual(['Game shot, and the set!', 'Anna to throw first. Game on!']);
        expect(callsForVisit({ score: 40, wonLeg: true, wonMatch: true }, null)).toEqual([{ text: 'Game shot, and the match!', mood: 'bigTon' }]);
    });

    it('picks a male voice of the language first, as the callers on the stage', () => {
        const voices = [
            { name: 'Google UK English Female', lang: 'en-GB' },
            { name: 'Google UK English Male', lang: 'en-GB' },
            { name: 'Paulina', lang: 'es-MX' },
            { name: 'Microsoft Jan - German (Switzerland)', lang: 'de-CH' },
            { name: 'Anna', lang: 'de-DE' },
        ];
        expect(voiceFor(voices, 'en-GB').name).toBe('Google UK English Male');
        expect(voiceFor(voices, 'de-DE').name).toBe('Microsoft Jan - German (Switzerland)');
        expect(voiceFor(voices, 'es-ES').name).toBe('Paulina');
        expect(voiceFor(voices, 'it-IT')).toBeNull();
    });

    it('picks a female voice of the language when the player asks for one', () => {
        const voices = [
            { name: 'Google UK English Male', lang: 'en-GB' },
            { name: 'Google UK English Female', lang: 'en-GB' },
            { name: 'Microsoft Jan - German (Switzerland)', lang: 'de-CH' },
        ];
        expect(voiceFor(voices, 'en-GB', 'female').name).toBe('Google UK English Female');
        // none of the kind: the voice of the language there is
        expect(voiceFor(voices, 'de-CH', 'female').name).toBe('Microsoft Jan - German (Switzerland)');
    });
});
