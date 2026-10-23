import { describe, expect, it } from 'vitest';
import { replayGame } from './engine';
import { HALVE_IT, KILLER, SHANGHAI } from './games';
import { dartPoints, replayX01 } from './x01';
import { replayCricket } from './cricket';

// the house rules a club may set (see club.rules.js), as the games count them

const visit = (player, ...darts) => ({ player, darts });
const x01 = (settings, visits, players = ['a', 'b']) => replayX01({
    players, visits, startingScore: 101, legInMode: 'Straight In', legOutMode: 'Double Out',
    setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3, ...settings,
});

describe('X01 house rules', () => {
    // a leg of 101 won by a: 60 and 41 (D… out), b throws 20s between
    const legWonByA = [visit('a', 'T20', '0', '0'), visit('b', 'S20', '0', '0'), visit('a', 'S1', 'D20')];

    it('lets the next player in turn start the next leg, as always', () => {
        expect(x01({}, legWonByA).currentPlayerTurn).toBe('b');
        // a won the first leg; b starts the second, a the third
        const second = [visit('b', 'T20', '0', '0'), visit('a', '0', '0', '0'), visit('b', 'S1', 'D20')];
        expect(x01({}, [...legWonByA, ...second]).currentPlayerTurn).toBe('a');
    });

    it('lets the loser of the leg start the next one', () => {
        expect(x01({ legStarter: 'loser' }, legWonByA).currentPlayerTurn).toBe('b');
        // b won the second leg: a, who lost it, starts the third
        const second = [visit('b', 'T20', '0', '0'), visit('a', '0', '0', '0'), visit('b', 'S1', 'D20')];
        expect(x01({ legStarter: 'loser' }, [...legWonByA, ...second]).currentPlayerTurn).toBe('a');
        const third = [visit('a', 'T20', '0', '0'), visit('b', 'S20', '0', '0'), visit('a', 'S1', 'D20')];
        expect(x01({ legStarter: 'loser' }, [...legWonByA, ...second, ...third]).hasWinner).toBe(true);
    });

    it('decides a leg after the round limit on the fewest points left, and plays on after a tie', () => {
        const rounds = [visit('a', 'S20', '0', '0'), visit('b', 'S10', '0', '0'), visit('a', 'S5', '0', '0'), visit('b', 'S5', '0', '0')];
        const decided = x01({ roundLimit: 2 }, rounds);
        expect(decided.playerModels.a.legsWon.game).toBe(1);
        expect(decided.currentSetLeg).toBe(2);
        const tied = [visit('a', 'S10', '0', '0'), visit('b', 'S10', '0', '0'), visit('a', 'S5', '0', '0'), visit('b', 'S5', '0', '0')];
        expect(x01({ roundLimit: 2 }, tied).currentSetLeg).toBe(1);
        expect(x01({ roundLimit: 2 }, [...tied, visit('a', 'S1', '0', '0'), visit('b', '0', '0', '0')]).playerModels.a.legsWon.game).toBe(1);
        // without the house rule the leg goes on
        expect(x01({}, rounds).currentSetLeg).toBe(1);
    });

    it('counts the outer bull as 50 when the club wants it', () => {
        expect(dartPoints('S25')).toBe(25);
        expect(dartPoints('S25', 'fifty')).toBe(50);
        expect(x01({ bull: 'fifty' }, [visit('a', 'S25', '0', '0')]).playerModels.a.score).toBe(51);
        expect(x01({}, [visit('a', 'S25', '0', '0')]).playerModels.a.score).toBe(76);
    });
});

describe('Cricket house rules', () => {
    const cricket = (settings, visits) => replayCricket({ players: ['a', 'b'], visits, variant: 'Standard', ...settings });
    const rounds = [visit('a', 'T20', 'S20', '0'), visit('b', 'T19', '0', '0'), visit('a', 'S18', '0', '0'), visit('b', 'S17', '0', '0')];

    it('decides the game after the round limit on the score, then on the numbers closed', () => {
        const decided = cricket({ roundLimit: 2 }, rounds);
        expect(decided.hasWinner).toBe(true);
        expect(decided.playerModels.a.hasWonGame).toBe(true);
        expect(cricket({}, rounds).hasWinner).toBe(false);
        // Cut-throat: the lowest score wins; a's extra 20 went to b
        expect(cricket({ roundLimit: 2, variant: 'Cut-throat' }, rounds).playerModels.a.hasWonGame).toBe(true);
    });

    it('plays on after a tie', () => {
        const tied = [visit('a', 'T20', '0', '0'), visit('b', 'T19', '0', '0'), visit('a', '0', '0', '0'), visit('b', '0', '0', '0')];
        expect(cricket({ roundLimit: 2 }, tied).hasWinner).toBe(false);
    });
});

describe('house rules of the newer games', () => {
    const play = (definition, settings, visits, players = ['a', 'b']) => replayGame(definition, { players, settings, visits });

    it('lets a Shanghai only score', () => {
        const shanghai = [visit('a', 'S1', 'D1', 'T1')];
        expect(play(SHANGHAI, { rounds: 7 }, shanghai).over).toBe(true);
        const scoring = play(SHANGHAI, { rounds: 7, instantWin: false }, shanghai);
        expect(scoring.over).toBe(false);
        expect(scoring.state.players.a).toMatchObject({ points: 6, shanghai: true });
    });

    it('lets any hit make a killer, and a killer\'s own double be safe', () => {
        const numbers = { a: 5, b: 9 };
        expect(play(KILLER, { lives: 3, numbers }, [visit('a', 'S5', '0', '0')]).state.players.a.killer).toBe(false);
        expect(play(KILLER, { lives: 3, numbers, become: 'any' }, [visit('a', 'S5', '0', '0')]).state.players.a.killer).toBe(true);
        expect(play(KILLER, { lives: 3, numbers }, [visit('a', 'D5', 'D5', '0')]).state.players.a.lives).toBe(2);
        expect(play(KILLER, { lives: 3, numbers, ownDouble: 'safe' }, [visit('a', 'D5', 'D5', '0')]).state.players.a.lives).toBe(3);
    });

    it('plays Halve-It on the club\'s own targets', () => {
        const visits = [visit('a', 'S7', '0', '0'), visit('b', '0', '0', '0'), visit('a', 'D25', '0', '0'), visit('b', '0', '0', '0')];
        const own = play(HALVE_IT, { targetList: ['7', 'bull'] }, visits);
        expect(own.over).toBe(true);
        expect(own.state.players.a.points).toBe(40 + 7 + 50);
        expect(play(HALVE_IT, {}, visits).over).toBe(false);
        expect(play(HALVE_IT, { targets: 'short' }, [visit('a', 'S20', '0', '0')], ['a']).state.players.a.points).toBe(60);
    });
});
