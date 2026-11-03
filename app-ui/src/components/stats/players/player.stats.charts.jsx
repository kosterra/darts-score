import AverageTrendChart from '../charts/average.trend.chart';
import HitsHeatmapChart from '../charts/hits.heatmap.chart';
import DoublesChart from '../charts/doubles.chart';
import { hasDoubles, hasHits } from '../charts/board.data';
import TrainingProgressChart from '../charts/training.progress.chart';
import AtcTargetsChart from '../charts/atc.targets.chart';
import { ScoreRangesChart, ScoringFinishingChart, DartsPerLegChart, FormChart } from '../charts/simple.bar.charts';
import { t } from '../../../utils/i18n';

/**
 * All charts of one player's profile. A chart without anything to show yet
 * (no averages, no form, no darts on the board, no legs won) is not drawn at full size: it goes to
 * the end, as a short card that says so.
 */
const PlayerStatsCharts = ({ playerStats = {}, players = [] }) => {
    const { avg = {}, sectionHits = [], checkouts = {}, scoreRanges = [], trend = [], form = [], scoring, dartsPerLeg = [], training = {}, trainingDarts } = playerStats;
    const hasTraining = Object.values(training).some(list => list.length > 0);

    // in the order of the page; wide ones take the whole row
    const charts = [
        { key: 'trend', wide: true, empty: trend.length === 0, chart: <AverageTrendChart data={trend} players={players} overall={avg.overallX01} /> },
        { key: 'form', empty: form.length === 0, chart: <FormChart data={form} /> },
        { key: 'scoring', empty: !scoring?.opening && !scoring?.finishing, chart: <ScoringFinishingChart scoring={scoring ? [scoring] : []} players={players} /> },
        { key: 'hits', empty: !hasHits([sectionHits]), chart: <HitsHeatmapChart hitsByPlayer={[sectionHits]} players={players} /> },
        { key: 'doubles', empty: !hasDoubles([checkouts.rates ?? []]), chart: <DoublesChart ratesByPlayer={[checkouts.rates ?? []]} players={players} /> },
        { key: 'ranges', empty: !scoreRanges.some(entry => Number(entry.count) > 0), chart: <ScoreRangesChart data={scoreRanges} players={players} /> },
        { key: 'legs', empty: !dartsPerLeg.some(entry => entry.count), chart: <DartsPerLegChart data={dartsPerLeg} players={players} /> },
    ];
    const shown = charts.filter(entry => !entry.empty);
    const empty = charts.filter(entry => entry.empty);
    // an odd one out of the halves takes the whole row rather than leave half of it empty
    const halves = shown.filter(entry => !entry.wide);
    const lastHalf = halves.length % 2 === 1 ? halves.at(-1) : null;

    return (
        <div className="row g-4">
            {shown.map(entry => <div key={entry.key} className={entry.wide || entry === lastHalf ? 'col-12' : 'col-12 col-xl-6'}>{entry.chart}</div>)}
            {hasTraining && <div className="col-12"><TrainingProgressChart progress={training} /></div>}
            {trainingDarts?.trainings > 0 && <>
                <div className="col-12 col-xl-6">
                    <TrainingProgressChart
                        progress={trainingDarts.progress}
                        title={t('Around the Clock · fewest darts')}
                        description={t('Fewest darts per mode, and how it improved with every round. Lower is better; 21 is perfect.')}
                        format={(value) => `${value}`}
                    />
                </div>
                <div className="col-12 col-xl-6"><AtcTargetsChart perTarget={trainingDarts.perTarget} trainings={trainingDarts.trainings} /></div>
            </>}
            {/* a card alone on the last row takes the rest of it */}
            {empty.map(entry => <div key={entry.key} className="col-12 col-md-6 col-xl-4 flex-grow-1">{entry.chart}</div>)}
        </div>
    );
};

export default PlayerStatsCharts;
