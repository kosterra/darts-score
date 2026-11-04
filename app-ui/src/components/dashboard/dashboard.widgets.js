import { locale, t } from '../../utils/i18n';

/**
 * The widgets a dashboard can show. A club (its page My club) and each user
 * (their own Dashboard) store the ones they want, in display order, each with
 * a width; ids that no longer exist here are ignored. "personal" widgets are
 * only for one's own Dashboard.
 */

// the widths of a widget: S a third, M half, L two thirds, F the full width; all full width on a phone
export const WIDGET_SIZES = [
    { value: 'S', label: t('S'), title: t('A third'), cols: 'col-12 col-md-6 col-xl-4' },
    { value: 'M', label: t('M'), title: t('Half'), cols: 'col-12 col-lg-6' },
    { value: 'L', label: t('L'), title: t('Two thirds'), cols: 'col-12 col-xl-8' },
    { value: 'F', label: t('Full'), title: t('The full width'), cols: 'col-12' },
];
const colsOf = (size) => (WIDGET_SIZES.find(entry => entry.value === size) ?? WIDGET_SIZES[1]).cols;

// the columns (of 12) a width takes from each breakpoint on, as in WIDGET_SIZES; below md all 12
const SPANS = {
    S: { md: 6, lg: 6, xl: 4 },
    M: { md: 12, lg: 6, xl: 6 },
    L: { md: 12, lg: 12, xl: 8 },
    F: { md: 12, lg: 12, xl: 12 },
};
const BREAKPOINTS = ['md', 'lg', 'xl'];

/**
 * The columns of each widget with no hole at the end of a row: at each
 * breakpoint the widgets go into rows of 12 in their order, and the last one
 * of a row that is not full takes what is left (a third beside nothing grows
 * to the full width). The chosen widths stay as they are stored.
 */
export const fillRows = (sizes) => {
    const spans = sizes.map(() => ({}));
    for (const breakpoint of BREAKPOINTS) {
        let used = 0;
        let last = -1;
        sizes.forEach((size, index) => {
            const span = (SPANS[size] ?? SPANS.M)[breakpoint];
            if (used + span > 12) {
                spans[last][breakpoint] += 12 - used;
                used = 0;
            }
            spans[index][breakpoint] = span;
            used += span;
            last = index;
        });
        if (last >= 0) spans[last][breakpoint] += 12 - used;
    }
    // 'col-12' and a class only where the width changes from the breakpoint below
    return spans.map(span => {
        let before = 12;
        const classes = ['col-12'];
        for (const breakpoint of BREAKPOINTS) {
            if (span[breakpoint] !== before) classes.push(`col-${breakpoint}-${span[breakpoint]}`);
            before = span[breakpoint];
        }
        return classes.join(' ');
    });
};

const integer = (value) => new Intl.NumberFormat(locale()).format(value);

export const DASHBOARD_WIDGETS = [
    { id: 'upNext', title: t('Up next'), description: t('What waits for you: tournaments to enter and your matches, games left running, requests to answer'), kind: 'upNext', size: 'F', personal: true },
    { id: 'favourites', title: t('Your favourites'), description: t('The games you play most lately, to start again with one tap'), kind: 'favourites', size: 'L', personal: true },
    { id: 'training', title: t('Your training'), description: t('Average and checkout rate against the bot, compared with your games, and how regularly you train'), kind: 'training', size: 'M', personal: true },
    // the user's own weekly goals, in all their clubs (see components/goals)
    { id: 'practiceGoals', title: t('Your goals this week'), description: t('Your goals for the week: trainings, scores and games, in all your clubs'), kind: 'practiceGoals', size: 'S', personal: true },
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
    // the club rating (see app-api utils/compare.js): members whose rating settled, playing within a year
    { id: 'leaderRating', title: t('Strongest'), description: t('The club rating: wins weighed by whom they beat, from 5 games on'), kind: 'leaderboard', board: 'rating', unit: 'points', format: integer, size: 'S' },
];

/**
 * What a widget shows, always of the club chosen at the top: 'you' only the
 * user's own games, trainings and requests there, 'club' the whole club.
 * No widget looks at several clubs at once.
 */
const OWN = new Set(['upNext', 'favourites', 'training', 'practiceGoals', 'me']);
export const scopeOf = (widget) => (OWN.has(widget.id) ? 'you' : 'club');
export const SCOPES = {
    you: { label: t('Yours'), hint: t('Only your own games, trainings and requests in this club') },
    club: { label: t('Club'), hint: t('The whole club: all its members and games') },
};

// the widgets a club can show on My club (the personal ones only on one's own Dashboard)
export const CLUB_WIDGETS = DASHBOARD_WIDGETS.filter(widget => !widget.personal);

// in rows that fill on a desktop and pair widgets of about the same height: the numbers, oneself
// beside the recent games, the calendar beside its days, records beside the shame, three small ones, the leaders
export const DEFAULT_WIDGET_IDS = ['totals', 'me', 'timeline', 'activityCalendar', 'whenWePlay', 'records', 'hallOfShame', 'runningGames', 'clubGoals', 'headToHead', 'leaderMostWins', 'leaderX01Average', 'leader180s'];

const widgetOf = (id) => DASHBOARD_WIDGETS.find(widget => widget.id === id);
// the widgets with their own widths, the head-to-head a third here to sit beside two small ones
export const DEFAULT_LAYOUT = DEFAULT_WIDGET_IDS.map(id => ({ id, size: id === 'headToHead' ? 'S' : widgetOf(id).size }));
// one's own Dashboard until arranged: what waits, one's goals of the week beside the favourites (both short),
// the club's goals beside oneself (half each), the recent games across
export const PERSONAL_DEFAULT_LAYOUT = [
    { id: 'upNext', size: 'F' },
    { id: 'practiceGoals', size: 'S' },
    { id: 'favourites', size: 'L' },
    { id: 'clubGoals', size: 'M' },
    { id: 'me', size: 'M' },
    { id: 'timeline', size: 'F' },
];

/**
 * A layout as stored: [{ id, size }], or the plain widget ids clubs stored
 * before (each with its own width). Empty: the default set (fallback).
 */
export const toLayout = (stored, fallback = DEFAULT_LAYOUT) => {
    const items = (stored ?? []).map(item => typeof item === 'string' ? { id: item, size: widgetOf(item)?.size } : item);
    return items.length ? items : fallback;
};

/**
 * The widgets of a layout, in its order, each with its width and its columns:
 * [{ ...widget, size, cols }]. Widgets that no longer exist are left out, and
 * the Hall of Shame for clubs that switched it off, and those in `without`
 * (the user's own ones for someone who does not play in the club: they show
 * nothing). The columns fill each row (fillRows); while arranging (fill
 * false) each widget keeps exactly the width chosen.
 */
export const resolveLayout = (stored, { shameBadges = true, fallback = DEFAULT_LAYOUT, without = [], fill = true } = {}) => {
    const widgets = toLayout(stored, fallback)
        .map(item => {
            const widget = widgetOf(item.id);
            if (!widget) return null;
            const size = WIDGET_SIZES.some(entry => entry.value === item.size) ? item.size : widget.size;
            return { ...widget, size, cols: colsOf(size) };
        })
        .filter(Boolean)
        .filter(widget => shameBadges || widget.kind !== 'hallOfShame')
        .filter(widget => !without.includes(widget.id));
    if (!fill) return widgets;
    const cols = fillRows(widgets.map(widget => widget.size));
    return widgets.map((widget, index) => ({ ...widget, cols: cols[index] }));
};

// the arrangement of the club's page as its admins made it (undefined: the default set)
export const clubLayout = (club) => (club?.dashboardLayout?.length ? club.dashboardLayout : club?.dashboardWidgets);
