import { describe, it, expect } from 'vitest';
import { callsForVisit } from './caller';

const next = (score, extra = {}) => ({ name: 'Anna', score, outMode: 'Double Out', legStarts: false, ...extra });

describe('the caller', () => {
    it('calls the score of a visit, the 180 in words, and no score for a bust', () => {
        expect(callsForVisit({ score: 140 }, next(301))).toEqual(['140']);
        expect(callsForVisit({ score: 180 }, next(321))).toEqual(['One hundred and eighty!']);
        expect(callsForVisit({ score: 0, busted: true }, next(301))).toEqual(['No score']);
        expect(callsForVisit({ score: 0 }, next(301))).toEqual(['No score']);
    });

    it('tells a player on a finish what they require, and not on a bogey number', () => {
        expect(callsForVisit({ score: 60 }, next(32))).toEqual(['60', 'Anna, you require 32']);
        expect(callsForVisit({ score: 60 }, next(169))).toEqual(['60']);
        expect(callsForVisit({ score: 60 }, next(170))).toEqual(['60', 'Anna, you require 170']);
    });

    it('calls game shot with the leg, set or match, and who throws first next', () => {
        expect(callsForVisit({ score: 40, wonLeg: true }, next(501, { legStarts: true }))).toEqual(['Game shot, and the leg!', 'Anna to throw first. Game on!']);
        expect(callsForVisit({ score: 40, wonLeg: true, wonSet: true }, next(501, { legStarts: true }))).toEqual(['Game shot, and the set!', 'Anna to throw first. Game on!']);
        expect(callsForVisit({ score: 40, wonLeg: true, wonMatch: true }, null)).toEqual(['Game shot, and the match!']);
    });
});
