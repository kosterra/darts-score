import SideBySide from '../common/side.by.side';

/**
 * The players' X01 figures side by side. Shown inside the "X01 head to head"
 * panel, so it brings no panel or title of its own.
 * playersX01Stats holds every figure as { player1, player2, … }.
 */
const PlayersX01StatsComparisonBars = ({ playersX01Stats, players }) => {
    const valuesOf = (path) => {
        const source = path.split('.').reduce((obj, key) => obj?.[key], playersX01Stats) ?? {};
        return players.map((_, index) => Number(source[`player${index + 1}`] ?? 0));
    };

    const hits = valuesOf('checkouts.hit');
    const totals = valuesOf('checkouts.total');
    const averages = valuesOf('avg.overall');
    const dartsPerLeg = valuesOf('avg.dartsPerLeg');

    const rows = [
        { key: 'won', label: 'Won games', values: valuesOf('wonGames') },
        { key: '180', label: '180s', values: valuesOf('num180s') },
        { key: '160', label: '160+', values: valuesOf('num160plus') },
        { key: '140', label: '140+', values: valuesOf('num140plus') },
        { key: 'average', label: '3-dart average', values: averages, texts: averages.map(value => value.toFixed(1)) },
        { key: 'dartsPerLeg', label: 'Darts per leg', values: dartsPerLeg, lowerIsBetter: true },
        {
            key: 'checkout',
            label: 'Checkout',
            values: totals.map((total, index) => total ? hits[index] / total : 0),
            texts: totals.map((total, index) => total ? `${Math.round(hits[index] / total * 100)} %` : '–'),
            // the lead in percentage points
            formatLead: (difference) => `${Math.round(difference * 100)} %`,
            details: totals.map((total, index) => total ? `${hits[index]}/${total}` : ''),
        },
        { key: 'highest', label: 'Highest checkout', values: valuesOf('checkouts.highest') },
    ];

    return <SideBySide rows={rows} players={players} />;
};

export default PlayersX01StatsComparisonBars;
