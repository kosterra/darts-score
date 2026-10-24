import { t } from '../../../utils/i18n';
import { formatDate } from '../../../utils/dates';
import { GAME_TITLES } from '../../../utils/club.rules.labels';

const GAME_TYPE_LABELS = GAME_TITLES;
const PERIOD_LABELS = { '1 D': t('Today'), '1 W': t('Last week'), '1 M': t('Last month'), '1 Y': t('Last year'), 'All': t('All time') };

/**
 * The chosen filters in words, for the bar of a closed filter panel, and how
 * many of them differ from "defaults".
 */
export const describeFilters = (filters, defaults, { formats = [], withType = true, withScope = false, withOthers = true, withX01 = true, clubFormats = [] } = {}) => {
    const parts = [];
    if (withScope) parts.push(filters.scope === 'all' ? t('All clubs') : t('This club'));
    // the game type as a pill of its own (see FilterPanel)
    if (withType) parts.push({ type: filters.type, label: GAME_TYPE_LABELS[filters.type] });
    if (filters.period === 'Custom') {
        const [from, to] = filters.range ?? [];
        const day = (date) => formatDate(date, { year: 'short' });
        parts.push(from ? (to ? `${day(from)} – ${day(to)}` : day(from)) : t('Choose dates'));
    } else {
        parts.push(PERIOD_LABELS[filters.period] ?? filters.period);
    }
    if (filters.lastGames !== 'All') parts.push(t('Last {{lastGames}} games', { lastGames: filters.lastGames }));
    const isX01 = withX01 && (!withType || filters.type === 'x01');
    if (isX01 && filters.startingScore !== 'All') parts.push(`${withType ? '' : 'X01 '}${filters.startingScore}`);
    if (isX01 && filters.format !== 'all') parts.push(formats.find(format => format.value === filters.format)?.label ?? filters.format);
    if (withOthers && filters.includeOthers) parts.push(t('With other players'));
    if (filters.clubFormat && filters.clubFormat !== 'all') parts.push(clubFormats.find(format => format.id === filters.clubFormat)?.name ?? t('Club format'));
    if (filters.friendly === 'exclude') parts.push(t('Without friendly games'));

    const changed = ['scope', 'period', 'lastGames', 'startingScore', 'format', 'includeOthers', 'clubFormat', 'friendly']
        .filter(key => key in defaults && filters[key] !== defaults[key]).length;
    return { summary: parts.filter(Boolean), changed };
};
