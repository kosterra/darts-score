import { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { InputSwitch } from 'primereact/inputswitch';
import { SelectButton } from 'primereact/selectbutton';
import { Panel } from 'primereact/panel';

import PlayerSelect from '../../elements/player.select';
import StatsService from '../../../services/stats.service';
import X01Service from '../../../services/x01.service';
import GamesTimeline from '../../elements/games.timeline';
import PlayersX01StatsComparisonBars from './players.x01.stats.comparison.bars';
import X01StatsCharts from '../x01/x01.stats.charts';
import StatsCard from '../common/stats.card';
import ChartConfigOptions from '../common/chart.config.options';

const PlayerVSStats = ({ showStatsFilter = true, staticGameTypeFilterValue = 'X01' }) => {
    const [playersCount, setPlayersCount] = useState(2);
    const [players, setPlayers] = useState([]);
    const [games, setGames] = useState([]);
    const [playerStats, setPlayerStats] = useState({});
    const [gameTypeFilterValue, setGameTypeFilterValue] = useState(staticGameTypeFilterValue);
    const [includeOthersValue, setIncludeOthersValue] = useState(false);
    const [dateFilterValue, setDateFilterValue] = useState('All');

    const gameTypeFilter = ['X01', 'Cricket'];
    const dateFilter = ['1 D', '1 W', '1 M', '1 Y', 'All'];

    /** ─────────────────────────────
     * Player Handling
     * ───────────────────────────── */
    const onSelectPlayer = (player, idx) => {
        setPlayers(prev => {
            const updated = [...prev];
            updated[idx] = player;
            return updated;
        });
    };

    const onDeletePlayer = (idx) => {
        setPlayers(prev => prev.filter((_, i) => i !== idx));
    };

    const incrementPlayersCount = () => setPlayersCount(prev => prev + 1);
    const removePlayerCard = (idx) => {
        setPlayersCount(prev => prev - 1);
        onDeletePlayer(idx);
    };

    /** ─────────────────────────────
     * Data Loading
     * ───────────────────────────── */
    const loadX01Data = async () => {
        const playerIds = players.map(p => p.id);
        const body = { playerIds, includeOthers: includeOthersValue, dateFilter: dateFilterValue };

        if (gameTypeFilterValue === 'X01') {
            const [x01Games, playersStats] = await Promise.all([
                X01Service.findX01Games(body),
                StatsService.loadX01PlayersStats(body),
            ]);
            setGames(x01Games);
            setPlayerStats(playersStats);
        }
    };

    useEffect(() => {
        if (players.length === playersCount && players.every(Boolean)) {
            loadX01Data();
        }
    }, [players, gameTypeFilterValue, includeOthersValue, dateFilterValue]);

    /** ─────────────────────────────
     * UI Content
     * ───────────────────────────── */
    const startContent = (
        <SelectButton value={gameTypeFilterValue} onChange={e => setGameTypeFilterValue(e.value)} options={gameTypeFilter} />
    );

    const centerContent = (
        <div className="d-flex flex-column align-items-center justify-content-center gap-4">
            <span className="text-shade100 fs-8 fw-semibold">Date Range</span>
            <SelectButton
                value={dateFilterValue}
                onChange={e => setDateFilterValue(e.value)}
                options={dateFilter}
                className="p-selectbutton-pills min-pills-width"
            />
        </div>
    );

    const endContent = (
        <div className="d-flex align-items-center justify-content-center gap-2">
            <InputSwitch checked={includeOthersValue} onChange={e => setIncludeOthersValue(e.value)} />
            <span className="text-shade100 fs-8 fw-semibold">Include Games with other players</span>
        </div>
    );

    const legendContent = (
        <div>
            {players.map((p, i) => (
                <div className="row" key={i}>
                    <span className="col-4 d-flex justify-content-center align-items-center p-0">
                        <i className="pi pi-circle-fill fs-8" style={{ color: ChartConfigOptions.fillColors.values[i] }}></i>
                    </span>
                    <span className="col-8 fs-7 text-shade500 fw-semibold p-0">{p?.nickname ?? 'N/A'}</span>
                </div>
            ))}
        </div>
    );

    /** ─────────────────────────────
     * Rendering
     * ───────────────────────────── */
    const allPlayersSelected = players.filter(Boolean).length === playersCount;
    const noGamesFound = allPlayersSelected && playerStats?.playedGames === 0;
    const hasGames = playerStats?.playedGames > 0;

    return (
        <div className="container-fluid p-4 pt-0 border-0">
            {/* Player Selection */}
            <div className="row justify-content-center align-items-center">
                <div className="col-12 col-md-10 col-lg-8">
                    <div className="row justify-content-center align-items-center p-4 bg-shade900">
                        {Array.from({ length: playersCount }).map((_, idx) => (
                            <div key={idx} className="col-12 col-md-6 mt-4 mt-md-0">
                                <div className="position-relative">
                                    <PlayerSelect idx={idx} onSelect={onSelectPlayer} onDelete={onDeletePlayer} />
                                    {playersCount === idx + 1 && playersCount > 2 && (
                                        <span className="position-absolute top-0 start-100 translate-middle">
                                            <Button
                                                icon="pi pi-times"
                                                size="small"
                                                rounded
                                                severity="danger"
                                                className="text-shade100 fw-semibold me-4 mt-4"
                                                onClick={() => removePlayerCard(idx)}
                                            />
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {playersCount < 4 && (
                            <div className="col-12 col-md-6 mt-4 d-flex justify-content-center">
                                <Button
                                    icon="pi pi-plus"
                                    size="large"
                                    rounded
                                    severity="secondary"
                                    className="text-shade500 fw-semibold"
                                    onClick={incrementPlayersCount}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats + Charts */}
            {allPlayersSelected && (
                <>
                    {showStatsFilter && (
                        <div className="row justify-content-center align-items-center">
                            <div className="col-12 col-md-10 col-lg-8 px-3 bg-shade900">
                                <Toolbar start={startContent} center={centerContent} end={endContent} className="m-4 p-4" />
                            </div>
                        </div>
                    )}

                    {hasGames && (
                        <>
                            <div className="row justify-content-center align-items-center">
                                <div className="col-12 col-md-10 col-lg-8 p-0">
                                    <Panel>
                                        <div className="row">
                                            <div className="col-12 col-lg-6 p-0">
                                                <GamesTimeline games={games} players={players} />
                                            </div>
                                            <div className="col-12 col-lg-6 p-0">
                                                <Panel className="h-100">
                                                    <div className="d-flex flex-column align-items-center">
                                                        <span className="text-shade100 fs-4 fw-semibold mb-4 mt-4">Infos</span>
                                                        <div className="container overflow-hidden">
                                                            <div className="row gy-4 justify-content-center">
                                                                <div className="col-12 col-sm-6 col-lg-4">
                                                                    <StatsCard title="Played Games" value={games.length} className="panel-brighter-bg" />
                                                                </div>
                                                                <div className="col-12 col-sm-6 col-lg-4">
                                                                    <StatsCard title="Legend" value={legendContent} className="panel-brighter-bg" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Panel>
                                            </div>
                                        </div>

                                        <div className="row justify-content-center align-items-center">
                                            <div className="col-12 p-0">
                                                <PlayersX01StatsComparisonBars playersX01Stats={playerStats} />
                                            </div>
                                        </div>
                                    </Panel>
                                </div>
                            </div>

                            <div className="row justify-content-center align-items-center">
                                <div className="col-12 col-md-10 col-lg-8 p-0">
                                    <X01StatsCharts
                                        avg={playerStats?.avg?.perGame ?? []}
                                        sectionHits={playerStats?.sectionHits ?? {}}
                                        checkouts={playerStats?.checkouts?.rates ?? {}}
                                        scoreRanges={playerStats?.scoreRanges ?? {}}
                                        players={players}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {noGamesFound && (
                        <div className="d-flex justify-content-center mt-4">
                            <span className="empty-text text-shade500">No games found. Check the filters.</span>
                        </div>
                    )}
                </>
            )}

            {!allPlayersSelected && (
                <div className="d-flex justify-content-center mt-4">
                    <span className="empty-text text-shade500">
                        Please select {playersCount} players to compare statistics
                    </span>
                </div>
            )}
        </div>
    );
};

export default PlayerVSStats;
