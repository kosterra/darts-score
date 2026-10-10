import StatsCard from '../common/stats.card';

const PlayerOverallStats = ({ playerStats = {} }) => {
    const {
        playedGames = {},
        wonGames = {},
        avg = {},
        num180s = 0,
        num140plus = 0,
        checkouts = {},
        throwedDarts = {},
        throwedPoints = {},
    } = playerStats;

    const stats = [
        {
            title: 'Played Games',
            subtitle: 'X01',
            value: playedGames.x01
        },
        {
            title: 'Won Games',
            subtitle: 'X01',
            value: wonGames.x01,
            subvalue: playedGames.x01 ? `(${Math.round((wonGames.x01 * 100) / playedGames.x01)}%)` : '(0%)'
        },
        {
            title: 'Played Games',
            subtitle: 'Cricket',
            value: playedGames.cricket
        },
        {
            title: 'Won Games',
            subtitle: 'Cricket',
            value: wonGames.cricket,
            subvalue: playedGames.cricket ? `(${Math.round((wonGames.cricket * 100) / playedGames.cricket)}%)` : '(0%)'
        },
        {
            title: 'Overall Avg',
            subtitle: 'X01',
            value: avg.overallX01
        },
        {
            title: 'Avg Darts per Leg',
            subtitle: 'X01',
            value: avg.dartsPerLegX01
        },
        {
            title: "180's",
            subtitle: 'X01',
            value: num180s
        },
        {
            title: '140+',
            subtitle: 'X01',
            value: num140plus
        },
        {
            title: 'Checkout Rate',
            subtitle: 'X01',
            value: `${checkouts.hit || 0} / ${checkouts.total || 0}`,
            subvalue: checkouts.total ? `(${Math.round((checkouts.hit * 100) / checkouts.total)}%)` : '(0%)'
        },
        {
            title: 'Highest Checkout',
            subtitle: 'X01',
            value: checkouts.highest
        },
        {
            title: 'Throwed Darts',
            subtitle: 'X01',
            value: (throwedDarts.x01 || 0).toLocaleString('de-CH')
        },
        {
            title: 'Throwed Points',
            subtitle: 'X01',
            value: (throwedPoints.x01 || 0).toLocaleString('de-CH')
        },
    ];

    return (
        <div className="container overflow-hidden p-0 mt-4">
            <span className="d-flex justify-content-center align-items-center text-shade100 fs-4 fw-semibold mt-4">
                Game Statistics
            </span>
            <div className="row gy-4 mt-4 d-flex space-between">
                {stats.map((stat, idx) => (
                    <div key={idx} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                        <StatsCard
                            title={stat.title}
                            subtitle={stat.subtitle}
                            value={stat.value || 0}
                            subvalue={stat.subvalue || ''}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerOverallStats;
