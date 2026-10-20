/**
 * The arrangement of a dashboard: the widgets in their order, each with a
 * width (S a third, M half, L two thirds, F the full width). The app owns the
 * list of widgets; here only the shape is checked, so a widget the app no
 * longer knows is simply ignored there.
 */
export const WIDGET_SIZES = ['S', 'M', 'L', 'F'];
export const MAX_WIDGETS = 40;
const WIDGET_ID = /^[A-Za-z0-9]{1,40}$/;

// the width each widget had before they could be chosen, for arrangements made back then
const FORMER_SIZES = {
    me: 'S', totals: 'F', activityCalendar: 'L', whenWePlay: 'S', records: 'M', hallOfShame: 'M', headToHead: 'M',
    gamesPerMonth: 'M', clubForm: 'M', runningGames: 'S', timeline: 'L',
};

/**
 * A layout as sent by the app, made safe: [{ id, size }], each widget once,
 * at most MAX_WIDGETS. Anything else is left out.
 */
export const normalizeLayout = (items) => {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    const layout = [];
    for (const item of items) {
        const id = typeof item?.id === 'string' ? item.id : null;
        if (!id || !WIDGET_ID.test(id) || seen.has(id)) continue;
        seen.add(id);
        layout.push({ id, size: WIDGET_SIZES.includes(item.size) ? item.size : 'M' });
        if (layout.length === MAX_WIDGETS) break;
    }
    return layout;
};

/**
 * The layout of a list of widget ids, as clubs stored them before: every
 * widget keeps the width it had (the leaderboards a third).
 */
export const layoutFromWidgets = (ids) => normalizeLayout((ids ?? []).map(id => ({ id, size: FORMER_SIZES[id] ?? 'S' })));
