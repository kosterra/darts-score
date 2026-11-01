import { describe, it, expect } from 'vitest';
import { CLIPS, callsForVisit, voiceFor } from './caller';

const next = (score, extra = {}) => ({ name: 'Anna', score, outMode: 'Double Out', legStarts: false, ...extra });
const texts = (calls) => calls.map(entry => entry.text);
const moods = (calls) => calls.map(entry => entry.mood);
const clips = (calls) => calls.map(entry => entry.clip);

describe('the caller', () => {
    it('calls the score of a visit, and no score for a bust', () => {
        expect(texts(callsForVisit({ score: 60 }, next(301)))).toEqual(['60']);
        expect(texts(callsForVisit({ score: 0, busted: true }, next(301)))).toEqual(['No score']);
        expect(texts(callsForVisit({ score: 0 }, next(301)))).toEqual(['No score']);
    });

    it('calls a ton and more with emphasis, louder from 140, and a low score flat', () => {
        expect(callsForVisit({ score: 100 }, next(401))).toEqual([{ text: '100!', mood: 'ton', clip: 'score-100' }]);
        expect(callsForVisit({ score: 140 }, next(361))).toEqual([{ text: '140!', mood: 'bigTon', clip: 'score-140' }]);
        expect(callsForVisit({ score: 7 }, next(494))).toEqual([{ text: '7', mood: 'flat', clip: 'score-7' }]);
    });

    it('draws the 180 out: its own file, or the device in three parts building to the peak', () => {
        const [oneEighty] = callsForVisit({ score: 180 }, next(321));
        expect(oneEighty.clip).toBe('score-180');
        expect(texts(oneEighty.parts)).toEqual(['One hundred', 'and', 'eighty!']);
        expect(moods(oneEighty.parts)).toEqual(['oneEightyBuild', 'oneEightyAnd', 'oneEightyPeak']);
    });

    it('takes the files of the caller, with the name said before by the device', () => {
        expect(clips(callsForVisit({ score: 0, busted: true }, next(301)))).toEqual(['no-score']);
        const calls = callsForVisit({ score: 40, wonLeg: true }, next(32, { legStarts: true }));
        expect(clips(calls)).toEqual(['game-shot-leg', 'to-throw-first', 'require-32']);
        expect(calls.map(entry => entry.name)).toEqual([undefined, 'Anna', 'Anna']);
        expect(clips(callsForVisit({ score: 40, wonLeg: true, wonSet: true, wonMatch: true }, null))).toEqual(['game-shot-match']);
        // a score three darts cannot make has no file: the device says it
        expect(clips(callsForVisit({ score: 179 }, next(301)))).toEqual([null]);
    });

    it('has a file for every score three darts make, and every finish', () => {
        expect(CLIPS).toContain('score-1');
        expect(CLIPS).toContain('score-177');
        expect(CLIPS).not.toContain('score-179');
        expect(CLIPS).toContain('require-170');
        expect(new Set(CLIPS).size).toBe(CLIPS.length);
    });

    it('tells a player on a finish what they require, and not on a bogey number', () => {
        expect(texts(callsForVisit({ score: 60 }, next(32)))).toEqual(['60', 'Anna, you require 32']);
        expect(texts(callsForVisit({ score: 60 }, next(169)))).toEqual(['60']);
        expect(texts(callsForVisit({ score: 60 }, next(170)))).toEqual(['60', 'Anna, you require 170']);
    });

    it('calls game shot with the leg, set or match, the bigger the livelier, and who throws first next', () => {
        expect(texts(callsForVisit({ score: 40, wonLeg: true }, next(501, { legStarts: true })))).toEqual(['Game shot, and the leg!', 'Anna to throw first. Game on!']);
        expect(texts(callsForVisit({ score: 40, wonLeg: true, wonSet: true }, next(501, { legStarts: true })))).toEqual(['Game shot, and the set!', 'Anna to throw first. Game on!']);
        expect(callsForVisit({ score: 40, wonLeg: true, wonMatch: true }, null)).toEqual([{ text: 'Game shot, and the match!', mood: 'bigTon', clip: 'game-shot-match' }]);
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
