import AverageTrendChart from '../charts/average.trend.chart';
import HitsHeatmapChart from '../charts/hits.heatmap.chart';
import DoublesChart from '../charts/doubles.chart';
import TrainingProgressChart from '../charts/training.progress.chart';
import AtcTargetsChart from '../charts/atc.targets.chart';
import { ScoreRangesChart, ScoringFinishingChart, DartsPerLegChart, FormChart } from '../charts/simple.bar.charts';

/**
 * All charts of one player's profile.
 */
const PlayerStatsCharts = ({ playerStats = {}, players = [] }) => {
    const { avg = {}, sectionHits = [], checkouts = {}, scoreRanges = [], trend = [], form = [], scoring, dartsPerLeg = [], training = {}, trainingDarts } = playerStats;
    const hasTraining = Object.values(training).some(list => list.length > 0);

    return (
        <div className="row g-4">
            <div className="col-12"><AverageTrendChart data={trend} players={players} overall={avg.overallX01} /></div>
            <div className="col-12 col-xl-6"><FormChart data={form} /></div>
            <div className="col-12 col-xl-6"><ScoringFinishingChart scoring={scoring ? [scoring] : []} players={players} /></div>
            <div className="col-12 col-xl-6"><HitsHeatmapChart hitsByPlayer={[sectionHits]} players={players} /></div>
            <div className="col-12 col-xl-6"><DoublesChart ratesByPlayer={[checkouts.rates ?? []]} players={players} /></div>
            <div className="col-12 col-xl-6"><ScoreRangesChart data={scoreRanges} players={players} /></div>
            <div className="col-12 col-xl-6"><DartsPerLegChart data={dartsPerLeg} players={players} /></div>
            {hasTraining && <div className="col-12"><TrainingProgressChart progress={training} /></div>}
            {trainingDarts?.trainings > 0 && <>
                <div className="col-12 col-xl-6">
                    <TrainingProgressChart
                        progress={trainingDarts.progress}
                        title="Around the Clock · fewest darts"
                        description="Fewest darts per mode, and how it improved with every round. Lower is better; 21 is perfect."
                        format={(value) => `${value}`}
                    />
                </div>
                <div className="col-12 col-xl-6"><AtcTargetsChart perTarget={trainingDarts.perTarget} trainings={trainingDarts.trainings} /></div>
            </>}
        </div>
    );
};

export default PlayerStatsCharts;
