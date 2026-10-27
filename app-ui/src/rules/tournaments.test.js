import { describe, expect, it } from 'vitest';
import { GROUP_ROUND, MATCH_ID, PRESETS, advance, bracketMatches, bracketSize, currentRound, drawBracket, drawGroups, groupMatches, groupSetupError, groupSizesOf, groupTable, groupsDone, knockoutDraw, knockoutOfGroups, maxLegs, presetById, presetRules, retract, roundSizes, roundsOfPreset, rulesError, seedOrder, suggestGroups } from './tournaments';

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

describe('groups + knockout', () => {
    const ids = (count) => Array.from({ length: count }, (_, index) => `p${index + 1}`);

    it('splits the players into even groups, the strongest spread in snake order', () => {
        expect(groupSizesOf(16, 4)).toEqual([4, 4, 4, 4]);
        expect(groupSizesOf(10, 4)).toEqual([4, 3, 3]);
        expect(groupSizesOf(5, 6)).toEqual([5]);
        const groups = drawGroups(ids(8), { size: 4 });
        expect(groups).toEqual([['p1', 'p4', 'p5', 'p8'], ['p2', 'p3', 'p6', 'p7']]);
        expect(drawGroups(ids(10), { size: 4 }).map(group => group.length).sort()).toEqual([3, 3, 4]);
    });

    it('checks how many go on and tells the bracket that follows', () => {
        expect(groupSetupError(16, 4, 2)).toBeNull();
        expect(groupSetupError(16, 4, 4)).toMatch(/Fewer players/);
        expect(groupSetupError(10, 4, 3)).toMatch(/Fewer players/);
        expect(groupSetupError(4, 4, 1)).toMatch(/two players/);
        expect(groupSetupError(16, 7, 2)).toMatch(/3 to 6/);
        expect(knockoutOfGroups(16, 4, 2)).toEqual({ qualifiers: 8, size: 8 });
        expect(knockoutOfGroups(12, 4, 2)).toEqual({ qualifiers: 6, size: 8 });
        // one group, the top two: straight into the final
        expect(knockoutOfGroups(6, 6, 2)).toEqual({ qualifiers: 2, size: 2 });
        expect(suggestGroups(16)).toEqual({ size: 4, advance: 2 });
        expect(suggestGroups(5)).toEqual({ size: 5, advance: 2 });
    });

    it('gives every match an id the API takes', () => {
        const ids = [...groupMatches([['a', 'b', 'c']]), ...bracketMatches({ size: 8, slots: Array(8).fill(null) })].map(match => match.id);
        expect(ids.every(id => MATCH_ID.test(id))).toBe(true);
        expect(MATCH_ID.test('8-0; drop')).toBe(false);
    });

    it('lets everyone of a group play everyone else once', () => {
        const matches = groupMatches([['a', 'b', 'c', 'd'], ['e', 'f', 'g']]);
        expect(matches.filter(match => match.group === 0)).toHaveLength(6);
        expect(matches.filter(match => match.group === 1)).toHaveLength(3);
        const pairs = new Set(matches.filter(match => match.group === 0).map(match => [...match.players].sort().join()));
        expect(pairs.size).toBe(6);
        expect(matches.every(match => match.status === 'ready' && match.size === GROUP_ROUND)).toBe(true);
        // nobody plays the first two matches of a group of four
        const [first, second] = matches.filter(match => match.group === 0);
        expect(first.players.some(player => second.players.includes(player))).toBe(false);
    });

    it('ranks a group by points, then leg difference, then the match between two', () => {
        const won = (a, b, legs) => ({ id: `${a}${b}`, group: 0, players: [a, b], winner: a, status: 'done', score: { legs } });
        const matches = [won('a', 'b', [3, 0]), won('b', 'c', [3, 1]), won('c', 'a', [3, 2])];
        // everyone 2 points; a +2, b and c −1 each: c won more legs (4 to 3)
        const table = groupTable(['a', 'b', 'c'], matches);
        expect(table.map(row => row.player)).toEqual(['a', 'c', 'b']);
        expect(table[0]).toMatchObject({ played: 2, won: 1, lost: 1, points: 2, legsFor: 5, legsAgainst: 3 });
        // level on everything: the match between them decides
        const level = groupTable(['x', 'y'], [won('y', 'x', [3, 2]), won('x', 'y', [3, 2])].slice(0, 1));
        expect(level[0].player).toBe('y');
    });

    it('fills the bracket with the best of each group, never against their own group first', () => {
        const groups = [['a1', 'a2', 'a3'], ['b1', 'b2', 'b3'], ['c1', 'c2', 'c3']];
        // the first of each list wins all, the second beats the third
        const matches = groupMatches(groups).map(match => {
            const winner = [...match.players].sort()[0];
            return { ...match, winner, status: 'done', score: { legs: match.players.map(player => (player === winner ? 3 : 1)) } };
        });
        expect(groupsDone(matches)).toBe(true);
        const draw = knockoutDraw(groups, matches, 2);
        expect(draw.size).toBe(8);
        const pairs = [0, 2, 4, 6].map(index => [draw.slots[index], draw.slots[index + 1]]);
        for (const [a, b] of pairs) if (a && b) expect(a[0]).not.toBe(b[0]);
        // the group winners first: two of them get the byes
        expect(pairs.filter(([a, b]) => !a || !b).flat().filter(Boolean).every(player => player.endsWith('1'))).toBe(true);
        expect(currentRound([...matches, { group: undefined, size: 8, status: 'waiting' }])).toBe(8);
        expect(currentRound([{ ...matches[0], status: 'ready' }])).toBe(0);
    });
});
