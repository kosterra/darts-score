import { useState, useEffect, useCallback, useMemo } from 'react';

import PlayerOverallStats from './player.overall.stats';
import StatsService from '../../../services/stats.service';
import PlayerStatsCharts from './player.stats.charts';
import PlayerSelect from '../../elements/player.select';

const PlayerStats = () => {
    const [player, setPlayer] = useState(null);
    const [playerStats, setPlayerStats] = useState(null);

    const loadX01Stats = useCallback(async (playerId) => {
        if (!playerId) return;
        try {
            const data = await StatsService.loadPlayerStats(playerId);
            setPlayerStats(data);
        } catch (err) {
            console.error('Error loading player stats:', err);
        }
    }, []);

    useEffect(() => {
        if (player) loadX01Stats(player.id);
    }, [player, loadX01Stats]);

    const handleSelect = useCallback((selected) => setPlayer(selected), []);
    const handleDelete = useCallback(() => {
        setPlayer(null);
        setPlayerStats(null);
    }, []);

    const hasPlayer = !!player;
    const hasStats = playerStats && Object.keys(playerStats).length > 0;

    const content = useMemo(() => {
        if (!hasPlayer) {
            return (
                <div className="d-flex justify-content-center mt-4">
                    <span className="empty-text text-shade500">
                        Please select a player to show the statistics
                    </span>
                </div>
            );
        }

        if (hasPlayer && !hasStats) {
            return (
                <div className="d-flex justify-content-center mt-4">
                    <span className="empty-text text-shade500">
                        No statistics found for this player
                    </span>
                </div>
            );
        }

        return (
            <>
                <div className="row d-flex justify-content-center align-items-center">
                    <div className="col-xs-12 col-sm-12 col-md-10 col-lg-8 p-0">
                        <PlayerOverallStats playerStats={playerStats} />
                    </div>
                </div>
                <div className="row d-flex justify-content-center align-items-center">
                    <div className="col-xs-12 col-sm-12 col-md-10 col-lg-8 p-0">
                        <PlayerStatsCharts playerStats={playerStats} players={[player]} />
                    </div>
                </div>
            </>
        );
    }, [hasPlayer, hasStats, player, playerStats]);

    return (
        <div className="container-fluid p-4 pt-0 border-0">
            <div className="row d-flex justify-content-center align-items-center">
                <div className="col-xs-12 col-sm-12 col-md-10 col-lg-8">
                    <div className="row d-flex justify-content-center align-items-center p-4 bg-shade900">
                        <div className="col-xs-12 col-sm-12 col-md-10 col-lg-6 col-xxl-4">
                            <PlayerSelect idx={0} onSelect={handleSelect} onDelete={handleDelete} />
                        </div>
                    </div>
                </div>
            </div>

            {content}
        </div>
    );
};

export default PlayerStats;
