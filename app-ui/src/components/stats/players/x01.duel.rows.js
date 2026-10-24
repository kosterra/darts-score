import { t } from '../../../utils/i18n';

/**
 * The rows of the players' X01 figures, for the table and the comparison in words.
 */
export const x01DuelRows = (playersX01Stats, players) => {
    const valuesOf = (path) => {
        const source = path.split('.').reduce((obj, key) => obj?.[key], playersX01Stats) ?? {};
        return players.map((_, index) => Number(source[`player${index + 1}`] ?? 0));
    };

    const hits = valuesOf('checkouts.hit');
    const totals = valuesOf('checkouts.total');
    const averages = valuesOf('avg.overall');
    const dartsPerLeg = valuesOf('avg.dartsPerLeg');

    const rows = [
        { key: 'won', label: t('Won games'), values: valuesOf('wonGames'), weight: 2 },
        { key: '180', label: t('180s'), values: valuesOf('num180s') },
        { key: '160', label: '160+', values: valuesOf('num160plus') },
        { key: '140', label: '140+', values: valuesOf('num140plus') },
        { key: 'average', label: t('3-dart average'), values: averages, texts: averages.map(value => value.toFixed(1)), weight: 3 },
        { key: 'dartsPerLeg', label: t('Darts per leg'), values: dartsPerLeg, lowerIsBetter: true, weight: 2 },
        {
            key: 'checkout',
            label: t('Checkout'),
            weight: 2.5,
            values: totals.map((total, index) => total ? hits[index] / total : 0),
            texts: totals.map((total, index) => total ? `${Math.round(hits[index] / total * 100)} %` : '–'),
            // the lead in percentage points
            formatLead: (difference) => `${Math.round(difference * 100)} %`,
            details: totals.map((total, index) => total ? `${hits[index]}/${total}` : ''),
        },
        { key: 'highest', label: t('Highest checkout'), values: valuesOf('checkouts.highest') },
    ];
    return rows;
};
