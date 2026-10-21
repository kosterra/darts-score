/**
 * The figures of the public clubs for the start page, from what the game
 * collections add up per club: [{ club, weekday (1 = Sunday … 7 = Saturday),
 * games, recent (in the last 30 days), lastAt }] for every kind of game, and
 * [{ club, averageSum, rounds, num180s }] for X01.
 * → Map(clubId → { gamesPlayed, gamesLast30Days, lastGameAt, x01Average, num180s, busiestDay })
 */
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const round = (value) => Math.round(value * 10) / 10;

export const clubFigures = (counts, x01) => {
    const figures = new Map();
    const of = (club) => {
        const id = String(club);
        if (!figures.has(id)) figures.set(id, { gamesPlayed: 0, gamesLast30Days: 0, lastGameAt: null, x01Average: null, num180s: 0, days: Array(7).fill(0) });
        return figures.get(id);
    };
    for (const { club, weekday, games = 0, recent = 0, lastAt = null } of counts) {
        const figure = of(club);
        figure.gamesPlayed += games;
        figure.gamesLast30Days += recent;
        if (weekday >= 1 && weekday <= 7) figure.days[weekday - 1] += games;
        if (lastAt && (!figure.lastGameAt || new Date(lastAt) > new Date(figure.lastGameAt))) figure.lastGameAt = new Date(lastAt);
    }
    for (const { club, averageSum = 0, rounds = 0, num180s = 0 } of x01) {
        const figure = of(club);
        // every game's average weighed by its rounds, as the club statistics do
        if (rounds > 0) figure.x01Average = round(averageSum / rounds);
        figure.num180s += num180s;
    }
    for (const figure of figures.values()) {
        const most = Math.max(...figure.days);
        // a day stands out only with a few games and more than on any other day
        const busiest = figure.days.indexOf(most);
        figure.busiestDay = figure.gamesPlayed >= 5 && figure.days.filter(count => count === most).length === 1 ? WEEKDAYS[busiest] : null;
        delete figure.days;
    }
    return figures;
};
