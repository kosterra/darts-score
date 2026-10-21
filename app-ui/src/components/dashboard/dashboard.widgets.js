/**
 * The widgets a dashboard can show. A club (and each user for themselves)
 * stores the ones it wants, in display order, each with a width; ids that no
 * longer exist here are ignored.
 */

// the widths of a widget: S a third, M half, L two thirds, F the full width; all full width on a phone
export const WIDGET_SIZES = [
    { value: 'S', label: 'S', title: 'A third', cols: 'col-12 col-md-6 col-xl-4' },
    { value: 'M', label: 'M', title: 'Half', cols: 'col-12 col-lg-6' },
    { value: 'L', label: 'L', title: 'Two thirds', cols: 'col-12 col-xl-8' },
    { value: 'F', label: 'Full', title: 'The full width', cols: 'col-12' },
];
const colsOf = (size) => (WIDGET_SIZES.find(entry => entry.value === size) ?? WIDGET_SIZES[1]).cols;

const integer = (value) => new Intl.NumberFormat().format(value);

export const DASHBOARD_WIDGETS = [
    { id: 'me', title: 'You', description: 'Each player\'s own level, X01 average and form, with the way to their statistics', kind: 'me', size: 'S' },
    { id: 'totals', title: 'Club in numbers', description: 'Key figures: games, averages, checkouts and club bests', kind: 'totals', size: 'F' },
    { id: 'activityCalendar', title: 'Activity', description: 'A calendar of the last six months, greener the more games', kind: 'activityCalendar', size: 'L' },
    { id: 'whenWePlay', title: 'When we play', description: 'Games by day of the week and time of day', kind: 'whenWePlay', size: 'S' },
    { id: 'records', title: 'Club records', description: 'Best leg, highest checkout, most 180s and best average, with who set them', kind: 'records', size: 'M' },
    { id: 'hallOfShame', title: 'Hall of Shame', description: 'Who holds Bed and Breakfast, Madhouse and the other badges nobody wants', kind: 'hallOfShame', size: 'M' },
    { id: 'headToHead', title: 'Head to head', description: 'Who beats whom among the players who play most', kind: 'headToHead', size: 'M' },
    { id: 'gamesPerMonth', title: 'Games per month', description: 'Finished games of the last year by game type', kind: 'gamesPerMonth', size: 'M' },
    { id: 'clubForm', title: 'Club form', description: 'The club\'s X01 average per month', kind: 'clubForm', size: 'M' },
    { id: 'runningGames', title: 'Running games', description: 'Games in progress, ready to continue', kind: 'runningGames', size: 'S' },
    { id: 'timeline', title: 'Recent games', description: 'Timeline of the latest games', kind: 'timeline', size: 'L' },
    { id: 'leaderMostWins', title: 'Most wins', description: 'Wins over all game types', kind: 'leaderboard', board: 'mostWins', unit: 'wins', format: integer, size: 'S' },
    { id: 'leaderWinRate', title: 'Best win rate', description: 'Share of games won, from 5 games on', kind: 'leaderboard', board: 'winRate', unit: '%', format: (value) => value.toFixed(1), size: 'S' },
    { id: 'leaderX01Average', title: 'Highest X01 average', description: 'Three-dart average over all X01 games', kind: 'leaderboard', board: 'x01Average', unit: 'avg', format: (value) => value.toFixed(2), size: 'S' },
    { id: 'leader180s', title: 'Most 180s', description: 'Maximum scores thrown in X01', kind: 'leaderboard', board: 'most180s', unit: '× 180', format: integer, size: 'S' },
    { id: 'leaderHighestCheckout', title: 'Highest checkout', description: 'Best finishing score in X01', kind: 'leaderboard', board: 'highestCheckout', unit: 'points', format: integer, size: 'S' },
    { id: 'leaderMostGames', title: 'Most games played', description: 'Finished games over all game types', kind: 'leaderboard', board: 'mostGames', unit: 'games', format: integer, size: 'S' },
    { id: 'leaderWinsX01', title: 'Most X01 wins', description: 'Wins in X01 games', kind: 'leaderboard', board: 'winsX01', unit: 'wins', format: integer, size: 'S' },
    { id: 'leaderWinsCricket', title: 'Most Cricket wins', description: 'Wins in Cricket games', kind: 'leaderboard', board: 'winsCricket', unit: 'wins', format: integer, size: 'S' },
    { id: 'leaderWinsElimination', title: 'Most Elimination wins', description: 'Wins in Elimination games', kind: 'leaderboard', board: 'winsElimination', unit: 'wins', format: integer, size: 'S' },
    { id: 'leaderWinsClock', title: 'Most Around the Clock wins', description: 'Wins in Around the Clock games', kind: 'leaderboard', board: 'winsClock', unit: 'wins', format: integer, size: 'S' },
    { id: 'leaderMostDarts', title: 'Most darts thrown', description: 'Darts thrown over all game types', kind: 'leaderboard', board: 'mostDarts', unit: 'darts', format: integer, size: 'S' },
];

export const DEFAULT_WIDGET_IDS = ['me', 'totals', 'runningGames', 'timeline', 'activityCalendar', 'whenWePlay', 'records', 'hallOfShame', 'headToHead', 'leaderMostWins', 'leaderX01Average', 'leader180s'];

const widgetOf = (id) => DASHBOARD_WIDGETS.find(widget => widget.id === id);
// the widgets with their own widths
export const DEFAULT_LAYOUT = DEFAULT_WIDGET_IDS.map(id => ({ id, size: widgetOf(id).size }));

/**
 * A layout as stored: [{ id, size }], or the plain widget ids clubs stored
 * before (each with its own width). Empty: the default set.
 */
export const toLayout = (stored) => {
    const items = (stored ?? []).map(item => typeof item === 'string' ? { id: item, size: widgetOf(item)?.size } : item);
    return items.length ? items : DEFAULT_LAYOUT;
};

/**
 * The widgets of a layout, in its order, each with its width and its columns:
 * [{ ...widget, size, cols }]. Widgets that no longer exist are left out, and
 * the Hall of Shame for clubs that switched it off.
 */
export const resolveLayout = (stored, { shameBadges = true } = {}) => toLayout(stored)
    .map(item => {
        const widget = widgetOf(item.id);
        if (!widget) return null;
        const size = WIDGET_SIZES.some(entry => entry.value === item.size) ? item.size : widget.size;
        return { ...widget, size, cols: colsOf(size) };
    })
    .filter(Boolean)
    .filter(widget => shameBadges || widget.kind !== 'hallOfShame');

/**
 * Which arrangement a user sees in a club: their own, else the club's, else
 * the default set. { layout, own: whether it is their own }.
 */
export const layoutFor = (user, club) => {
    const own = (user?.dashboards ?? []).find(entry => String(entry.club) === String(club?.id));
    if (own) return { layout: own.layout, own: true };
    return { layout: club?.dashboardLayout?.length ? club.dashboardLayout : club?.dashboardWidgets, own: false };
};
