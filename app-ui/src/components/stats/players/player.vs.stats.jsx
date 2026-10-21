import { useState, useEffect } from 'react';
import { Panel } from 'primereact/panel';

import StatsService from '../../../services/stats.service';
import X01Service from '../../../services/x01.service';
import PlayersX01StatsComparisonBars from './players.x01.stats.comparison.bars';
import AverageTrendChart from '../charts/average.trend.chart';
import HitsHeatmapChart from '../charts/hits.heatmap.chart';
import DoublesChart from '../charts/doubles.chart';
import { ScoreRangesChart, ScoringFinishingChart, DartsPerLegChart, LegsPerGameChart } from '../charts/simple.bar.charts';
import { sectionHitsOf } from '../charts/chart.theme';
import HeadToHeadLayout from './head.to.head.layout';
import { t } from '../../../utils/i18n';

/**
 * Compares two or more players of the selected club in X01. "request" holds
 * the filters chosen in the page header (period, last games, starting score,
 * format, other players).
 */
const PlayerVSStats = ({ players = [], request }) => {
    const [games, setGames] = useState([]);
    const [playerStats, setPlayerStats] = useState({});

    const loadX01Data = async () => {
        const body = { ...request, playerIds: players.map(p => p.id) };
        const [x01Games, playersStats] = await Promise.all([
            X01Service.findX01Games(body),
            StatsService.loadX01PlayersStats(body),
        ]);
        setGames(x01Games);
        setPlayerStats(playersStats);
    };

    useEffect(() => {
        if (players.length >= 2) loadX01Data();
        // the request is rebuilt on every render; its content is what matters
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [players, JSON.stringify(request)]);

    /** ─────────────────────────────
     * Rendering
     * ───────────────────────────── */
    const hasGames = playerStats?.playedGames > 0;

    return (
        <div className="d-flex flex-column gap-4">
            {hasGames
                ? (
                    <>
                        <Panel header={t('X01 head to head')}>
                            <HeadToHeadLayout gamesTogether={games.length} games={games} players={players}>
                                <PlayersX01StatsComparisonBars playersX01Stats={playerStats} players={players} />
                            </HeadToHeadLayout>
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
                : <p className="text-subtle m-0">{t('These players have no finished X01 games together with these filters. Try a longer period or fewer filters, or include games with other players.')}</p>
            }
        </div>
    );
};

export default PlayerVSStats;
