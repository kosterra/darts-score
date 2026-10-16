import dayjs from 'dayjs';

// Dashboard charts from the club's game log ([{ at, type, finished, points?, rounds? }]),
// grouped by day, month and hour in the visitor's own time zone.

const GAME_TYPES = ['x01', 'cricket', 'elimination'];

// Monday-based day of the week: 0 = Monday … 6 = Sunday
const weekday = (date) => (date.day() + 6) % 7;

/**
 * The last "weeks" weeks as columns of seven days (Monday first), each day
 * with the number of games started; days after "today" are left out.
 */
export const activityCalendar = (gameLog, today = dayjs(), weeks = 26) => {
    const end = dayjs(today).startOf('day');
    const start = end.subtract(weekday(end), 'day').subtract(weeks - 1, 'week');
    const counts = new Map();
    for (const { at } of gameLog) {
        const key = dayjs(at).format('YYYY-MM-DD');
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const columns = [];
    for (let week = 0; week < weeks; week++) {
        const days = [];
        for (let day = 0; day < 7; day++) {
            const date = start.add(week * 7 + day, 'day');
            days.push(date.isAfter(end) ? null : { date: date.format('YYYY-MM-DD'), count: counts.get(date.format('YYYY-MM-DD')) ?? 0 });
        }
        columns.push({ start: start.add(week, 'week').format('YYYY-MM-DD'), days });
    }
    const all = columns.flatMap(column => column.days).filter(Boolean);
    return { columns, total: all.reduce((sum, day) => sum + day.count, 0), max: Math.max(0, ...all.map(day => day.count)) };
};

const lastMonths = (today, months) =>
    Array.from({ length: months }, (_, index) => dayjs(today).startOf('month').subtract(months - 1 - index, 'month'));

/**
 * Finished games per month and game type, for the last "months" months.
 */
export const gamesPerMonth = (gameLog, today = dayjs(), months = 12) => lastMonths(today, months).map(month => {
    const entry = { month: month.format('YYYY-MM'), label: month.format('MMM YY') };
    GAME_TYPES.forEach(type => { entry[type] = 0; });
    for (const game of gameLog) {
        if (game.finished && dayjs(game.at).isSame(month, 'month') && entry[game.type] !== undefined) entry[game.type] += 1;
    }
    return entry;
});

/**
 * The club's X01 average per month (weighted by rounds), for the last "months"
 * months; months without X01 games have no average.
 */
export const clubFormPerMonth = (gameLog, today = dayjs(), months = 12) => lastMonths(today, months).map(month => {
    let points = 0, rounds = 0;
    for (const game of gameLog) {
        if (game.rounds && dayjs(game.at).isSame(month, 'month')) {
            points += game.points;
            rounds += game.rounds;
        }
    }
    return { month: month.format('YYYY-MM'), label: month.format('MMM YY'), average: rounds ? Math.round(points / rounds * 10) / 10 : null };
});

export const TIME_SLOTS = [
    { id: 'morning', label: 'Morning', from: 6, to: 12 },
    { id: 'afternoon', label: 'Afternoon', from: 12, to: 17 },
    { id: 'evening', label: 'Evening', from: 17, to: 21 },
    { id: 'night', label: 'Night', from: 21, to: 30 },
];

/**
 * Games started per day of the week (Monday first) and time of day.
 * Nights run from 21:00 to 6:00 and count for the day they started on.
 */
export const whenWePlay = (gameLog) => {
    const grid = Array.from({ length: 7 }, () => TIME_SLOTS.map(() => 0));
    for (const { at } of gameLog) {
        const time = dayjs(at);
        // early hours belong to the night before: 1:30 counts as 25:30 of the previous day
        const early = time.hour() < 6;
        const day = early ? time.subtract(1, 'day') : time;
        const hour = early ? time.hour() + 24 : time.hour();
        const slot = TIME_SLOTS.findIndex(entry => hour >= entry.from && hour < entry.to);
        grid[weekday(day)][slot] += 1;
    }
    return { grid, max: Math.max(0, ...grid.flat()) };
};
