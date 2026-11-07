import { describe, expect, it } from 'vitest';
import { atcPlayLevels, gamePlayLevels, levelFilterOf, levelKindOf, rulesTrainingPlayLevels, withPlayLevels } from './play.levels.js';
import { storedOf } from './game.view.js';
import { CLOCK_LEVEL, CRICKET_LEVEL, ELIMINATION_LEVEL, X01_LEVEL, judgeLevel } from '../rules/levels.play.js';

const A = 'a'.repeat(24);
const B = 'b'.repeat(24);
const visit = (player, ...darts) => ({ player, darts });
const turns = (count, a, b) => Array.from({ length: count }, () => [visit(A, ...a), visit(B, ...b)]).flat();

const X01 = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'First to', numberOfSets: 1, legMode: 'First to', numberOfLegs: 1, players: [A, B] };

describe('the level of a stored game', () => {
    it('judges X01 by the 3-dart average, as the result page (from nine darts on)', () => {
        // A: 180, 180 and 141 to check out (167 average); B: six darts, too few
        const visits = [visit(A, 'T20', 'T20', 'T20'), visit(B, 'S20', 'S1', 'S5'), visit(A, 'T20', 'T20', 'T20'), visit(B, 'S20', 'S1', 'S5'), visit(A, 'T20', 'T19', 'D12')];
        const stored = storedOf('x01', { ...X01, visits });
        expect(gamePlayLevels('x01', stored)).toEqual([{ player: A, level: 'elite' }]);
        // the same as the app's judging of the player's figures
        expect(judgeLevel(X01_LEVEL, { average: 167, dartsThrown: 9 }).level).toBe('elite');
    });

    it('judges both players of a longer X01 game', () => {
        // 60 a visit against 15 a visit: pro and beginner
        const stored = storedOf('x01', { ...X01, visits: turns(4, ['S20', 'S20', 'S20'], ['S5', 'S5', 'S5']) });
        expect(gamePlayLevels('x01', stored)).toEqual([{ player: A, level: 'pro' }, { player: B, level: 'beginner' }]);
    });

    it('leaves the bot of an X01 training out', () => {
        const stored = storedOf('x01training', { ...X01, players: [A, 'bot'], visits: Array.from({ length: 4 }, () => [visit(A, 'T20', 'S20', 'S1'), visit('bot', 'T20', 'T20', 'T20')]).flat() });
        expect(gamePlayLevels('x01training', stored)).toEqual([{ player: A, level: 'worldClass' }]);
    });

    it('judges Cricket by the marks per round', () => {
        const stored = storedOf('cricket', { players: [A, B], visits: turns(3, ['T20', 'S19', '0'], ['S20', '0', '0']) });
        expect(gamePlayLevels('cricket', stored)).toEqual([{ player: A, level: 'pro' }, { player: B, level: 'beginner' }]);
        expect(judgeLevel(CRICKET_LEVEL, { marksPerRound: 4, dartsThrown: 9 }).level).toBe('pro');
    });

    it('judges Elimination by the average per visit', () => {
        const stored = storedOf('elimination', { targetScore: 501, gameInMode: 'Straight In', gameOutMode: 'Straight Out', players: [A, B], visits: turns(3, ['S20', 'S20', 'S20'], ['S1', 'S1', 'S1']) });
        expect(gamePlayLevels('elimination', stored)).toEqual([{ player: A, level: 'pro' }, { player: B, level: 'beginner' }]);
        expect(judgeLevel(ELIMINATION_LEVEL, { average: 60, dartsThrown: 9 }).level).toBe('pro');
    });

    it('judges Around the Clock by the hit rate for its mode', () => {
        const visits = [visit(A, 'S1', 'S2', 'S3'), visit(B, '0', '0', '0'), visit(A, 'S4', 'S5', 'S6'), visit(B, '0', '0', '0'), visit(A, 'S7', 'S8', 'S9'), visit(B, '0', '0', 'S1')];
        const stored = storedOf('clock', { mode: 'All', players: [A, B], visits });
        expect(gamePlayLevels('clock', stored)).toEqual([{ player: A, level: 'elite' }, { player: B, level: 'beginner' }]);
        // only doubles count in Double: 9 of 9 there too, by its own bands
        expect(judgeLevel(CLOCK_LEVEL, { darts: 9, hitRate: 30 }, 'Double').level).toBe('worldClass');
    });

    it('judges a game of the rules engine by its own level', () => {
        // Shanghai: treble 1, 2 and 3 are 18 points in three rounds, semi-pro (see the app's tests)
        const game = { kind: 'shanghai', settings: {}, players: [A, B], visits: [visit(A, 'T1', '0', '0'), visit(B, '0', '0', '0'), visit(A, 'T2', '0', '0'), visit(B, '0', '0', '0'), visit(A, 'T3', '0', '0'), visit(B, '0', '0', '0')] };
        expect(gamePlayLevels('rules', game)).toEqual([{ player: A, level: 'semiPro' }, { player: B, level: 'beginner' }]);
        expect(gamePlayLevels('shanghai', game)).toEqual(gamePlayLevels('rules', game));
    });

    it('has none without enough darts, for an unknown kind, or for what the rules cannot replay', () => {
        expect(gamePlayLevels('x01', storedOf('x01', { ...X01, visits: [visit(A, 'T20', 'T20', 'T20')] }))).toEqual([]);
        expect(gamePlayLevels('rules', { kind: 'nothing', players: [A] })).toEqual([]);
        expect(gamePlayLevels('rules', { kind: 'shanghai', players: [A], visits: 'broken' })).toEqual([]);
        expect(gamePlayLevels('x01', null)).toEqual([]);
    });
});

describe('the level of a stored training', () => {
    it('judges a training of the rules engine from its darts', () => {
        const training = { kind: 'scoring', settings: { darts: 30 }, darts: Array(30).fill('T20'), player: { id: A } };
        expect(rulesTrainingPlayLevels(training)).toEqual([{ player: A, level: 'elite' }]);
        expect(rulesTrainingPlayLevels({ ...training, darts: Array(30).fill('S5') })).toEqual([{ player: A, level: 'beginner' }]);
        // not finished: no result, no level
        expect(rulesTrainingPlayLevels({ ...training, darts: ['T20'] })).toEqual([]);
    });

    it('judges Around the Clock with the fewest darts by the hit rate, not one against the clock', () => {
        // 21 targets in 30 darts: 70 %, amateur in All
        expect(atcPlayLevels({ scoring: 'Darts', darts: 30, mode: 'All', player: { id: A } })).toEqual([{ player: A, level: 'amateur' }]);
        expect(atcPlayLevels({ scoring: 'Time', timeMs: 3000, mode: 'All', player: { id: A } })).toEqual([]);
    });
});

describe('withPlayLevels', () => {
    it('works the levels out itself, whatever was sent', () => {
        const stored = storedOf('x01', { ...X01, visits: turns(4, ['S20', 'S20', 'S20'], ['S5', 'S5', 'S5']) });
        const saved = withPlayLevels('x01', { ...stored, playLevels: [{ player: B, level: 'worldClass' }] });
        expect(saved.playLevels).toEqual([{ player: A, level: 'pro' }, { player: B, level: 'beginner' }]);
        expect(withPlayLevels('nothing', { a: 1 })).toEqual({ a: 1, playLevels: [] });
    });

    it('knows the kind of document of every game type', () => {
        expect(['x01', 'cricket', 'elimination', 'clock', 'x01training', 'golf'].map(levelKindOf)).toEqual(['x01', 'cricket', 'elimination', 'clock', 'x01Training', 'rulesGame']);
    });
});

describe('levelFilterOf', () => {
    it('finds the games anyone played at a level', () => {
        expect(levelFilterOf({ level: 'pro' })).toEqual({ 'playLevels.level': 'pro' });
    });

    it('finds the games a player played at a level', () => {
        expect(levelFilterOf({ level: 'worldClass', player: A })).toEqual({ playLevels: { $elemMatch: { player: A, level: 'worldClass' } } });
    });

    it('takes nothing but a level and a player id', () => {
        expect(levelFilterOf({})).toBeNull();
        expect(levelFilterOf({ level: 'all' })).toBeNull();
        // the steps of the scale before are no levels any more
        expect(levelFilterOf({ level: 'pub' })).toBeNull();
        expect(levelFilterOf({ level: 'semiPro' })).toEqual({ 'playLevels.level': 'semiPro' });
        expect(levelFilterOf({ level: 'elite' })).toEqual({ 'playLevels.level': 'elite' });
        expect(levelFilterOf({ level: { $ne: 'pub' } })).toBeNull();
        expect(levelFilterOf({ level: ['pro'] })).toBeNull();
        expect(levelFilterOf({ level: 'pro', player: { $gt: '' } })).toEqual({ 'playLevels.level': 'pro' });
        expect(levelFilterOf({ level: 'pro', player: 'not-an-id' })).toEqual({ 'playLevels.level': 'pro' });
    });
});
