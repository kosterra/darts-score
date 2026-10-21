import { describe, it, expect } from 'vitest';
import { quickGameError, hashKey, keyMatches, newKey, winnerOf } from './quick.games.js';

const x01 = (extra = {}) => ({
    startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', legMode: 'Best of', numberOfSets: 1, numberOfLegs: 3,
    players: ['q1', 'q2'], quickPlayers: [{ id: 'q1', nickname: 'Anna' }, { id: 'q2', nickname: 'Bär 2' }], flyingDarts: 'off', ...extra,
});

describe('quick games', () => {
    it('takes X01 and Cricket as the start page sets them up', () => {
        expect(quickGameError('x01', x01())).toBeNull();
        expect(quickGameError('x01', x01({ startingScore: 301, legOutMode: 'Straight Out', numberOfLegs: 1 }))).toBeNull();
        expect(quickGameError('cricket', { variant: 'Cut-throat', players: ['q1'], quickPlayers: [{ id: 'q1', nickname: 'Solo' }], flyingDarts: 'off' })).toBeNull();
    });

    it('turns away other games, setups and players', () => {
        expect(quickGameError('clock', x01())).toMatch(/X01 or Cricket/);
        expect(quickGameError('x01', x01({ startingScore: 701 }))).toMatch(/301 or 501/);
        expect(quickGameError('x01', x01({ legInMode: 'Double In' }))).toMatch(/Straight In/);
        expect(quickGameError('x01', x01({ numberOfSets: 3 }))).toMatch(/best of/);
        expect(quickGameError('x01', x01({ flyingDarts: 'on' }))).toMatch(/animation/);
        expect(quickGameError('cricket', { ...x01(), variant: 'No-score' })).toMatch(/Standard or Cut-throat/);
        expect(quickGameError('x01', x01({ players: ['q1', 'q2', 'q3', 'q4', 'q1'] }))).toMatch(/1 to 4/);
        expect(quickGameError('x01', x01({ players: ['q1', 'p9'] }))).toMatch(/not valid/);
        expect(quickGameError('x01', x01({ quickPlayers: [{ id: 'q1', nickname: 'Anna' }, { id: 'q2', nickname: '<b>' }] }))).toMatch(/1 to 20/);
        expect(quickGameError('x01', x01({ quickPlayers: [{ id: 'q1', nickname: 'Anna' }, { id: 'q2', nickname: 'anna' }] }))).toMatch(/of their own/);
        expect(quickGameError('x01', x01({ junk: 'x'.repeat(500 * 1024) }))).toMatch(/too large/);
    });

    it('keeps the setup and the players while the game goes on', () => {
        expect(quickGameError('x01', x01({ playerModels: { q1: {} } }), x01())).toBeNull();
        expect(quickGameError('x01', x01({ startingScore: 301 }), x01())).toMatch(/setup/);
        expect(quickGameError('x01', x01({ players: ['q2', 'q1'] }), x01())).toMatch(/players/);
        expect(quickGameError('x01', x01({ quickPlayers: [{ id: 'q1', nickname: 'Anna' }, { id: 'q2', nickname: 'Ben' }] }), x01())).toMatch(/names/);
    });

    it('knows the key of the browser that started the game, and the winner', () => {
        const key = newKey();
        expect(keyMatches(key, hashKey(key))).toBe(true);
        expect(keyMatches(newKey(), hashKey(key))).toBe(false);
        expect(keyMatches('', hashKey(key))).toBe(false);
        expect(winnerOf(x01({ playerModels: { q1: {}, q2: { hasWonGame: true } } }))).toBe('Bär 2');
        expect(winnerOf(x01())).toBeNull();
    });
});
