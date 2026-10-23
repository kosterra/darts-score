import { locale, t } from '../../utils/i18n';

/**
 * The widgets a dashboard can show. A club (and each user for themselves)
 * stores the ones it wants, in display order, each with a width; ids that no
 * longer exist here are ignored.
 */

// the widths of a widget: S a third, M half, L two thirds, F the full width; all full width on a phone
export const WIDGET_SIZES = [
    { value: 'S', label: t('S'), title: t('A third'), cols: 'col-12 col-md-6 col-xl-4' },
    { value: 'M', label: t('M'), title: t('Half'), cols: 'col-12 col-lg-6' },
    { value: 'L', label: t('L'), title: t('Two thirds'), cols: 'col-12 col-xl-8' },
    { value: 'F', label: t('Full'), title: t('The full width'), cols: 'col-12' },
];
const colsOf = (size) => (WIDGET_SIZES.find(entry => entry.value === size) ?? WIDGET_SIZES[1]).cols;

const integer = (value) => new Intl.NumberFormat(locale()).format(value);

export const DASHBOARD_WIDGETS = [
    { id: 'me', title: t('You'), description: t('Each player\'s own level, X01 average and form, with the way to their statistics'), kind: 'me', size: 'S' },
    { id: 'totals', title: t('Club in numbers'), description: t('Key figures: games, averages, checkouts and club bests'), kind: 'totals', size: 'F' },
    { id: 'activityCalendar', title: t('Activity'), description: t('A calendar of the last six months, greener the more games'), kind: 'activityCalendar', size: 'L' },
    { id: 'whenWePlay', title: t('When we play'), description: t('Games by day of the week and time of day'), kind: 'whenWePlay', size: 'S' },
    { id: 'records', title: t('Club records'), description: t('Best leg, highest checkout, most 180s and best average, with who set them'), kind: 'records', size: 'M' },
    { id: 'clubGoals', title: t('Club badges and goals'), description: t('The goals of the club admins with how far the club is, or the club badges it is closest to'), kind: 'clubGoals', size: 'S' },
    { id: 'hallOfShame', title: t('Hall of Shame'), description: t('Who holds Bed and Breakfast, Madhouse and the other badges nobody wants'), kind: 'hallOfShame', size: 'M' },
    { id: 'headToHead', title: t('Head to head'), description: t('Who beats whom among the players who play most'), kind: 'headToHead', size: 'M' },
    { id: 'gamesPerMonth', title: t('Games per month'), description: t('Finished games of the last year by game type'), kind: 'gamesPerMonth', size: 'M' },
    { id: 'clubForm', title: t('Club form'), description: t('The club\'s X01 average per month'), kind: 'clubForm', size: 'M' },
    { id: 'runningGames', title: t('Running games'), description: t('Games in progress, ready to continue'), kind: 'runningGames', size: 'S' },
    { id: 'timeline', title: t('Recent games'), description: t('Timeline of the latest games'), kind: 'timeline', size: 'L' },
    { id: 'leaderMostWins', title: t('Most wins'), description: t('Wins over all game types'), kind: 'leaderboard', board: 'mostWins', unit: 'wins', format: integer, size: 'S' },
    { id: 'leaderWinRate', title: t('Best win rate'), description: t('Share of games won, from 5 games on'), kind: 'leaderboard', board: 'winRate', unit: '%', format: (value) => value.toFixed(1), size: 'S' },
    { id: 'leaderX01Average', title: t('Highest X01 average'), description: t('Three-dart average over all X01 games'), kind: 'leaderboard', board: 'x01Average', unit: 'avg', format: (value) => value.toFixed(2), size: 'S' },
    { id: 'leader180s', title: t('Most 180s'), description: t('Maximum scores thrown in X01'), kind: 'leaderboard', board: 'most180s', unit: '× 180', format: integer, size: 'S' },
    { id: 'leaderHighestCheckout', title: t('Highest checkout'), description: t('Best finishing score in X01'), kind: 'leaderboard', board: 'highestCheckout', unit: 'points', format: integer, size: 'S' },
    { id: 'leaderMostGames', title: t('Most games played'), description: t('Finished games over all game types'), kind: 'leaderboard', board: 'mostGames', unit: 'games', format: integer, size: 'S' },
    { id: 'leaderWinsX01', title: t('Most X01 wins'), description: t('Wins in X01 games'), kind: 'leaderboard', board: 'winsX01', unit: 'wins', format: integer, size: 'S' },
    { id: 'leaderWinsCricket', title: t('Most Cricket wins'), description: t('Wins in Cricket games'), kind: 'leaderboard', board: 'winsCricket', unit: 'wins', format: integer, size: 'S' },
    { id: 'leaderWinsElimination', title: t('Most Elimination wins'), description: t('Wins in Elimination games'), kind: 'leaderboard', board: 'winsElimination', unit: 'wins', format: integer, size: 'S' },
    { id: 'leaderWinsClock', title: t('Most Around the Clock wins'), description: t('Wins in Around the Clock games'), kind: 'leaderboard', board: 'winsClock', unit: 'wins', format: integer, size: 'S' },
    { id: 'leaderMostDarts', title: t('Most darts thrown'), description: t('Darts thrown over all game types'), kind: 'leaderboard', board: 'mostDarts', unit: 'darts', format: integer, size: 'S' },
];

export const DEFAULT_WIDGET_IDS = ['me', 'totals', 'runningGames', 'timeline', 'activityCalendar', 'whenWePlay', 'records', 'hallOfShame', 'clubGoals', 'headToHead', 'leaderMostWins', 'leaderX01Average', 'leader180s'];

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
