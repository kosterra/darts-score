import { describe, it, expect } from 'vitest';
import { checkBirthChange, checkClock, checkCricket, checkElimination, checkTraining, checkX01, compact, levelOf, repairX01, usualAverages } from './integrity.js';

const rules = (findings) => findings.map(item => `${item.level}:${item.rule}`);
const v = (playerId, darts, roundScore, scoreLeft) => ({ playerId, darts, roundScore, scoreLeft });
const x01 = (legs, extra = {}) => ({
    _id: 'g1', players: ['a', 'b'], startingScore: 501, legOutMode: 'Double Out',
    createdAt: new Date(2026, 0, 1, 20, 0), updatedAt: new Date(2026, 0, 1, 21, 0),
    allSetsThrows: { 'set-1': Object.fromEntries(legs.map((leg, index) => [`leg-${index + 1}`, leg])) },
    playerModels: { a: { hasWonGame: true }, b: {} },
    ...extra,
});

describe('trainings', () => {
    it('finds an impossible and a world-class time', () => {
        expect(rules(checkTraining({ scoring: 'Time', timeMs: 1500, mode: 'Double', player: { id: 'a' } }))).toEqual(['impossible:tooFast']);
        expect(rules(checkTraining({ scoring: 'Time', timeMs: 4500, mode: 'Double', player: { id: 'a' } }))).toEqual(['suspicious:worldClassTime']);
        expect(checkTraining({ scoring: 'Time', timeMs: 9000, mode: 'Double', player: { id: 'a' } })).toEqual([]);
    });

    it('finds darts that do not add up, a perfect round and a world-class round on doubles', () => {
        expect(rules(checkTraining({ scoring: 'Darts', darts: 18, mode: 'Single' }))).toContain('impossible:tooFewDarts');
        expect(rules(checkTraining({ scoring: 'Darts', darts: 30, dartsPerTarget: Array(21).fill(1), mode: 'Single' }))).toContain('impossible:dartsMismatch');
        expect(rules(checkTraining({ scoring: 'Darts', darts: 21, mode: 'Single' }))).toEqual(['suspicious:perfectRound']);
        expect(rules(checkTraining({ scoring: 'Darts', darts: 33, mode: 'Double' }))).toEqual(['suspicious:hardRing']);
        expect(checkTraining({ scoring: 'Darts', darts: 33, mode: 'Single' })).toEqual([]);
    });

    it('finds a sudden jump of the personal best', () => {
        const history = [12000, 11500, 11800].map(timeMs => ({ timeMs }));
        expect(rules(checkTraining({ scoring: 'Time', timeMs: 6500, mode: 'Single' }, history))).toEqual(['suspicious:bestJump']);
        expect(checkTraining({ scoring: 'Time', timeMs: 10000, mode: 'Single' }, history)).toEqual([]);
        expect(checkTraining({ scoring: 'Time', timeMs: 6500, mode: 'Single' }, history.slice(0, 2))).toEqual([]);
    });
});

describe('X01', () => {
    it('lets a normal leg through', () => {
        const leg = [v('a', ['T20', 'T20', 'S20'], 140, 361), v('b', ['S20', 'S1', 'S5'], 26, 475), v('a', ['T20', 'T19', 'D20'], 157, 204)];
        expect(checkX01(x01([leg]))).toEqual([]);
    });

    it('finds a visit of four darts, a dart off the board, a wrong score and a wrong rest', () => {
        const leg = [v('a', ['T20', 'T20', 'T20', 'T20'], 240, 261), v('b', ['T21', '0', '0'], 63, 438), v('a', ['T20', 'S1', '0'], 100, 161), v('b', ['S20', '0', '0'], 20, 400)];
        expect(rules(checkX01(x01([leg])))).toEqual(expect.arrayContaining(['impossible:tooManyDarts', 'impossible:invalidDart', 'impossible:scoreMismatch', 'error:leftMismatch']));
    });

    it('finds a checkout without a double and a leg won with too few darts', () => {
        const leg = [v('a', ['T20', 'T20', 'T20'], 180, 321), v('a', ['T20', 'T20', 'T20'], 180, 141), v('a', ['T20', 'T19', 'S24'], 141, 0)];
        const found = rules(checkX01(x01([leg])));
        expect(found).toContain('impossible:wrongFinish');
        const short = [v('a', ['T20', 'T20', 'T20'], 180, 121), v('a', ['T20', 'D1'], 62, 0)];
        expect(rules(checkX01(x01([short], { startingScore: 301 })))).toContain('impossible:tooFewDarts');
    });

    it('flags a nine-darter, a professional average and a level far above the usual as suspicious', () => {
        const nine = [v('a', ['T20', 'T20', 'T20'], 180, 321), v('a', ['T20', 'T20', 'T20'], 180, 141), v('a', ['T20', 'T19', 'D12'], 141, 0)];
        const game = x01([nine], { playerModels: { a: { hasWonGame: true, averages: { game: { overall: 105 } }, totalThrow: { game: { rounds: 12 } } }, b: {} } });
        const found = checkX01(game, { usualAverage: () => 55 });
        expect(rules(found)).toEqual(expect.arrayContaining(['suspicious:nineDarter', 'suspicious:highAverage', 'suspicious:aboveUsual']));
        expect(levelOf(found)).toBe('suspicious');
    });

    it('flags an opponent who never scored and a game entered too fast', () => {
        const leg = Array.from({ length: 12 }, (_, index) => [v('a', ['S20', 'S20', 'S1'], 41, 501 - 41 * (index + 1)), v('b', ['0', '0', '0'], 0, 501)]).flat();
        const fast = x01([leg], { updatedAt: new Date(2026, 0, 1, 20, 1) });
        expect(rules(checkX01(fast))).toEqual(expect.arrayContaining(['suspicious:padding', 'suspicious:tooFast']));
    });

    // 94 left, a bust undone: the app gave 94 + 77 back, so 171 − 28 = 143 was saved
    const undone = [
        v('a', ['T20', 'T20', 'T20'], 180, 321), v('b', ['S20'], 20, 481),
        v('a', ['T20', 'T19', 'D20'], 157, 164), v('b', ['S20'], 20, 461),
        v('a', ['T20', 'S10'], 70, 94), v('b', ['S20'], 20, 441),
        v('a', ['S20', 'S4', 'S4'], 28, 143), v('b', ['S20'], 20, 421),
        v('a', ['S20', 'S20', 'S6'], 46, 97), v('b', ['S20'], 20, 401),
        v('a', ['T20', 'D16'], 92, 5), v('b', ['S20'], 20, 381),
        v('a', ['S1', 'D2'], 5, 0),
    ];

    it('takes a score left that does not add up for a data error, with where it happened', () => {
        const found = checkX01(x01([undone]));
        const error = found.find(item => item.rule === 'leftMismatch');
        expect(error).toMatchObject({ level: 'error', playerId: 'a', places: [{ set: 1, leg: 1, visit: 6 }] });
        expect(error.detail).toBe('94 − 28 leaves 66, 143 was saved in leg 1');
        expect(levelOf(found)).toBe('error');
        expect(levelOf([...found, { level: 'impossible' }])).toBe('impossible');
    });

    it('repairs the scores left from the darts when the leg still ends the same way', () => {
        // with 66 left after the 28: 66 − 46 = 20, 20 − 92 is a bust, 20 − 5 = 15: no finish
        expect(repairX01(x01([undone]))).toEqual({ possible: false, reason: 'The darts do not finish set 1, leg 1' });

        const fixable = [
            v('a', ['T20', 'T20', 'T20'], 180, 321), v('b', ['S20'], 20, 481),
            v('a', ['T20', 'T20', 'T20'], 180, 141), v('b', ['S20'], 20, 461),
            // a bust (141 − 180), undone: 321 was saved
            v('a', ['T20', 'T20', 'T20'], 180, 141), v('b', ['S20'], 20, 441),
            v('a', ['S20', 'S20', 'S1'], 41, 280), v('b', ['S20'], 20, 421),
            v('a', ['T20', 'D20'], 100, 0),
        ];
        // left: 141 → bust → 141 → 100 → 0 with T20 D20
        const repaired = repairX01(x01([fixable]));
        expect(repaired).toMatchObject({ possible: true, changed: 1 });
        expect(repaired.allSetsThrows['set-1']['leg-1'].map(visit => visit.scoreLeft).filter((_, index) => index % 2 === 0)).toEqual([321, 141, 141, 100, 0]);
        expect(checkX01(x01([repaired.allSetsThrows['set-1']['leg-1']])).filter(item => item.rule === 'leftMismatch')).toEqual([]);
    });

    it('does not repair when a leg would end earlier', () => {
        // 121 − 121 checks out with D2 already, but 40 was saved and D20 finished later
        const early = [v('a', ['T20', 'T20', 'T20'], 180, 121), v('a', ['T20', 'T19', 'D2'], 121, 40), v('a', ['D20'], 40, 0)];
        expect(repairX01(x01([early], { startingScore: 301 }))).toEqual({ possible: false, reason: 'Set 1, leg 1 would have ended earlier' });
    });

    it('takes the usual average from the other games only', () => {
        const games = Array.from({ length: 6 }, (_, index) => ({ _id: `g${index}`, players: ['a'], playerModels: { a: { averages: { game: { overall: 50 + index } }, totalThrow: { game: { rounds: 10 } } } } }));
        expect(usualAverages(games)('g0')('a')).toBe(53);
        expect(usualAverages(games.slice(0, 5))('g0')('a')).toBeNull();
    });
});

describe('other games', () => {
    it('finds professional marks in Cricket', () => {
        const game = { players: ['a', 'b'], allThrows: [], playerModels: { a: { hit: { T20: 6, T19: 6, T18: 6 }, totalThrow: { game: { rounds: 6 } } }, b: {} } };
        expect(rules(checkCricket(game))).toEqual(['suspicious:highMarks']);
    });

    it('finds a score above the darts in Elimination, but not in a bust', () => {
        const game = { players: ['a', 'b'], allThrows: [{ playerId: 'a', darts: ['S20', '0', '0'], roundScore: 60 }, { playerId: 'b', darts: ['T20', 'T20', 'T20'], roundScore: 0, bust: true }], playerModels: {} };
        expect(rules(checkElimination(game))).toEqual(['impossible:scoreMismatch']);
    });

    it('finds darts that cannot be entered in Around the Clock', () => {
        expect(rules(checkClock({ mode: 'Single', throws: [1, 0, 3], players: [], playerModels: {} }))).toEqual(['impossible:invalidDart']);
        expect(checkClock({ mode: 'All', skipAhead: true, throws: [1, 0, 3], players: [], playerModels: {} })).toEqual([]);
    });

    it('merges the same finding of a player', () => {
        const merged = compact([
            { level: 'suspicious', rule: 'nineDarter', detail: 'leg 1', playerId: 'a', places: [{ set: 1, leg: 1, visit: 8 }] },
            { level: 'suspicious', rule: 'nineDarter', detail: 'leg 2', playerId: 'a', places: [{ set: 1, leg: 2, visit: 8 }] },
        ]);
        expect(merged).toEqual([{ level: 'suspicious', rule: 'nineDarter', detail: '2× · leg 1', playerId: 'a', places: [{ set: 1, leg: 1, visit: 8 }, { set: 1, leg: 2, visit: 8 }] }]);
    });
});

describe('own date of birth', () => {
    it('flags a player who made themselves younger, with the games that changed sides', () => {
        const change = { from: new Date(1990, 0, 1), to: new Date(1994, 0, 1) };
        // turned 16 in 2006 by the old date, in 2010 by the new one: games of 2007 and 2009 change sides
        const gameDates = [new Date(2005, 5, 1), new Date(2007, 5, 1), new Date(2009, 5, 1), new Date(2012, 5, 1)];
        const [found] = checkBirthChange(change, { minAge: 16, gameDates });
        expect(found).toMatchObject({ level: 'suspicious', rule: 'birthLater' });
        expect(found.detail).toBe('date of birth moved from 01.01.1990 to 01.01.1994 (4 years younger) by the player: 2 games now count as played under 16');
    });

    it('lets small corrections and older dates through', () => {
        expect(checkBirthChange({ from: new Date(1990, 0, 1), to: new Date(1990, 0, 20) })).toEqual([]);
        expect(checkBirthChange({ from: new Date(1990, 0, 1), to: new Date(1985, 0, 1) })).toEqual([]);
    });
});

describe('the newer games and trainings', () => {
    const golf = (darts, playerModels) => ({
        kind: 'golf', players: ['a'], settings: { holes: 9 },
        visits: Array.from({ length: 9 }, (_, index) => ({ player: 'a', darts: [darts(index + 1)] })),
        playerModels, createdAt: new Date(2026, 0, 1, 18), updatedAt: new Date(2026, 0, 1, 19),
    });

    it('a stored result that is not what the darts give is impossible', async () => {
        const { checkRulesGame } = await import('./integrity.js');
        const honest = golf((hole) => `S${hole}`, { a: { hasWonGame: true, score: 27 } });
        expect(checkRulesGame(honest).map(item => item.rule)).not.toContain('resultMismatch');
        const forged = golf((hole) => `S${hole}`, { a: { hasWonGame: true, score: 9 } });
        expect(checkRulesGame(forged).find(item => item.rule === 'resultMismatch')?.level).toBe('impossible');
    });

    it('a dart that is not on the board, and the play of a professional', async () => {
        const { checkRulesGame } = await import('./integrity.js');
        const wrong = golf((hole) => (hole === 3 ? 'T25' : `S${hole}`), { a: { hasWonGame: true, score: 27 } });
        expect(checkRulesGame(wrong).map(item => item.rule)).toContain('invalidDart');
        const aces = golf((hole) => `D${hole}`, { a: { hasWonGame: true, score: 9 } });
        expect(checkRulesGame(aces).map(item => item.rule)).toContain('proPlay');
    });

    it('an opponent who only missed', async () => {
        const { checkRulesGame } = await import('./integrity.js');
        const visits = Array.from({ length: 24 }, (_, index) => ({ player: index % 2 ? 'b' : 'a', darts: index % 2 ? ['0', '0', '0'] : ['S20', 'S1', 'S5'] }));
        const game = { kind: 'tactics', players: ['a', 'b'], settings: {}, visits, playerModels: { a: { hasWonGame: true }, b: {} }, createdAt: new Date(2026, 0, 1, 18), updatedAt: new Date(2026, 0, 1, 19) };
        expect(checkRulesGame(game).map(item => item.rule)).toContain('padding');
    });

    it('a training\'s score from its darts, played very fast, out of reach and a sudden jump', async () => {
        const { checkRulesTraining } = await import('./integrity.js');
        const darts = Array(63).fill('H');
        const entry = { kind: 'bobs27', score: 1437, darts, player: { id: 'a' }, createdAt: new Date(2026, 0, 1, 18, 0, 20), startedAt: new Date(2026, 0, 1, 18) };
        const rules = checkRulesTraining(entry, [{ score: 100 }, { score: 120 }, { score: 90 }]).map(item => item.rule);
        expect(rules).toEqual(expect.arrayContaining(['tooFast', 'proPlay', 'bestJump']));
        expect(rules).not.toContain('scoreMismatch');
        expect(checkRulesTraining({ ...entry, score: 2000, startedAt: null }).map(item => item.rule)).toContain('scoreMismatch');
    });
});

describe('patterns over many games', () => {
    let minute = 0;
    const game = (players, winner, extra = {}) => ({ type: 'x01', id: `g${minute}`, at: new Date(2026, 0, 5, 18, minute++), players, winners: winner ? [winner] : [], friendly: false, darts: 120, ...extra });

    it('own players, rating farming, tiny games and deleting losses', async () => {
        const { patternFindings } = await import('./integrity.js');
        const games = [
            game(['a', 'b'], 'a'),
            ...Array.from({ length: 5 }, () => game(['c', 'g'], 'c')),
            ...Array.from({ length: 10 }, () => game(['d', 'e'], 'd', { darts: 20 })),
            game(['f', 'a'], 'a'), game(['f', 'a'], 'a'), game(['f', 'a'], 'a'),
        ];
        const owners = new Map([['a', 'user1'], ['b', 'user1'], ['f', 'user2']]);
        const requests = games.slice(-3).map(entry => ({ gameId: entry.id, playerId: 'f', lost: true, at: entry.at }));
        const found = patternFindings({ games, owners, guests: new Set(['g']), requests });
        const rules = [...found.values()].flat().map(item => item.rule);
        expect(rules).toEqual(expect.arrayContaining(['ownPlayers', 'ratingFarming', 'tinyBurst', 'deletesLosses']));
    });
});
