import { describe, expect, it } from 'vitest';
import {
    PRESETS, advance, bracketMatches, bracketSize, currentRound, drawBracket, maxLegs, presetById, presetRules,
    retract, roundSizes, roundsOfPreset, rulesError, seedOrder,
} from './tournaments';

// a fixed "random" that keeps the order, for draws that can be checked
const noShuffle = () => 0.999;

describe('the bracket of a tournament', () => {
    it('is the next power of two, at least 4, with its rounds from the first to the final', () => {
        expect([4, 5, 8, 9, 16, 17].map(bracketSize)).toEqual([4, 8, 8, 16, 16, 32]);
        expect(roundSizes(16)).toEqual([16, 8, 4, 2]);
    });

    it('places the seeds so the best meet last', () => {
        expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
        expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    });

    it('gives the byes to the first seeds and moves them on at once', () => {
        const ranked = ['a', 'b', 'c', 'd', 'e'];
        const draw = drawBracket(ranked, { random: noShuffle });
        expect(draw.size).toBe(8);
        const matches = bracketMatches(draw);
        const first = matches.filter(match => match.size === 8);
        expect(first.filter(match => match.bye).map(match => match.winner).sort()).toEqual(['a', 'b', 'c']);
        expect(first.filter(match => !match.bye)).toHaveLength(1);
        // the semi-final of the two byes is ready at once
        const semis = matches.filter(match => match.size === 4);
        expect(semis.some(match => match.status === 'ready')).toBe(true);
        expect(currentRound(matches)).toBe(8);
    });

    it('never draws two seeds against each other in the first round', () => {
        for (let run = 0; run < 50; run += 1) {
            const ranked = Array.from({ length: 16 }, (_, index) => `p${index + 1}`);
            const { slots } = drawBracket(ranked);
            const seeds = new Set(['p1', 'p2', 'p3', 'p4']);
            for (let index = 0; index < 16; index += 2) {
                expect(seeds.has(slots[index]) && seeds.has(slots[index + 1])).toBe(false);
            }
        }
    });

    it('moves a winner on, and back out while the next match has not started', () => {
        const matches = bracketMatches(drawBracket(['a', 'b', 'c', 'd'], { random: noShuffle }));
        const byId = new Map(matches.map(match => [match.id, match]));
        const [one, two] = matches.filter(match => match.size === 4);
        one.winner = one.players[0];
        one.status = 'done';
        advance(byId, one);
        expect(byId.get('2-0').players[0]).toBe(one.winner);
        expect(byId.get('2-0').status).toBe('waiting');
        two.winner = two.players[1];
        two.status = 'done';
        advance(byId, two);
        expect(byId.get('2-0').status).toBe('ready');
        expect(retract(byId, two)).toBe(true);
        expect(byId.get('2-0')).toMatchObject({ players: [one.winner, null], status: 'waiting' });
        byId.get('2-0').status = 'running';
        expect(retract(byId, one)).toBe(false);
    });
});

describe('the rules of the rounds', () => {
    it('come from the presets, the final backwards', () => {
        const matchplay = presetById('worldMatchplay');
        expect(presetRules(matchplay, 2)).toMatchObject({ legMode: 'First to', numberOfLegs: 18, numberOfSets: 1 });
        expect(presetRules(matchplay, 32)).toMatchObject({ numberOfLegs: 10 });
        expect(presetRules(matchplay, 64)).toMatchObject({ numberOfLegs: 10 });
        expect(roundsOfPreset('clubClassic', 16).map(round => [round.size, round.rules.numberOfLegs])).toEqual([[16, 5], [8, 7], [4, 9], [2, 11]]);
        expect(presetRules(presetById('worldChampionship'), 2)).toMatchObject({ setMode: 'First to', numberOfSets: 7, legMode: 'Best of', numberOfLegs: 5 });
    });

    it('are all playable', () => {
        for (const preset of PRESETS) for (const rules of preset.rounds) expect(rulesError(rules), preset.id).toBeNull();
    });

    it('refuse what cannot be played', () => {
        const fine = presetRules(presetById('clubNight'), 2);
        expect(rulesError({ ...fine, numberOfLegs: 4 })).toMatch(/even number of legs/);
        expect(rulesError({ ...fine, startingScore: 400 })).toMatch(/starting score/);
        expect(rulesError({ ...fine, legMode: 'First to', numberOfLegs: 4 })).toBeNull();
    });

    it('know how many legs a round lasts at most', () => {
        expect(maxLegs(presetRules(presetById('clubNight'), 8))).toBe(3);
        expect(maxLegs(presetRules(presetById('worldChampionship'), 2))).toBe(65);
    });
});
