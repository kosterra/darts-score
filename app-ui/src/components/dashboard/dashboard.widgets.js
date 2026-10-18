/**
 * The widgets a club dashboard can show. Clubs store the ids of the ones they
 * want, in display order; ids that no longer exist here are ignored.
 */
const LEADERBOARD_COLS = 'col-12 col-md-6 col-xl-4';

const integer = (value) => new Intl.NumberFormat().format(value);

export const DASHBOARD_WIDGETS = [
    { id: 'totals', title: 'Club in numbers', description: 'Key figures: games, averages, checkouts and club bests', kind: 'totals', cols: 'col-12' },
    { id: 'activityCalendar', title: 'Activity', description: 'A calendar of the last six months, greener the more games', kind: 'activityCalendar', cols: 'col-12 col-xl-8' },
    { id: 'whenWePlay', title: 'When we play', description: 'Games by day of the week and time of day', kind: 'whenWePlay', cols: 'col-12 col-xl-4' },
    { id: 'records', title: 'Club records', description: 'Best leg, highest checkout, most 180s and best average, with who set them', kind: 'records', cols: 'col-12 col-xl-6' },
    { id: 'hallOfShame', title: 'Hall of Shame', description: 'Who holds Bed and Breakfast, Madhouse and the other badges nobody wants', kind: 'hallOfShame', cols: 'col-12 col-xl-6' },
    { id: 'headToHead', title: 'Head to head', description: 'Who beats whom among the players who play most', kind: 'headToHead', cols: 'col-12 col-xl-6' },
    { id: 'gamesPerMonth', title: 'Games per month', description: 'Finished games of the last year by game type', kind: 'gamesPerMonth', cols: 'col-12 col-lg-6' },
    { id: 'clubForm', title: 'Club form', description: 'The club\'s X01 average per month', kind: 'clubForm', cols: 'col-12 col-lg-6' },
    { id: 'runningGames', title: 'Running games', description: 'Games in progress, ready to continue', kind: 'runningGames', cols: 'col-12 col-lg-6 col-xl-4' },
    { id: 'timeline', title: 'Recent games', description: 'Timeline of the latest games', kind: 'timeline', cols: 'col-12 col-lg-6 col-xl-8' },
    { id: 'leaderMostWins', title: 'Most wins', description: 'Wins over all game types', kind: 'leaderboard', board: 'mostWins', unit: 'wins', format: integer, cols: LEADERBOARD_COLS },
    { id: 'leaderWinRate', title: 'Best win rate', description: 'Share of games won, from 5 games on', kind: 'leaderboard', board: 'winRate', unit: '%', format: (value) => value.toFixed(1), cols: LEADERBOARD_COLS },
    { id: 'leaderX01Average', title: 'Highest X01 average', description: 'Three-dart average over all X01 games', kind: 'leaderboard', board: 'x01Average', unit: 'avg', format: (value) => value.toFixed(2), cols: LEADERBOARD_COLS },
    { id: 'leader180s', title: 'Most 180s', description: 'Maximum scores thrown in X01', kind: 'leaderboard', board: 'most180s', unit: '× 180', format: integer, cols: LEADERBOARD_COLS },
    { id: 'leaderHighestCheckout', title: 'Highest checkout', description: 'Best finishing score in X01', kind: 'leaderboard', board: 'highestCheckout', unit: 'points', format: integer, cols: LEADERBOARD_COLS },
    { id: 'leaderMostGames', title: 'Most games played', description: 'Finished games over all game types', kind: 'leaderboard', board: 'mostGames', unit: 'games', format: integer, cols: LEADERBOARD_COLS },
    { id: 'leaderWinsX01', title: 'Most X01 wins', description: 'Wins in X01 games', kind: 'leaderboard', board: 'winsX01', unit: 'wins', format: integer, cols: LEADERBOARD_COLS },
    { id: 'leaderWinsCricket', title: 'Most Cricket wins', description: 'Wins in Cricket games', kind: 'leaderboard', board: 'winsCricket', unit: 'wins', format: integer, cols: LEADERBOARD_COLS },
    { id: 'leaderWinsElimination', title: 'Most Elimination wins', description: 'Wins in Elimination games', kind: 'leaderboard', board: 'winsElimination', unit: 'wins', format: integer, cols: LEADERBOARD_COLS },
    { id: 'leaderWinsClock', title: 'Most Around the Clock wins', description: 'Wins in Around the Clock games', kind: 'leaderboard', board: 'winsClock', unit: 'wins', format: integer, cols: LEADERBOARD_COLS },
    { id: 'leaderMostDarts', title: 'Most darts thrown', description: 'Darts thrown over all game types', kind: 'leaderboard', board: 'mostDarts', unit: 'darts', format: integer, cols: LEADERBOARD_COLS },
];

export const DEFAULT_WIDGET_IDS = ['totals', 'runningGames', 'timeline', 'activityCalendar', 'whenWePlay', 'records', 'hallOfShame', 'headToHead', 'leaderMostWins', 'leaderX01Average', 'leader180s'];

/**
 * The widgets a club shows, in its order. Without a choice of its own a club
 * gets the default set.
 */
export const resolveWidgets = (widgetIds, { shameBadges = true } = {}) => {
    const ids = widgetIds?.length ? widgetIds : DEFAULT_WIDGET_IDS;
    return ids.map(id => DASHBOARD_WIDGETS.find(widget => widget.id === id))
        .filter(Boolean)
        // the Hall of Shame only for clubs that keep it switched on
        .filter(widget => shameBadges || widget.kind !== 'hallOfShame');
};
