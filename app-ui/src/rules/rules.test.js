import { describe, expect, it } from 'vitest';
import { afterDart, isCheckout, isValidDart, parseDart } from './darts';
import { replayGame, replayTraining, withGameState } from './engine';
import { GAMES, GOLF, HALVE_IT, KILLER, SHANGHAI, TACTICS } from './games';
import { BOBS_27, CATCH_40, CHECKOUT_121, DOUBLES_AROUND, RANDOM_CHECKOUTS, SCORING, TRAININGS } from './trainings';

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

    it("Bob's 27 ends at 0 or below", () => {
        const darts = Array(3 * 6).fill('M');
        const result = train(BOBS_27, darts);
        expect(result.done).toBe(true);
        expect(result.result.failed).toBe(true);
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
});
