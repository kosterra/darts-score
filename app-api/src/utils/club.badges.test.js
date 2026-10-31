import { describe, it, expect } from 'vitest';
import { CLUB_BADGES, CLUB_GAME_TYPES, CLUB_TRAINING_KINDS, goalProgress, replayClubBadges, tallyOf, topClubBadges } from './club.badges.js';

let minute = 0;
const at = (day = 0) => new Date(Date.UTC(2026, 0, 5 + day, 18, minute++));
const game = (players, extra = {}, day = 0) => ({ kind: 'game', type: 'x01', id: `g${minute}`, at: at(day), players, darts: 30, num180s: 0, firsts: {}, ...extra });
const training = (trainingKind, player = 'p1', day = 0) => ({ kind: 'training', type: trainingKind === 'atc' ? 'atc' : 'rulesTraining', trainingKind, id: `t${minute}`, at: at(day), player });
const ids = (result) => result.earned.map(entry => entry.badge);

describe('club badges', () => {
    it('has unique ids and a description for each', () => {
        expect(new Set(CLUB_BADGES.map(badge => badge.id)).size).toBe(CLUB_BADGES.length);
        for (const badge of CLUB_BADGES) expect(badge.description, badge.id).toBeTruthy();
    });

    it('counts the club\'s games and names the game that tipped a tier', () => {
        const games = Array.from({ length: 100 }, (_, index) => game(['p1', 'p2'], {}, Math.floor(index / 20)));
        const result = replayClubBadges(games);
        const busy = result.earned.find(entry => entry.badge === 'clubGames-100');
        expect(busy.sourceId).toBe(games[99].id);
        expect(busy.player).toBe('p1');
        expect(result.metrics.darts).toBe(3000);
    });

    it('scopes a tally to a subset of players, for a shared tournament game', () => {
        const g = { players: ['a', 'b'], visits: [], friendly: false, playerModels: { a: { hasWonGame: true }, b: { hasWonGame: false } } };
        const all = tallyOf('x01', g);
        expect(all.players).toEqual(['a', 'b']);
        expect(all.winners).toEqual(['a']);
        const onlyB = tallyOf('x01', g, { onlyPlayers: ['b'] });
        expect(onlyB.players).toEqual(['b']);
        expect(onlyB.winners).toEqual([]);
        const onlyA = tallyOf('x01', g, { onlyPlayers: ['a'] });
        expect(onlyA.players).toEqual(['a']);
        expect(onlyA.winners).toEqual(['a']);
    });

    it('credits a first to the player who threw it', () => {
        const result = replayClubBadges([game(['p1', 'p2']), game(['p1', 'p2'], { num180s: 1, firsts: { max180: ['p2'] } })]);
        const first = result.earned.find(entry => entry.badge === 'clubFirst180-1');
        expect(first.player).toBe('p2');
    });

    it('a club night of eight players on one day, and the weeks in a row', () => {
        const night = [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h']].map(players => game(players));
        expect(ids(replayClubBadges(night))).toContain('clubNight-8');
        const weeks = [0, 7, 14, 21].map(day => game(['a'], {}, day));
        expect(ids(replayClubBadges(weeks))).toContain('clubWeeks-4');
        expect(ids(replayClubBadges([game(['a'], {}, 0), game(['a'], {}, 14), game(['a'], {}, 21), game(['a'], {}, 28)]))).not.toContain('clubWeeks-4');
    });

    it('every game type and every kind of training', () => {
        const types = CLUB_GAME_TYPES.map(type => ({ ...game(['a']), type }));
        expect(ids(replayClubBadges(types))).toContain(`clubEveryGame-${CLUB_GAME_TYPES.length}`);
        expect(ids(replayClubBadges(CLUB_TRAINING_KINDS.map(kind => training(kind))))).toContain(`clubEveryTraining-${CLUB_TRAINING_KINDS.length}`);
    });

    it('the members and the years count as of now, tipped by nobody', () => {
        const result = replayClubBadges([], { members: 12, createdAt: new Date(2024, 0, 1), now: new Date(2026, 6, 1) });
        expect(ids(result)).toEqual(expect.arrayContaining(['clubMembers-10', 'clubAnniversary-1', 'clubAnniversary-2']));
        expect(result.earned.every(entry => entry.player === null)).toBe(true);
    });

    it('a game\'s tally from what it shows for each player', () => {
        const tally = tallyOf('clock', { players: ['a', 'b'], playerModels: { a: { darts: 40, hasWonGame: true }, b: { darts: 50 } } });
        expect(tally).toMatchObject({ players: ['a', 'b'], darts: 90, num180s: 0, firsts: {} });
    });

    it('a goal adds up what was played between its start and end', () => {
        const tallies = [{ at: new Date(2026, 0, 2), num180s: 2 }, { at: new Date(2026, 0, 10), num180s: 3 }, { at: new Date(2026, 1, 2), num180s: 9 }];
        const goal = { metric: 'num180s', target: 10, from: new Date(2026, 0, 1), until: new Date(2026, 0, 31) };
        expect(goalProgress(goal, tallies, [])).toBe(5);
        expect(goalProgress({ ...goal, metric: 'games' }, tallies, [])).toBe(2);
        expect(goalProgress({ ...goal, metric: 'trainings' }, tallies, [{ at: new Date(2026, 0, 3) }])).toBe(1);
    });

    it('shows the highest tiers first on the club\'s card', () => {
        const top = topClubBadges([
            { badge: 'clubGames-100', earnedAt: new Date(2026, 0, 1) },
            { badge: 'clubGames-1000', earnedAt: new Date(2026, 3, 1) },
            { badge: 'clubFirst180-1', earnedAt: new Date(2026, 5, 1) },
            { badge: 'unknown-1', earnedAt: new Date() },
        ], 2);
        expect(top.map(badge => badge.id)).toEqual(['clubGames-1000', 'clubFirst180-1']);
        expect(top[0].metric).toBeUndefined();
    });
});

describe('latest club badges', () => {
    it('newest first, only known ones', async () => {
        const { latestClubBadges } = await import('./club.badges.js');
        const latest = latestClubBadges([
            { badge: 'clubGames-100', earnedAt: new Date(2026, 0, 1) },
            { badge: 'clubFirst180-1', earnedAt: new Date(2026, 5, 1) },
            { badge: 'gone-1', earnedAt: new Date(2026, 6, 1) },
        ]);
        expect(latest.map(badge => badge.id)).toEqual(['clubFirst180-1', 'clubGames-100']);
    });
});
