import X01StatsComparisonBars from './x01.stats.comparison.bars';

const X01StatsTab = ({ valueKey, game }) => {
    return (
        <div className="row">
            <div className="col">
                <X01StatsComparisonBars game={game} valueKey={valueKey} />
            </div>
        </div>
    );
};

export default X01StatsTab;
