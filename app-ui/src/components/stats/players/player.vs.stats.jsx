import { useState, useEffect } from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { SelectButton } from 'primereact/selectbutton';
import { Panel } from 'primereact/panel';

import StatsService from '../../../services/stats.service';
import X01Service from '../../../services/x01.service';
import PlayersX01StatsComparisonBars from './players.x01.stats.comparison.bars';
import AverageTrendChart from '../charts/average.trend.chart';
import HitsHeatmapChart from '../charts/hits.heatmap.chart';
import DoublesChart from '../charts/doubles.chart';
import { ScoreRangesChart, ScoringFinishingChart, DartsPerLegChart, LegsPerGameChart } from '../charts/simple.bar.charts';
import { sectionHitsOf } from '../charts/chart.theme';
import StatTile from './stat.tile';
import HeadToHeadTimeline from './head.to.head.timeline';

/**
 * Compares two or more players of the selected club.
 */
const PlayerVSStats = ({ players = [], showStatsFilter = true }) => {
    const [games, setGames] = useState([]);
    const [playerStats, setPlayerStats] = useState({});
    const [includeOthersValue, setIncludeOthersValue] = useState(false);
    const [dateFilterValue, setDateFilterValue] = useState('All');

    const dateFilter = ['1 D', '1 W', '1 M', '1 Y', 'All'];

    /** ─────────────────────────────
     * Data Loading
     * ───────────────────────────── */
    const loadX01Data = async () => {
        const playerIds = players.map(p => p.id);
        const body = { playerIds, includeOthers: includeOthersValue, dateFilter: dateFilterValue };

        const [x01Games, playersStats] = await Promise.all([
            X01Service.findX01Games(body),
            StatsService.loadX01PlayersStats(body),
        ]);
        setGames(x01Games);
        setPlayerStats(playersStats);
    };

    useEffect(() => {
        if (players.length >= 2) loadX01Data();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [players, includeOthersValue, dateFilterValue]);

    /** ─────────────────────────────
     * Rendering
     * ───────────────────────────── */
    const hasGames = playerStats?.playedGames > 0;

    return (
        <div className="d-flex flex-column gap-4">
            {showStatsFilter &&
                <div className="bg-surface-translucent rounded-2 p-3 d-flex flex-wrap align-items-center column-gap-4 row-gap-3">
                    <div className="d-flex flex-wrap align-items-center gap-3">
                        <span className="text-subtle fs-7">Period</span>
                        <SelectButton
                            value={dateFilterValue}
                            onChange={e => e.value && setDateFilterValue(e.value)}
                            options={dateFilter}
                            className="p-selectbutton-pills min-pills-width"
                            aria-label="Period"
                        />
                    </div>
                    <label htmlFor="compare-include-others" className="d-flex align-items-center gap-2 text-subtle fs-7">
                        <InputSwitch inputId="compare-include-others" checked={includeOthersValue} onChange={e => setIncludeOthersValue(e.value)} />
                        Include games with other players too
                    </label>
                </div>
            }

            {hasGames
                ? (
                    <>
                        <Panel header="X01 head to head">
                            <div className="row g-3 mb-3 align-items-center">
                                <div className="col-12 col-md-3 col-xl-2">
                                    <StatTile label="Games together" value={games.length} />
                                </div>
                                <div className="col-12 col-md-9 col-xl-10" style={{ minWidth: 0 }}>
                                    <span className="text-faint fs-8">Latest winners</span>
                                    <HeadToHeadTimeline games={games} players={players} />
                                </div>
                            </div>
                            <PlayersX01StatsComparisonBars playersX01Stats={playerStats} />
                        </Panel>
                        <div className="row g-4">
                            <div className="col-12"><AverageTrendChart data={playerStats.trend ?? []} players={players} /></div>
                            <div className="col-12 col-xl-6"><LegsPerGameChart games={games} players={players} /></div>
                            <div className="col-12 col-xl-6"><ScoringFinishingChart scoring={players.map((_, i) => playerStats.scoring?.[`player${i + 1}`])} players={players} /></div>
                            <div className="col-12"><HitsHeatmapChart hitsByPlayer={players.map((_, i) => sectionHitsOf(playerStats.sectionHits ?? [], i))} players={players} /></div>
                            <div className="col-12"><DoublesChart ratesByPlayer={players.map((_, i) => playerStats.checkouts?.rates?.[`player${i + 1}`] ?? [])} players={players} /></div>
                            <div className="col-12 col-xl-6"><ScoreRangesChart data={playerStats.scoreRanges ?? []} players={players} /></div>
                            <div className="col-12 col-xl-6"><DartsPerLegChart data={playerStats.dartsPerLeg ?? []} players={players} /></div>
                        </div>
                    </>
                )
                : <p className="text-subtle m-0">These players have no finished X01 games together in this period. Try a longer period, or include games with other players.</p>
            }
        </div>
    );
};

export default PlayerVSStats;
