import dayjs from 'dayjs';
import { t } from '../../../utils/i18n';

const GAME_TYPE_LABELS = { x01: 'X01', cricket: 'Cricket', elimination: 'Elimination', clock: 'Around the Clock' };
const PERIOD_LABELS = { '1 D': t('Today'), '1 W': t('Last week'), '1 M': t('Last month'), '1 Y': t('Last year'), 'All': t('All time') };

/**
 * The chosen filters in words, for the bar of a closed filter panel, and how
 * many of them differ from "defaults".
 */
export const describeFilters = (filters, defaults, { formats = [], withType = true, withScope = false, withOthers = true } = {}) => {
    const parts = [];
    if (withScope) parts.push(filters.scope === 'all' ? t('All clubs') : t('This club'));
    if (withType) parts.push(GAME_TYPE_LABELS[filters.type]);
    if (filters.period === 'Custom') {
        const [from, to] = filters.range ?? [];
        const day = (date) => dayjs(date).format('DD.MM.YY');
        parts.push(from ? (to ? `${day(from)} – ${day(to)}` : day(from)) : t('Choose dates'));
    } else {
        parts.push(PERIOD_LABELS[filters.period] ?? filters.period);
    }
    if (filters.lastGames !== 'All') parts.push(t('Last {{lastGames}} games', { lastGames: filters.lastGames }));
    const isX01 = !withType || filters.type === 'x01';
    if (isX01 && filters.startingScore !== 'All') parts.push(`${withType ? '' : 'X01 '}${filters.startingScore}`);
    if (isX01 && filters.format !== 'all') parts.push(formats.find(format => format.value === filters.format)?.label ?? filters.format);
    if (withOthers && filters.includeOthers) parts.push(t('With other players'));

    const changed = ['scope', 'period', 'lastGames', 'startingScore', 'format', 'includeOthers']
        .filter(key => key in defaults && filters[key] !== defaults[key]).length;
    return { summary: parts.filter(Boolean), changed };
};
