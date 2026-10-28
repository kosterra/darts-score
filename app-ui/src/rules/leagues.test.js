import { describe, expect, it } from 'vitest';
import { LEAGUE_MATCH_ID, dueOf, leagueMatches, leagueSetupError, leagueTable, matchdayCount, matchdayDates, roundRobin, seasonOver } from './leagues';
import { roundsOfPreset } from './tournaments';

const players = (count) => Array.from({ length: count }, (_, index) => `p${index + 1}`);
const pairKey = ([a, b]) => [a, b].sort().join('-');

describe('leagues', () => {
    it('plays everyone against everyone once, everyone once a matchday', () => {
        for (const count of [3, 4, 5, 6, 7]) {
            const rounds = roundRobin(players(count));
            expect(rounds).toHaveLength(count % 2 ? count : count - 1);
            const pairs = rounds.flat().map(pairKey);
            expect(new Set(pairs).size).toBe(count * (count - 1) / 2);
            for (const round of rounds) expect(new Set(round.flat()).size).toBe(round.length * 2);
        }
    });

    it('makes the season in matchdays, a second time the other way round', () => {
        const once = leagueMatches(players(4), 1);
        expect(once).toHaveLength(6);
        expect(Math.max(...once.map(match => match.day))).toBe(3);
        const twice = leagueMatches(players(4), 2);
        expect(twice).toHaveLength(12);
        expect(matchdayCount(4, 2)).toBe(6);
        expect(matchdayCount(5, 1)).toBe(5);
        const first = twice.find(match => match.day === 1 && match.index === 0);
        const back = twice.find(match => match.day === 4 && match.index === 0);
        expect(back.players).toEqual([...first.players].reverse());
        expect(twice.every(match => LEAGUE_MATCH_ID.test(match.id) && match.status === 'ready')).toBe(true);
    });

    it('dates the matchdays, and a match moved keeps its own date', () => {
        const dates = matchdayDates(new Date(2026, 10, 3, 19, 30), 7, 3);
        expect(dates.map(date => date.getDate())).toEqual([3, 10, 17]);
        const league = { matchdays: dates.map((date, index) => ({ day: index + 1, date })) };
        expect(dueOf(league, { day: 2, date: null })).toEqual(dates[1]);
        const moved = new Date(2026, 10, 12);
        expect(dueOf(league, { day: 2, date: moved })).toEqual(moved);
    });

    it('ranks the table and knows when the season is over', () => {
        const matches = leagueMatches(['a', 'b', 'c'], 1).map(match => ({ ...match, status: 'done', winner: match.players.includes('a') ? 'a' : 'b', score: { legs: [3, 1] } }));
        expect(leagueTable(['a', 'b', 'c'], matches).map(row => row.player)).toEqual(['a', 'b', 'c']);
        expect(seasonOver(matches)).toBe(true);
        expect(seasonOver([])).toBe(false);
    });

    it('checks the setup', () => {
        const rules = roundsOfPreset('clubNight', 8)[0].rules;
        const ok = { players: players(4), meetings: 2, rules, first: new Date(), everyDays: 7 };
        expect(leagueSetupError(ok)).toBeNull();
        expect(leagueSetupError({ ...ok, players: players(2) })).toMatch(/at least 3/);
        expect(leagueSetupError({ ...ok, players: ['a', 'a', 'b'] })).toMatch(/once/);
        expect(leagueSetupError({ ...ok, meetings: 3 })).toMatch(/once or twice/);
        expect(leagueSetupError({ ...ok, everyDays: 3 })).toMatch(/how often/);
        expect(leagueSetupError({ ...ok, first: null })).toMatch(/first matchday/);
        expect(leagueSetupError({ ...ok, rules: { ...rules, numberOfLegs: 4 } })).toMatch(/odd/);
    });
});
