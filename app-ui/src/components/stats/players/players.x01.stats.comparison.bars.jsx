import ComparisonBar from '../../elements/comparison.bar';

/**
 * The players' X01 figures side by side as bars. Shown inside the
 * "X01 head to head" panel, so it brings no panel or title of its own.
 */
const PlayersX01StatsComparisonBars = (props) => {
    const {
        playersX01Stats
    } = props;

    const getChartData = (path, title) => {
        const source = path
            .split('.')
            .reduce((obj, key) => obj?.[key], playersX01Stats) ?? {};

        return [{ ...source, name: title }];
    };

    const getCheckoutData = () => {
        const stats = playersX01Stats?.checkouts ?? {}
        const total = stats.total ?? {}
        const hit = stats.hit ?? {}

        const makePlayerData = (playerKey) => {
            const totalVal = total[playerKey] ?? 0
            const hitVal = hit[playerKey] ?? 0

            const percentage = totalVal > 0 ? ((hitVal / totalVal) * 100).toFixed(1) : '0.0'
            const sub = `(${hitVal}/${totalVal})`

            return { [playerKey]: percentage, [`${playerKey}sub`]: sub }
        }

        return [{
            name: "Checkout",
            unit: "%",
            ...makePlayerData('player1'),
            ...makePlayerData('player2')
        }]
    }

    return (
        <div className="d-flex flex-column align-items-center gap-1 mt-2">
            {[
                { data: getChartData('wonGames', 'Won Games') },
                { data: getChartData('num180s', '180s') },
                { data: getChartData('num160plus', '160+') },
                { data: getChartData('num140plus', '140+') },
                { data: getChartData('avg.overall', '3-dart average') },
                { data: getChartData('avg.dartsPerLeg', 'AVG Darts per Leg') },
                { data: getCheckoutData() },          // Sonderfall mit Berechnung
                { data: getChartData('checkouts.highest', 'Highest Checkout') },
            ].map((item, idx) => (
                <ComparisonBar key={idx} data={item.data} />
            ))}
        </div>
    );
};

export default PlayersX01StatsComparisonBars;