import { describe, expect, it } from 'vitest';
import { afterDart, isCheckout, isValidDart, parseDart } from './darts';
import { progressOf, replayGame, replayTraining, withGameState } from './engine';
import { GAMES, GOLF, HALVE_IT, KILLER, SHANGHAI, TACTICS } from './games';
import { BOBS_27, bobsProgress, CATCH_40, CHECKOUT_121, DOUBLES_AROUND, RANDOM_CHECKOUTS, SCORING, TRAININGS } from './trainings';

const visit = (player, ...darts) => ({ player, darts });
const game = (definition, visits, settings = {}, players = ['a', 'b']) => ({ players, settings, visits });

describe('darts', () => {
    it('reads the darts of the board and the keypad', () => {
        expect(parseDart('T20')).toMatchObject({ ring: 'T', number: 20, points: 60 });
        expect(parseDart('D25')).toMatchObject({ ring: 'D', number: 25, points: 50 });
        expect(parseDart('20')).toMatchObject({ field: 'S20', points: 20 });
        expect(parseDart('0').points).toBe(0);
        expect(parseDart('T25').points).toBe(0);
        expect(isValidDart('S25')).toBe(true);
        expect(isValidDart('T21')).toBe(false);
    });

    it('checks out with a double only', () => {
        expect(afterDart(40, parseDart('D20'))).toEqual({ left: 0, bust: false, out: true });
        expect(afterDart(40, parseDart('S20'))).toEqual({ left: 20, bust: false, out: false });
        expect(afterDart(20, parseDart('S20')).bust).toBe(true);
        expect(afterDart(21, parseDart('S20')).bust).toBe(true);
        expect(isCheckout(170)).toBe(true);
        expect(isCheckout(169)).toBe(false);
    });
});

describe('the engine', () => {
    it('takes turns, counts rounds and goes back by replaying', () => {
        const visits = [visit('a', 'S1', '0', '0'), visit('b', 'D1', '0', '0'), visit('a', 'T2', '0', '0')];
        const result = replayGame(SHANGHAI, game(SHANGHAI, visits));
        expect(result.round).toBe(2);
        expect(result.current).toBe('b');
        expect(result.state.players.a.points).toBe(1 + 6);
        // undo is the same game without its last visit
        expect(replayGame(SHANGHAI, game(SHANGHAI, visits.slice(0, -1))).current).toBe('a');
    });

    it('keeps for the API whose turn it is, whether it is over and the places', () => {
        const visits = [visit('a', 'S1', 'D1', 'T1'), visit('b', '0', '0', '0')];
        const saved = withGameState(SHANGHAI, game(SHANGHAI, visits));
        expect(saved.hasWinner).toBe(true);
        expect(saved.playerModels.a).toMatchObject({ rank: 1, hasWonGame: true, darts: 3 });
        expect(saved.playerModels.b.hasWonGame).toBe(false);
    });

    it('follows every player visit by visit for the chart', () => {
        const visits = [visit('a', 'S1', '0', '0'), visit('b', 'D1', '0', '0'), visit('a', 'T2', '0', '0')];
        expect(progressOf(SHANGHAI, game(SHANGHAI, visits))).toEqual([
            { round: 0, a: 0, b: 0 },
            { round: 1, a: 1, b: 2 },
            { round: 2, a: 7, b: 2 },
        ]);
    });

    it('has every game and training complete', () => {
        for (const definition of [...GAMES, ...TRAININGS]) {
            expect(definition.title, definition.id).toBeTruthy();
            expect(definition.rules.length, definition.id).toBeGreaterThan(1);
        }
    });
});

describe('Shanghai', () => {
    it('wins with single, double and treble of the round at once', () => {
        const result = replayGame(SHANGHAI, game(SHANGHAI, [visit('a', 'S1', 'D1', 'T1')]));
        expect(result.over).toBe(true);
        expect(result.standings[0].id).toBe('a');
    });

    it('otherwise the most points after the last round', () => {
        const visits = [];
        for (let round = 1; round <= 7; round += 1) visits.push(visit('a', `S${round}`, '0', '0'), visit('b', `D${round}`, '0', '0'));
        const result = replayGame(SHANGHAI, game(SHANGHAI, visits));
        expect(result.over).toBe(true);
        expect(result.standings.map(row => row.id)).toEqual(['b', 'a']);
        expect(result.state.players.b.points).toBe(2 * 28);
    });
});

describe('Killer', () => {
    const settings = { lives: 3, numbers: { a: 5, b: 9, c: 12 } };
    it('becomes a killer on its own double, then takes lives', () => {
        const result = replayGame(KILLER, game(KILLER, [visit('a', 'D5', 'D9', 'D9')], settings, ['a', 'b', 'c']));
        expect(result.state.players.a.killer).toBe(true);
        expect(result.state.players.b.lives).toBe(1);
    });

    it('skips players who are out and ends with the last one standing', () => {
        const visits = [visit('a', 'D5', 'D9', 'D9'), visit('b', '0', '0', '0'), visit('c', '0', '0', '0'), visit('a', 'D9', 'D12', 'D12'), visit('c', '0', '0', '0'), visit('a', 'D12', '0', '0')];
        const result = replayGame(KILLER, game(KILLER, visits, settings, ['a', 'b', 'c']));
        expect(result.over).toBe(true);
        expect(result.standings.map(row => row.id)).toEqual(['a', 'c', 'b']);
    });

    it('draws different numbers for everyone', () => {
        const prepared = KILLER.prepare({ lives: 3 }, ['a', 'b', 'c', 'd']);
        expect(new Set(Object.values(prepared.numbers)).size).toBe(4);
    });
});

describe('Halve-It', () => {
    it('adds the hits on the target and halves without one', () => {
        const result = replayGame(HALVE_IT, game(HALVE_IT, [visit('a', 'T20', 'S20', '0'), visit('b', '0', '0', '0')]));
        expect(result.state.players.a.points).toBe(40 + 80);
        expect(result.state.players.b.points).toBe(20);
    });

    it('scores 41 only as the whole visit', () => {
        const visits = [];
        const rounds = ['S20', 'S16', 'D1', 'S17', 'T1', 'S18'];
        rounds.forEach(dart => visits.push(visit('a', dart, '0', '0')));
        visits.push(visit('a', 'S20', 'S20', 'S1'));
        const result = replayGame(HALVE_IT, game(HALVE_IT, visits, {}, ['a']));
        expect(result.state.players.a.rounds[6]).toBe(41);
    });
});

describe('Golf', () => {
    it('counts the last dart as strokes, the fewest win', () => {
        const visits = [];
        for (let hole = 1; hole <= 9; hole += 1) visits.push(visit('a', `D${hole}`), visit('b', `S${hole}`, '0'));
        const result = replayGame(GOLF, game(GOLF, visits));
        expect(result.over).toBe(true);
        expect(result.state.players.a.strokes).toBe(9);
        expect(result.state.players.b.strokes).toBe(45);
        expect(result.standings[0].id).toBe('a');
    });
});

describe('Tactics', () => {
    it('closes with three marks and scores on numbers still open for others', () => {
        const result = replayGame(TACTICS, game(TACTICS, [visit('a', 'T20', 'T20', '0')]));
        expect(result.state.players.a.marks[20]).toBe(6);
        expect(result.state.players.a.points).toBe(60);
    });

    it('ends when a player closed everything with the most points', () => {
        const all = ['T20', 'T19', 'T18', 'T17', 'T16', 'T15', 'T14', 'T13', 'T12', 'T11', 'T10', 'D25', 'S25'];
        const visits = [];
        for (let index = 0; index < all.length; index += 3) {
            visits.push(visit('a', ...all.slice(index, index + 3)));
            if (index + 3 < all.length) visits.push(visit('b', '0', '0', '0'));
        }
        const result = replayGame(TACTICS, game(TACTICS, visits));
        expect(result.over).toBe(true);
        expect(result.standings[0].id).toBe('a');
    });
});

const train = (definition, darts, settings = {}) => replayTraining(definition, { settings, darts });

describe('trainings', () => {
    it("Bob's 27: 1437 is perfect, a miss of D1 loses 2", () => {
        expect(train(BOBS_27, Array(63).fill('H')).result.score).toBe(1437);
        const missed = train(BOBS_27, ['M', 'M', 'M']);
        expect(missed.state.score).toBe(25);
    });

    it("Bob's 27 says how close every step is to the end, a hit in the visit making its double safe", () => {
        const missing = (doubles) => bobsProgress(train(BOBS_27, Array(3 * doubles).fill('M')).state);
        expect(missing(4).map(({ score, risk }) => [score, risk])).toEqual([
            [27, 'safe'], [25, 'safe'], [21, 'warn'], [15, 'warn'], [7, 'danger'],
        ]);
        // on 7 at D5 (10): one hit and the double is safe, the next three misses end it
        const hit = bobsProgress(train(BOBS_27, [...Array(12).fill('M'), 'H']).state);
        expect(hit.at(-1)).toEqual({ score: 17, risk: 'warn' });
        expect(BOBS_27.hero(train(BOBS_27, []).state)).toBe(27);
        expect(BOBS_27.heroNote(train(BOBS_27, []).state)).toBe('D1');
    });

    it("Bob's 27 ranks the same points by how far the attempt got, and says where a failed one ended", () => {
        const out = (reached) => ({ score: 0, result: { score: 0, reached, failed: true } });
        const sorted = [out(5), out(9), { score: 0, darts: Array(21).fill('M') }, out(6)].sort(BOBS_27.tiebreak);
        // the one without a result counts from its darts: 21 darts, 7 doubles
        expect(sorted.map(entry => entry.result?.reached ?? 'darts')).toEqual([9, 'darts', 6, 5]);
        expect(BOBS_27.entryNote(out(9))).toBe('out at D9');
        expect(BOBS_27.entryNote({ score: 441, result: { reached: 21 } })).toBe(null);
    });

    it("Bob's 27 ends at 0 or below", () => {
        const darts = Array(3 * 6).fill('M');
        const result = train(BOBS_27, darts);
        expect(result.done).toBe(true);
        expect(result.result.failed).toBe(true);
    });

    it("Bob's 27 shows the hits of every double, the one to throw at and the darts of the visit", () => {
        const { state } = train(BOBS_27, ['H', 'M', 'H', 'M', 'M', 'M', 'H']);
        const cells = BOBS_27.doubles(state);
        expect(cells).toHaveLength(21);
        expect(cells.slice(0, 3)).toEqual([
            { name: 'D1', short: '1', value: 2, tone: 2, current: false },
            { name: 'D2', short: '2', value: 0, tone: 0, current: false },
            { name: 'D3', short: '3', value: null, tone: null, current: true },
        ]);
        expect(cells[20]).toMatchObject({ name: 'Bull', short: 'Bull', value: null, current: false });
        expect(BOBS_27.inVisit(state)).toBe(1);
        expect(BOBS_27.heroNote(state)).toBe('D3');
        // 27 + 4 for two hits of D1, − 4 for none at D2, + 6 for a hit of D3
        expect(BOBS_27.hero(state)).toBe(33);
        expect(BOBS_27.heroUnit(state)).toBe('points');
    });

    it("Bob's 27 over at 0: no double to throw at any more", () => {
        const { state } = train(BOBS_27, Array(18).fill('M'));
        const cells = BOBS_27.doubles(state);
        expect(cells.some(cell => cell.current)).toBe(false);
        expect(cells.filter(cell => cell.value === 0)).toHaveLength(state.index);
    });

    it('Doubles around the board rates the darts every double took', () => {
        const { state } = train(DOUBLES_AROUND, ['H', 'M', 'H', 'M', 'M', 'M', 'M', 'H']);
        expect(DOUBLES_AROUND.doubles(state).slice(0, 4).map(cell => [cell.value, cell.tone, cell.current])).toEqual([[1, 3, false], [2, 2, false], [5, 0, false], [null, null, true]]);
    });

    it('the checkout trainings count the darts of the visit from the start of the attempt', () => {
        // 121 − 120 leaves 1, a bust after two darts: the next attempt starts with a new visit
        expect(CHECKOUT_121.inVisit(train(CHECKOUT_121, ['T20', 'T20'], { attempts: 2, darts: 9 }).state)).toBe(0);
        expect(CHECKOUT_121.inVisit(train(CHECKOUT_121, Array(4).fill('S1'), { attempts: 2, darts: 9 }).state)).toBe(1);
        expect(CATCH_40.inVisit(train(CATCH_40, ['T11', 'D14', 'S1']).state)).toBe(1);
        expect(RANDOM_CHECKOUTS.inVisit(train(RANDOM_CHECKOUTS, ['S1', 'S1'], { attempts: 2, targets: [40, 32] }).state)).toBe(2);
    });

    it('121 Checkout goes up when done and down when not', () => {
        const done = train(CHECKOUT_121, ['T20', 'S11', 'D25'], { attempts: 1, darts: 9 });
        expect(done.result).toMatchObject({ score: 121, done: 1, last: 122 });
        const bust = train(CHECKOUT_121, ['T20', 'T20', 'S1'], { attempts: 1, darts: 9 });
        expect(bust.result).toMatchObject({ score: 0, last: 120 });
    });

    it('Random checkouts counts the share checked out', () => {
        const result = train(RANDOM_CHECKOUTS, ['D20', 'S1', 'S1', 'S1'], { attempts: 2, targets: [40, 32] });
        expect(result.result).toMatchObject({ score: 50, done: 1 });
    });

    it('Scoring keeps the average per visit', () => {
        expect(train(SCORING, Array(30).fill('T20'), { darts: 30 }).result.score).toBe(180);
    });

    it('Doubles around the board counts the darts, 21 is perfect', () => {
        expect(train(DOUBLES_AROUND, Array(21).fill('H')).result.score).toBe(21);
        expect(train(DOUBLES_AROUND, ['M', 'H', ...Array(20).fill('H')]).result.score).toBe(22);
    });

    it('Catch 40 gives 3 points for two darts, and ends after 100', () => {
        const first = train(CATCH_40, ['T11', 'D14']);
        expect(first.state.points).toBe(3);
        expect(first.state.target).toBe(62);
    });

    it('the checkout trainings know what is left and the darts for it in the visit', () => {
        const checkoutOf = (definition, darts, settings = {}) => {
            const { state, settings: replayed } = train(definition, darts, settings);
            return definition.checkout(state, { settings: replayed });
        };
        expect(checkoutOf(CATCH_40, [])).toEqual({ left: 61, dartsLeft: 3 });
        expect(checkoutOf(CATCH_40, ['S20'])).toEqual({ left: 41, dartsLeft: 2 });
        // the second visit of the six darts
        expect(checkoutOf(CATCH_40, ['S1', 'S1', 'S1'])).toEqual({ left: 58, dartsLeft: 3 });
        expect(checkoutOf(RANDOM_CHECKOUTS, ['S1'], { attempts: 10, targets: Array(10).fill(40) })).toEqual({ left: 39, dartsLeft: 2 });
        // seven of nine darts thrown: two left, not the three of a new visit
        expect(checkoutOf(CHECKOUT_121, Array(7).fill('S1'), { attempts: 10, darts: 9 })).toEqual({ left: 114, dartsLeft: 2 });
        expect(SCORING.checkout).toBeUndefined();
    });
});
