import { describe, it, expect } from 'vitest';
import { BADGES, BADGE_CATEGORIES, BADGE_GROUPS, SHAME_BADGES, countBadges, currentWeekStreak, isLast, replayBadges, wonInDecidingLeg } from './badges.js';

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
        // madhouse and bed and breakfast are in the Hall of Shame now
        const shame = (legs) => replayBadges([game(legs)], P).shame.map(e => e.badge);
        expect(shame({ 'leg-1': [v(['S1', '0', 'D1'], 0)] })).toContain('madhouse');
        expect(shame({ 'leg-1': [v(['S5', 'S20', 'S1'], 475)] })).toContain('bedAndBreakfast');
        expect(ids([game({ 'leg-1': [v(['S5', 'S20', 'S1'], 475)] })])).not.toContain('bedAndBreakfast-1');
        // a friendly game is left out of the Hall of Shame
        const friendly = game({ 'leg-1': [v(['S5', 'S20', 'S1'], 475)] });
        expect(replayBadges([{ ...friendly, data: { ...friendly.data, friendly: true } }], P).shame).toEqual([]);
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
        expect(result.metrics).toMatchObject({ winsClock: 1, wins: 1, darts: 30, gameTypesWon: 1 });
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

describe('Hall of Shame', () => {
    const v = (darts, roundScore, scoreLeft, playerId = P) => ({ playerId, darts, roundScore, scoreLeft });
    const x01Game = (legs, { won = false, extra = {}, model = {}, opponentModel = {} } = {}) => {
        const base = x01(won, model, opponentModel);
        return { ...base, data: { ...base.data, club: 'c1', startingScore: 501, legOutMode: 'Double Out', allSetsThrows: { 'set-1': legs }, ...extra } };
    };
    const shameOf = (events) => replayBadges(events, P).shame.map(e => e.badge);

    it('has unique ids, a description and a way to wash each off', () => {
        expect(new Set(SHAME_BADGES.map(b => b.id)).size).toBe(SHAME_BADGES.length);
        for (const badge of SHAME_BADGES) expect(badge.description && badge.wash, badge.id).toBeTruthy();
    });

    it('no longer counts the stored madhouse as a badge', () => {
        expect(countBadges([{ badge: 'madhouse-1' }, { badge: 'games-1' }])).toBe(1);
    });

    it('counts empty visits and three busts in a leg', () => {
        expect(shameOf([x01Game({ 'leg-1': [v(['0', '0', '0'], 0, 501)] })])).toContain('nothingDoing');
        // three misses at the double on 32 left: stuck on the double, not nothing doing
        const onDouble = [v(['T20', 'T20', 'T20'], 180, 321), v(['T20', 'T20', 'T20'], 180, 141), v(['T20', 'T19', 'S12'], 129, 32), v(['0', '0', '0'], 0, 32)];
        expect(shameOf([x01Game({ 'leg-1': onDouble })])).not.toContain('nothingDoing');
        expect(shameOf([x01Game({ 'leg-1': onDouble }, { extra: { legOutMode: 'Straight Out' } })])).toContain('nothingDoing');
        const busts = [v(['T20', 'T20', 'T20'], 180, 321), v(['T20', 'T20', 'T20'], 180, 141), v(['T20', 'T20', 'D10'], 140, 1),
            v(['S20', 'S20', 'S1'], 41, 1), v(['S5', '', ''], 5, 1), v(['D1', '', ''], 2, 1)];
        // 1 left can't be finished: the last three are busts... only those that took nothing off
        expect(shameOf([x01Game({ 'leg-1': busts })])).toContain('bustMaster');
        expect(shameOf([x01Game({ 'leg-1': busts.slice(0, 5) })])).not.toContain('bustMaster');
    });

    it('counts ten darts at a double in a leg, and washes it off with a first-dart checkout', () => {
        const stuck = [v(['T20', 'T20', 'T20'], 180, 321), v(['T20', 'T20', 'T20'], 180, 141), v(['T20', 'T19', 'S4'], 121, 20),
            v(['S10', 'S5', 'S1'], 16, 4), v(['S2', 'S1', 'S1'], 4, 0)];
        // at a double: 20 (1 dart), 10 (1), 4 (1), 2 (1) = 4 darts; not stuck
        expect(shameOf([x01Game({ 'leg-1': stuck })])).not.toContain('stuckOnTheDouble');
        const misses = [v(['T20', 'T20', 'T20'], 180, 321), v(['T20', 'T20', 'T20'], 180, 141), v(['T20', 'T19', 'S4'], 121, 20),
            v(['0', '0', '0'], 0, 20), v(['0', '0', '0'], 0, 20), v(['0', '0', '0'], 0, 20), v(['0', '0', 'D10'], 20, 0)];
        const result = replayBadges([x01Game({ 'leg-1': misses })], P);
        expect(result.shame.map(e => e.badge)).toContain('stuckOnTheDouble');
        expect(result.shame.find(e => e.badge === 'stuckOnTheDouble')).toMatchObject({ club: 'c1', count: 1 });
        const clean = [v(['T20', 'T20', 'T20'], 180, 321), v(['T20', 'T20', 'T20'], 180, 141), v(['T20', 'T19', 'D12'], 141, 0)];
        const later = replayBadges([x01Game({ 'leg-1': misses }), x01Game({ 'leg-1': clean })], P);
        expect(later.washes.map(e => e.badge)).toContain('stuckOnTheDouble');
    });

    it('does not count darts at a double with straight out', () => {
        const misses = [v(['T20', 'T20', 'T20'], 180, 321), v(['T20', 'T20', 'T20'], 180, 141), v(['T20', 'T19', 'S4'], 121, 20),
            v(['0', '0', '0'], 0, 20), v(['0', '0', '0'], 0, 20), v(['0', '0', '0'], 0, 20), v(['0', '0', 'D10'], 20, 0)];
        expect(shameOf([x01Game({ 'leg-1': misses }, { extra: { legOutMode: 'Straight Out' } })])).not.toContain('stuckOnTheDouble');
    });

    it('knows a whitewashed loss and a bottled lead', () => {
        expect(shameOf([x01Game({}, { model: { legsWon: { game: 0 } }, opponentModel: { legsWon: { game: 3 } } })])).toContain('whitewashed');
        expect(shameOf([x01Game({}, { model: { legsWon: { game: 1 } }, opponentModel: { legsWon: { game: 3 } } })])).not.toContain('whitewashed');
        const leg = (winner) => [{ playerId: winner, darts: ['D20'], scoreLeft: 0 }];
        const legs = Object.fromEntries([P, P, O, O, O].map((w, i) => [`leg-${i + 1}`, leg(w)]));
        expect(shameOf([x01Game(legs)])).toContain('bottledIt');
    });

    it('gives the wooden spoon to the only one in last place', () => {
        const three = (models) => ({ players: ['a', 'b', 'c'], playerModels: models });
        expect(isLast('x01', three({ a: { legsWon: { game: 0 } }, b: { legsWon: { game: 1 } }, c: { legsWon: { game: 3 }, hasWonGame: true } }), 'a')).toBe(true);
        expect(isLast('x01', three({ a: { legsWon: { game: 1 } }, b: { legsWon: { game: 1 } }, c: { legsWon: { game: 3 }, hasWonGame: true } }), 'a')).toBe(false);
        expect(isLast('clock', three({ a: { rank: 3 }, b: { rank: 2 }, c: { rank: 1, hasWonGame: true } }), 'a')).toBe(true);
        expect(isLast('x01', { players: ['a', 'b'], playerModels: { a: {}, b: { hasWonGame: true } } }, 'a')).toBe(false);
    });

    it('counts five losses in a row once, and washes them off with two wins in a row', () => {
        const losses = Array.from({ length: 6 }, () => x01(false));
        const { shame } = replayBadges(losses, P);
        expect(shame.filter(e => e.badge === 'coldSpell')).toHaveLength(1);
        const { washes } = replayBadges([...losses, x01(true), x01(false), x01(true), x01(true)], P);
        expect(washes.filter(e => e.badge === 'coldSpell')).toHaveLength(1);
    });

    it('only washes off what is still on the player', () => {
        const ton = () => x01(true, { scoreRanges: { game: { '100-119': 1 } } });
        expect(replayBadges([ton()], P).washes).toEqual([]);
    });
});

describe('the newer games and trainings', () => {
    const T = 'player-3';
    // a game of the rules engine as stored: its visits, and who won
    const rules = (kind, visits, { players = [P, O], winner = null, settings = {}, friendly = false } = {}) => ({
        type: kind, id: `r${clock}`, at: at(),
        data: { kind, players, settings, visits, friendly, playerModels: Object.fromEntries(players.map(id => [id, { hasWonGame: id === winner }])) },
    });
    const training = (kind, score, result = {}, settings = {}) => ({ type: 'rulesTraining', id: `t${clock}`, at: at(), data: { kind, score, result, settings } });
    const shameOf = (events, options) => replayBadges(events, P, options).shame.map(e => e.badge);
    const miss = ['0', '0', '0'];

    it('has a win series for each newer game, and the all-rounder over all nine', () => {
        for (const group of ['shanghaiWins', 'killerWins', 'halveItWins', 'golfWins', 'tacticsWins']) expect(BADGE_GROUPS.some(entry => entry.group === group), group).toBe(true);
        expect(BADGE_GROUPS.some(entry => entry.group === 'rulesWins')).toBe(false);
        expect(BADGES.filter(badge => badge.group === 'allRounder').map(badge => badge.target)).toEqual([3, 6, 9]);
    });

    it('Killer: untouchable, a triple kill, and friendly fire washed off with three lives taken', () => {
        const settings = { lives: 3, numbers: { [P]: 1, [O]: 2 } };
        // P becomes a killer and takes all three lives of O in one visit
        const sweep = rules('killer', [{ player: P, darts: ['D1', 'D2', 'D2'] }, { player: O, darts: miss }, { player: P, darts: ['D2', '0', '0'] }], { winner: P, settings });
        expect(ids([sweep])).toEqual(expect.arrayContaining(['killerWins-1', 'untouchable-1']));
        // the own goal first, then the triple kill that washes it off
        const ownGoal = rules('killer', [{ player: P, darts: ['D1', 'D1', '0'] }, { player: O, darts: miss }, { player: P, darts: ['D2', 'D2', 'D2'] }], { winner: P, settings });
        const triple = rules('killer', [{ player: P, darts: ['D1', '0', '0'] }, { player: O, darts: miss }, { player: P, darts: ['D2', 'D2', 'D2'] }], { winner: P, settings });
        expect(ids([triple])).toContain('tripleKill-1');
        const { shame, washes } = replayBadges([ownGoal, triple], P);
        expect(shame.map(e => e.badge)).toContain('friendlyFire');
        expect(washes.map(e => e.badge)).toContain('friendlyFire');
    });

    it('Killer: out first of three is first blood', () => {
        const settings = { lives: 1, numbers: { [P]: 1, [O]: 2, [T]: 3 } };
        const game = rules('killer', [
            { player: P, darts: miss }, { player: O, darts: ['D2', 'D1', '0'] }, { player: T, darts: ['D3', '0', '0'] },
            { player: O, darts: ['D3', '0', '0'] },
        ], { players: [P, O, T], winner: O, settings });
        expect(shameOf([game])).toContain('firstBlood');
    });

    it('Shanghai: an instant Shanghai, and the one who lost to it is shanghaied', () => {
        const game = rules('shanghai', [{ player: O, darts: ['S1', 'D1', 'T1'] }], { winner: O, settings: { rounds: 7 } });
        expect(shameOf([game])).toContain('shanghaied');
        expect(replayBadges([game], O).earned.map(e => e.badge)).toContain('instantShanghai-1');
    });

    it('Halve-It: never halved, or halved three times', () => {
        const hits = ['20', '16', 'D1', '17', 'T1', '18', null, '19', 'S25'];
        const visit = (target) => target === null ? ['S20', 'S20', 'S1'] : [/^[SDT]/.test(target) ? target : `S${target}`, '0', '0'];
        const clean = rules('halveit', hits.map(target => ({ player: P, darts: visit(target) })), { players: [P], winner: P });
        expect(ids([clean])).toContain('neverHalved-1');
        const poor = rules('halveit', [miss, miss, miss, ...hits.slice(3).map(visit)].map(darts => ({ player: P, darts })), { players: [P], winner: P });
        expect(shameOf([poor])).toContain('halfWit');
    });

    it('Golf: a hole in one, and three missed holes are in the rough', () => {
        const holes = Array.from({ length: 9 }, (_, index) => index + 1);
        const aces = rules('golf', holes.map(hole => ({ player: P, darts: [`D${hole}`] })), { players: [P], winner: P, settings: { holes: 9 } });
        expect(ids([aces])).toContain('holeInOne-1');
        const rough = rules('golf', holes.map(hole => ({ player: P, darts: hole <= 3 ? miss : [`S${hole}`] })), { players: [P], winner: P, settings: { holes: 9 } });
        expect(shameOf([rough])).toContain('inTheRough');
    });

    it('Tactics: a clean sheet, and losing without a number closed is locked out', () => {
        const numbers = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
        const visits = numbers.flatMap(number => [{ player: O, darts: [`T${number}`] }, { player: P, darts: miss }]);
        const game = rules('tactics', [...visits, { player: O, darts: ['D25', 'S25'] }], { winner: O });
        expect(shameOf([game])).toContain('lockedOut');
        expect(replayBadges([game], O).earned.map(e => e.badge)).toContain('cleanSheet-1');
    });

    it('a friendly game brings no shame', () => {
        const game = rules('shanghai', [{ player: O, darts: ['S1', 'D1', 'T1'] }], { winner: O, friendly: true });
        expect(shameOf([game])).not.toContain('shanghaied');
    });

    it('the trainings: random checkouts over ten attempts, scoring, doubles around the board and every kind', () => {
        expect(ids([training('randomcheckouts', 50, { attempts: 10 })])).toEqual(expect.arrayContaining(['randomCheckouts-30', 'randomCheckouts-50']));
        expect(ids([training('randomcheckouts', 80, { attempts: 5 })])).not.toContain('randomCheckouts-30');
        expect(ids([training('scoring', 81.5)])).toEqual(expect.arrayContaining(['scoringTraining-60', 'scoringTraining-80']));
        expect(ids([training('doublesaround', 38)])).toEqual(expect.arrayContaining(['doublesAround-60', 'doublesAround-40']));
        const kinds = ['bobs27', 'checkout121', 'randomcheckouts', 'scoring', 'doublesaround', 'catch40'].map(kind => training(kind, 1));
        expect(ids(kinds)).not.toContain('everyTraining-7');
        expect(ids([...kinds, { type: 'atc', id: 'a1', at: at(), data: { mode: 'Single', scoring: 'Time', timeMs: 60000 } }])).toContain('everyTraining-7');
    });

    it('Bob\'s Bust only while the trainings are shown, washed off by all 21 doubles', () => {
        const bust = training('bobs27', 0, { failed: true, reached: 4 });
        expect(shameOf([bust])).toContain('bobsBust');
        expect(shameOf([bust], { privateTrainings: true })).not.toContain('bobsBust');
        expect(replayBadges([bust, training('bobs27', 120, { failed: false, reached: 21 })], P).washes.map(e => e.badge)).toContain('bobsBust');
    });
});
