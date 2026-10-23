import { describe, expect, it } from 'vitest';
import { trainingOverview } from './training.overview';

const now = new Date('2026-10-23T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 864e5).toISOString();
const anna = { id: 'a', nickname: 'Anna' };
const ben = { id: 'b', nickname: 'Ben' };

describe('trainingOverview', () => {
    const rows = [
        { kind: 'atc', scoring: 'Time', timeMs: 9000, mode: 'Single', player: anna, createdAt: daysAgo(1) },
        { kind: 'atc', scoring: 'Time', timeMs: 8000, mode: 'Double', player: ben, createdAt: daysAgo(40) },
        { kind: 'atc', scoring: 'Darts', darts: 30, mode: 'All', player: anna, createdAt: daysAgo(2) },
        { kind: 'x01', finished: true, averages: [52.1, 45], player: ben, createdAt: daysAgo(3) },
        { kind: 'x01', finished: false, averages: [70, 45], player: anna, createdAt: daysAgo(3) },
        { kind: 'doublesaround', rules: { higherIsBetter: false }, score: 30, player: anna, createdAt: daysAgo(5) },
        { kind: 'doublesaround', rules: { higherIsBetter: false }, score: 25, player: ben, createdAt: daysAgo(6) },
    ];

    it('counts the trainings, lately and by kind', () => {
        const overview = trainingOverview(rows, now);
        expect(overview).toMatchObject({ total: 7, last30Days: 6, trainees: 2 });
        expect(overview.popular[0]).toMatchObject({ kind: 'atc', count: 3, last30Days: 2 });
    });

    it('ranks the players by their trainings with their favourite', () => {
        const [first, second] = trainingOverview(rows, now).ranking;
        expect(first).toMatchObject({ playerId: 'a', count: 4, last30Days: 4, favourite: 'atc' });
        expect(second).toMatchObject({ playerId: 'b', count: 3 });
    });

    it('keeps the club records: fastest, fewest darts, best average of a finished training, the best of each training', () => {
        const records = Object.fromEntries(trainingOverview(rows, now).records.map(record => [record.key, record]));
        expect(records['atc-time']).toMatchObject({ value: 8000, row: { player: ben } });
        expect(records['atc-darts']).toMatchObject({ value: 30 });
        expect(records.bot).toMatchObject({ value: 52.1 });
        expect(records.doublesaround).toMatchObject({ value: 25, lower: true, row: { player: ben } });
    });
});
