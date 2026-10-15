const GAME_TYPE_LABELS = { x01: 'X01', cricket: 'Cricket', elimination: 'Elimination' };

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);

/**
 * Games played in the club, in total and per game type.
 */
const TotalsWidget = ({ totals }) => {
    const tiles = [
        ['Games played', totals.gamesPlayed],
        ...Object.entries(GAME_TYPE_LABELS).map(([type, label]) => [label, totals[type]]),
        ['Running now', totals.running],
    ];

    return (
        <div className="row g-3">
            {tiles.map(([label, value]) => (
                <div className="col-6 col-md" key={label}>
                    <div className="bg-surface rounded-2 py-3 text-center h-100">
                        <div className="fs-2 fw-semibold text-default" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(value)}</div>
                        <div className="text-subtle fs-7">{label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TotalsWidget;
