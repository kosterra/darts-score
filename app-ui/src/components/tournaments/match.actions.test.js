import { describe, expect, it } from 'vitest';
import { leagueMatchActions, matchLevel, matchScore, tournamentMatchActions } from './match.actions';

const final = { id: '2-0', size: 2, index: 0, players: ['a', 'b'], status: 'walkover', winner: 'a' };
const ready = { id: '4-1', size: 4, index: 1, players: ['c', 'd'], status: 'ready' };
const tournamentOf = (status, matches = [final, ready]) => ({ status, myPlayer: 'c', matches, draw: {} });

describe('tournamentMatchActions', () => {
    it('lets the host admins decide and start the matches while the tournament runs', () => {
        const actions = tournamentMatchActions({ tournament: tournamentOf('running'), match: ready, isAdmin: true, canManage: true });
        expect(actions).toMatchObject({ over: false, walkOn: true, canStart: true, startHint: false, canDecide: true });
        // a decided final can still be changed: no match follows it
        expect(tournamentMatchActions({ tournament: tournamentOf('running'), match: final, isAdmin: true, canManage: true }).canDecide).toBe(true);
    });

    it('offers nothing but the result once the tournament is finished or cancelled', () => {
        for (const status of ['finished', 'cancelled']) {
            for (const match of [final, ready]) {
                expect(tournamentMatchActions({ tournament: tournamentOf(status), match, isAdmin: true, canManage: true }))
                    .toEqual({ over: true, walkOn: false, canStart: false, startHint: false, canDecide: false });
            }
        }
    });

    it('lets a player start their own match but not decide it', () => {
        const actions = tournamentMatchActions({ tournament: tournamentOf('running'), match: ready });
        expect(actions).toMatchObject({ canStart: true, canDecide: false });
        expect(tournamentMatchActions({ tournament: { ...tournamentOf('running'), myPlayer: 'x' }, match: ready }).startHint).toBe(true);
    });

    it('keeps a group result once the knockout stage is drawn', () => {
        const group = { id: 'g0-0-1', group: 0, players: ['a', 'b'], status: 'done', winner: 'a' };
        const tournament = { ...tournamentOf('running', [group]), draw: { knockoutAt: '2026-11-01' } };
        expect(tournamentMatchActions({ tournament, match: group, isAdmin: true, canManage: true }).canDecide).toBe(false);
    });
});

describe('leagueMatchActions', () => {
    const open = { id: 'd5-0', day: 5, players: ['a', 'b'], status: 'ready' };
    const walkover = { ...open, status: 'walkover', winner: 'b' };

    it('lets the admins start, move and decide while the season runs', () => {
        expect(leagueMatchActions({ league: { status: 'running' }, match: open, isAdmin: true }))
            .toEqual({ over: false, walkOn: true, canStart: true, startHint: false, canMove: true, canDecide: true });
    });

    it('offers nothing but the result once the season is finished or cancelled', () => {
        for (const status of ['finished', 'cancelled']) {
            for (const match of [open, walkover]) {
                expect(leagueMatchActions({ league: { status }, match, isAdmin: true }))
                    .toEqual({ over: true, walkOn: false, canStart: false, startHint: false, canMove: false, canDecide: false });
            }
        }
    });
});

describe('the result of a match', () => {
    it('is the score of the played game, the score so far of a running one, none for a walkover', () => {
        expect(matchScore({ status: 'done', score: { legs: [6, 3] } })).toEqual({ legs: [6, 3] });
        expect(matchScore({ status: 'running', score: null, live: { legs: [2, 1], sets: [1, 0] } })).toEqual({ legs: [2, 1], sets: [1, 0] });
        expect(matchScore({ status: 'walkover', score: null })).toBeNull();
        // a live score left over from a game no longer running does not count
        expect(matchScore({ status: 'walkover', score: null, live: { legs: [2, 1] } })).toBeNull();
    });

    it('says the level each player played at, when it was judged', () => {
        const match = { playLevels: [{ player: 'a', level: 'pro' }] };
        expect(matchLevel(match, 'a')).toBe('pro');
        expect(matchLevel(match, 'b')).toBeNull();
        expect(matchLevel({}, 'a')).toBeNull();
        expect(matchLevel(match, null)).toBeNull();
    });
});
