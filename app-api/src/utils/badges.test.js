import { describe, it, expect } from 'vitest';
import { BADGES, BADGE_CATEGORIES, BADGE_GROUPS, currentWeekStreak, replayBadges, wonInDecidingLeg } from './badges.js';

const P = 'player-1';
const O = 'player-2';
let clock = 0;
const at = () => new Date(2026, 0, 1, 0, clock++);

const x01 = (won, model = {}, opponentModel = {}) => ({
    type: 'x01', id: `g${clock}`, at: at(),
    data: { players: [P, O], playerModels: { [P]: { hasWonGame: won, ...model }, [O]: { hasWonGame: !won, ...opponentModel } } },
});
const ids = (events) => replayBadges(events, P).earned.map(e => e.badge);

describe('badge catalogue', () => {
    it('has unique ids', () => {
        expect(new Set(BADGES.map(b => b.id)).size).toBe(BADGES.length);
    });
    it('puts every series in a known category', () => {
        const categories = BADGE_CATEGORIES.map(c => c.category);
        for (const { group, category } of BADGE_GROUPS) expect(categories, group).toContain(category);
    });

    it('has targets that get harder within each group', () => {
        for (const { tiers, lower } of BADGE_GROUPS) {
            const targets = tiers.map(([target]) => target);
            // fewest darts: the next tier needs fewer
            expect(targets).toEqual([...targets].sort((a, b) => lower ? b - a : a - b));
        }
    });

    it('gives every badge a label for its target', () => {
        expect(BADGES.find(b => b.id === 'shortLeg-15').targetLabel).toBe('≤ 15 darts');
        expect(BADGES.find(b => b.id === 'anniversary-730').targetLabel).toBe('2 years');
        expect(BADGES.find(b => b.id === 'darts-100000').targetLabel).toBe('100,000');
    });
});

describe('replayBadges', () => {
    it('awards the first game and first win', () => {
        expect(ids([x01(true)])).toEqual(expect.arrayContaining(['games-1', 'wins-1']));
        expect(ids([x01(false)])).toEqual(['games-1']);
    });

    it('attributes a badge to the game that reached it', () => {
        const games = Array.from({ length: 10 }, () => x01(false));
        const tenth = replayBadges(games, P).earned.find(e => e.badge === 'games-10');
        expect(tenth.sourceId).toBe(games[9].id);
        expect(tenth.earnedAt).toBe(games[9].at);
    });

    it('needs consecutive wins for a streak', () => {
        expect(ids([x01(true), x01(true), x01(false), x01(true)])).not.toContain('streak-3');
        expect(ids([x01(false), x01(true), x01(true), x01(true)])).toContain('streak-3');
    });

    it('does not count solo games as wins', () => {
        const solo = { type: 'x01', id: 'solo', at: at(), data: { players: [P], playerModels: { [P]: { hasWonGame: true } } } };
        expect(ids([solo])).toEqual(['games-1']);
    });

    it('counts 180s, high finishes, the big fish and bull finishes', () => {
        const game = x01(true, {
            scoreRanges: { game: { 180: 1 } },
            checkoutScores: { game: { 170: 1, 40: 2 } },
            checkout: { sections: { 25: { hit: 1 }, 20: { hit: 2 } } },
        });
        expect(ids([game])).toEqual(expect.arrayContaining(['max180-1', 'highFinish-1', 'bigFish-1', 'bullFinish-1']));
        expect(ids([x01(true, { checkoutScores: { game: { 99: 3 } } })])).not.toContain('highFinish-1');
    });

    it('awards a whitewash only for a real match without a lost leg', () => {
        expect(ids([x01(true, { legsWon: { game: 3 } }, { legsWon: { game: 0 } })])).toContain('whitewash-1');
        expect(ids([x01(true, { legsWon: { game: 3 } }, { legsWon: { game: 1 } })])).not.toContain('whitewash-1');
        expect(ids([x01(true, { legsWon: { game: 1 } }, { legsWon: { game: 0 } })])).not.toContain('whitewash-1');
    });

    it('recognises a Shanghai finish only on the checkout visit', () => {
        const legs = (darts, scoreLeft) => ({ 'set-1': { 'leg-1': [{ playerId: P, darts, scoreLeft }] } });
        const game = (sets) => ({ ...x01(true), data: { ...x01(true).data, allSetsThrows: sets } });
        expect(ids([game(legs(['T20', 'S20', 'D20'], 0))])).toContain('shanghai-1');
        expect(ids([game(legs(['S20', 'T20', 'D20'], 40))])).not.toContain('shanghai-1');
        expect(ids([game(legs(['T20', 'T20', 'D20'], 0))])).not.toContain('shanghai-1');
    });

    it('recognises the nine-darter, madhouse and bed and breakfast from the darts', () => {
        const game = (legs, startingScore = 501) => {
            const base = x01(true);
            return { ...base, data: { ...base.data, startingScore, allSetsThrows: { 'set-1': legs } } };
        };
        const v = (darts, scoreLeft, playerId = P) => ({ playerId, darts, scoreLeft });
        const nine = { 'leg-1': [v(['T20', 'T20', 'T20'], 321), v(['S1', 'S1', 'S1'], 498, O), v(['T20', 'T20', 'T20'], 141), v(['S1', 'S1', 'S1'], 495, O), v(['T20', 'T19', 'D12'], 0)] };
        expect(ids([game(nine)])).toContain('nineDarter-1');
        expect(ids([game(nine, 301)])).not.toContain('nineDarter-1');
        expect(ids([game({ 'leg-1': [v(['S1', '0', 'D1'], 0)] })])).toContain('madhouse-1');
        expect(ids([game({ 'leg-1': [v(['S5', 'S20', 'S1'], 475)] })])).toContain('bedAndBreakfast-1');
    });

    it('awards a comeback only after being two legs down', () => {
        const leg = (winner) => [{ playerId: winner, darts: ['D20'], scoreLeft: 0 }];
        const match = (...winners) => {
            const base = x01(true);
            const legs = Object.fromEntries(winners.map((winner, i) => [`leg-${i + 1}`, leg(winner)]));
            return { ...base, data: { ...base.data, allSetsThrows: { 'set-1': legs } } };
        };
        expect(ids([match(O, O, P, P, P)])).toContain('comeback-1');
        expect(ids([match(O, P, O, P, P)])).not.toContain('comeback-1');
    });

    it('counts weekly streaks and knows the current one', () => {
        const day = (iso) => ({ type: 'atc', id: iso, at: new Date(iso), data: { mode: 'Single', timeMs: 100 } });
        // Mondays 2026-01-05, -12, -19 then a gap, then 2026-02-09
        const events = ['2026-01-05', '2026-01-14', '2026-01-19', '2026-01-21', '2026-02-09'].map(day);
        const { metrics } = replayBadges(events, P);
        expect(metrics.bestWeekStreak).toBe(3);
        expect(currentWeekStreak(metrics, new Date('2026-02-12'))).toBe(1);
        expect(currentWeekStreak(metrics, new Date('2026-02-17'))).toBe(1);
        expect(currentWeekStreak(metrics, new Date('2026-02-24'))).toBe(0);
    });

    it('awards three 180s in one game', () => {
        expect(ids([x01(true, { scoreRanges: { game: { 180: 3 } } })])).toContain('maxHatTrick-1');
        expect(ids([x01(true, { scoreRanges: { game: { 180: 2 } } })])).not.toContain('maxHatTrick-1');
    });

    it('ignores the average of very short games', () => {
        const long = { averages: { game: { overall: 85 } }, totalThrow: { game: { rounds: 12 } } };
        const short = { averages: { game: { overall: 150 } }, totalThrow: { game: { rounds: 2 } } };
        expect(ids([x01(true, long)])).toEqual(expect.arrayContaining(['average-60', 'average-80']));
        expect(ids([x01(true, short)])).not.toContain('average-60');
    });

    it('awards the Around the Clock badge for a win and counts its darts', () => {
        const clock = { type: 'clock', id: 'c1', at: at(), data: { players: [P, O], playerModels: { [P]: { hasWonGame: true, darts: 30 } } } };
        const result = replayBadges([clock], P);
        expect(result.metrics).toMatchObject({ winsClock: 1, wins: 1, darts: 30, gameTypesWon: 0 });
        expect(result.earned.map(e => e.badge)).toContain('clockWins-1');
    });

    it('awards the all-rounder after a win in every game type', () => {
        const win = (type) => ({ type, id: `${type}${clock}`, at: at(), data: { players: [P, O], playerModels: { [P]: { hasWonGame: true } } } });
        expect(ids([win('x01'), win('cricket')])).not.toContain('allRounder-3');
        expect(ids([win('x01'), win('cricket'), win('elimination')])).toContain('allRounder-3');
    });

    it('counts trainings and personal records per mode', () => {
        const training = (mode, timeMs) => ({ type: 'atc', id: `t${clock}`, at: at(), data: { mode, timeMs } });
        const result = replayBadges([training('Single', 500), training('Double', 300), training('Single', 450), training('Single', 480)], P);
        expect(result.metrics.trainings).toBe(4);
        expect(result.metrics.trainingRecords).toBe(1);
        expect(result.earned.map(e => e.badge)).toEqual(expect.arrayContaining(['training-1', 'records-1']));
    });

    it('keeps the records of times and of fewest darts apart', () => {
        const training = (data) => ({ type: 'atc', id: `t${clock}`, at: at(), data: { mode: 'Double', ...data } });
        const result = replayBadges([training({ timeMs: 500 }), training({ scoring: 'Darts', darts: 40 }), training({ scoring: 'Darts', darts: 35 }), training({ timeMs: 600 })], P);
        expect(result.metrics.trainings).toBe(4);
        expect(result.metrics.trainingRecords).toBe(1);
        expect(result.metrics.bestTrainingTimes).toEqual({ Double: 500, 'darts:Double': 35 });
    });

    it('counts ton-plus and ton-forty visits from the score ranges', () => {
        const ranges = { '100-119': 4, '120-139': 3, '140-159': 2, '160-179': 0, 180: 1, '80-99': 9 };
        const { metrics } = replayBadges([x01(true, { scoreRanges: { game: ranges } })], P);
        expect(metrics).toMatchObject({ tonPlusVisits: 10, tonFortyVisits: 3 });
        expect(ids([x01(true, { scoreRanges: { game: ranges } })])).toEqual(expect.arrayContaining(['tonPlus-10', 'tonForty-1']));
    });

    describe('visits of an X01 game', () => {
        const v = (darts, roundScore, scoreLeft, playerId = P) => ({ playerId, darts, roundScore, scoreLeft });
        const game = (legs, extra = {}) => {
            const base = x01(true);
            return { ...base, data: { ...base.data, startingScore: 501, allSetsThrows: { 'set-1': legs }, ...extra } };
        };

        it('finds three in a bed, but not in treble 20', () => {
            expect(ids([game({ 'leg-1': [v(['T19', 'T19', 'T19'], 171, 330)] })])).toContain('threeInABed-1');
            expect(ids([game({ 'leg-1': [v(['T20', 'T20', 'T20'], 180, 321)] })])).not.toContain('threeInABed-1');
            expect(ids([game({ 'leg-1': [v(['T19', 'T19', 'S19'], 133, 368)] })])).not.toContain('threeInABed-1');
        });

        it('finds a bag of nuts, but not in a bust', () => {
            expect(ids([game({ 'leg-1': [v(['S15', 'S15', 'S15'], 45, 456)] })])).toContain('bagOfNuts-1');
            // 40 left, 45 thrown: bust, nothing taken off
            const bust = { 'leg-1': [v(['T20', 'T20', 'T20'], 180, 321), v(['T20', 'T20', 'T20'], 180, 141), v(['T20', 'S20', 'S1'], 81, 60), v(['S20', 'S20', 'S5'], 45, 60)] };
            expect(ids([game(bust)])).not.toContain('bagOfNuts-1');
        });

        it('finds a hat trick of bulls', () => {
            expect(ids([game({ 'leg-1': [v(['S25', 'D25', 'D25'], 125, 376)] })])).toContain('bullHatTrick-1');
            expect(ids([game({ 'leg-1': [v(['S25', 'D25', 'S20'], 95, 406)] })])).not.toContain('bullHatTrick-1');
        });

        it('counts double top finishes and keeps the shortest 501 leg', () => {
            const visits = [v(['T20', 'T20', 'T20'], 180, 321), v(['T20', 'T20', 'T20'], 180, 141), v(['T20', 'T19', 'S4'], 121, 20), v(['S0', 'S0', 'D10'], 20, 0)];
            const { metrics } = replayBadges([game({ 'leg-1': visits })], P);
            expect(metrics.bestLegDarts).toBe(12);
            expect(ids([game({ 'leg-1': visits })])).toEqual(expect.arrayContaining(['shortLeg-18', 'shortLeg-15', 'shortLeg-12']));
            const top = [v(['T20', 'T20', 'T20'], 180, 321), v(['T20', 'T20', 'T20'], 180, 141), v(['T20', 'S41', 'D20'], 141, 0)];
            expect(replayBadges([game({ 'leg-1': top })], P).metrics.doubleTops).toBe(1);
        });
    });

    it('knows a win in the deciding leg', () => {
        const leg = (winner) => [{ playerId: winner, darts: ['D20'], scoreLeft: 0 }];
        const match = (sets, format = {}) => ({
            players: [P, O], legMode: 'Best of', numberOfLegs: 5, setMode: 'Best of', numberOfSets: 1, ...format,
            allSetsThrows: Object.fromEntries(sets.map((winners, s) => [`set-${s + 1}`, Object.fromEntries(winners.map((w, i) => [`leg-${i + 1}`, leg(w)]))])),
        });
        expect(wonInDecidingLeg(match([[P, O, P, O, P]]), P)).toBe(true);
        expect(wonInDecidingLeg(match([[P, P, O, P]]), P)).toBe(false);
        expect(wonInDecidingLeg(match([[P]], { numberOfLegs: 1 }), P)).toBe(false);
        // sets: 1–1 in sets and 1–1 in legs of the last set, best of 3 legs per set
        const sets = { numberOfSets: 3, numberOfLegs: 3 };
        expect(wonInDecidingLeg(match([[P, P], [O, O], [P, O, P]], sets), P)).toBe(true);
        expect(wonInDecidingLeg(match([[P, P], [P, O, P]], sets), P)).toBe(false);
    });

    it('finds the white horse and the marks per round in Cricket', () => {
        const cricket = (allThrows, model = {}) => ({
            type: 'cricket', id: `k${clock}`, at: at(),
            data: { players: [P, O], allThrows, playerModels: { [P]: { hasWonGame: true, ...model } } },
        });
        expect(ids([cricket([{ playerId: P, darts: ['T20', 'T19', 'T18'] }])])).toContain('whiteHorse-1');
        expect(ids([cricket([{ playerId: P, darts: ['T20', 'T20', 'T18'] }])])).not.toContain('whiteHorse-1');
        expect(ids([cricket([{ playerId: P, darts: ['S25', 'S25', 'D25'] }])])).toContain('bullHatTrick-1');
        const strong = { hit: { T20: 4, T19: 3, D25: 3, S18: 3 }, totalThrow: { game: { rounds: 6 } } };
        expect(replayBadges([cricket([], strong)], P).metrics.bestMarksPerRound).toBe(5);
        expect(ids([cricket([], { ...strong, totalThrow: { game: { rounds: 3 } } })])).not.toContain('marksPerRound-3');
    });

    it('counts different opponents and the time since the first game', () => {
        const game = (opponent, date) => ({ type: 'x01', id: `r${clock++}`, at: new Date(date), data: { players: [P, opponent], playerModels: { [P]: { hasWonGame: false } } } });
        const events = ['a', 'b', 'a', 'c', 'd', 'e'].map((o, i) => game(o, `2025-0${i + 1}-01`));
        expect(replayBadges(events, P).metrics.opponents).toBe(5);
        expect(ids(events)).toContain('rivals-5');
        expect(ids([game('a', '2025-01-01'), game('a', '2025-12-31')])).not.toContain('anniversary-365');
        expect(ids([game('a', '2025-01-01'), game('a', '2026-01-01')])).toContain('anniversary-365');
    });

    it('counts training days, training weeks, the full set and the fewest darts on singles', () => {
        const training = (date, data = {}) => ({ type: 'atc', id: `d${clock++}`, at: new Date(date), data: { mode: 'Single', timeMs: 100, ...data } });
        const events = [
            training('2026-01-05T18:00Z'), training('2026-01-05T19:00Z', { mode: 'Double' }), training('2026-01-12T18:00Z', { mode: 'Triple' }),
            training('2026-01-19T18:00Z', { mode: 'All' }), training('2026-01-26T18:00Z', { scoring: 'Darts', darts: 38 }),
            training('2026-01-27T18:00Z', { scoring: 'Darts', darts: 52, mode: 'Double' }),
        ];
        const { metrics, earned } = replayBadges(events, P);
        expect(metrics).toMatchObject({ trainingDays: 5, bestTrainingWeekStreak: 4, trainingModes: 4, bestSinglesDarts: 38 });
        const got = earned.map(e => e.badge);
        expect(got).toEqual(expect.arrayContaining(['trainingDays-5', 'trainingStreak-4', 'trainingModes-4', 'trainingDarts-40']));
        expect(got).not.toContain('trainingDarts-30');
    });

    it('replays in time order whatever the input order', () => {
        const first = x01(true); const second = x01(true); const third = x01(true);
        expect(replayBadges([third, first, second], P).earned.find(e => e.badge === 'streak-3').sourceId).toBe(third.id);
    });
});
