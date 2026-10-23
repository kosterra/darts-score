import SideBySide from '../common/side.by.side';
import { t } from '../../../utils/i18n';

const RANGES = [['180s', '180'], ['160+', '160-179'], ['140+', '140-159'], ['120+', '120-139'], ['100+', '100-119']];

/**
 * The players of an X01 game side by side, for the whole game (valueKey
 * "game") or one set ("set-1", …): legs won, the high scores, the 3-dart
 * average and the checkout rate.
 */
const X01StatsComparisonBars = ({ valueKey, game, players }) => {
    const ids = players.map(player => player.id);
    const modelOf = (id) => game.playerModels?.[id] ?? {};

    const checkouts = ids.map(id => modelOf(id).checkout?.[valueKey] ?? {});
    const averages = ids.map(id => modelOf(id).averages?.[valueKey]?.overall ?? 0);

    const rows = [
        { key: 'legs', label: t('Legs won'), values: ids.map(id => modelOf(id).legsWon?.[valueKey] ?? 0) },
        ...RANGES.map(([label, range]) => ({
            key: range,
            label,
            values: ids.map(id => modelOf(id).scoreRanges?.[valueKey]?.[range] ?? 0),
        })),
        {
            key: 'average',
            label: t('3-dart average'),
            values: averages,
            texts: averages.map(average => average.toFixed(1)),
        },
        {
            key: 'checkout',
            label: t('Checkout'),
            values: checkouts.map(({ hit = 0, total = 0 }) => total ? hit / total : 0),
            texts: checkouts.map(({ hit = 0, total = 0 }) => total ? `${Math.round(hit / total * 100)} %` : '–'),
            // the lead in percentage points
            formatLead: (difference) => `${Math.round(difference * 100)} %`,
            details: checkouts.map(({ hit = 0, total = 0 }) => total ? `${hit}/${total}` : ''),
        },
    ];

    return <SideBySide rows={rows} players={players} />;
};

export default X01StatsComparisonBars;
