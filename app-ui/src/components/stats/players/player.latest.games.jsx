import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { FaChartColumn } from 'react-icons/fa6';
import { GiDart } from 'react-icons/gi';
import dayjs from 'dayjs';

import StatsService from '../../../services/stats.service';
import GamePlayers from '../../dashboard/widgets/game.players';
import GameTypeTag from '../../elements/game.type.tag';
import GameStatusTag from '../../elements/game.status.tag';

/**
 * A player's latest games as a small timeline, with a way to all their games.
 */
const PlayerLatestGames = ({ player }) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        setData(null);
        StatsService.loadPlayerGames(player.id).then(setData).catch(() => setData({ total: 0, games: [], players: [] }));
    }, [player.id]);

    const playersById = useMemo(() => new Map((data?.players ?? []).map(entry => [entry.id, entry])), [data]);

    if (!data) return null;

    // the player's own result, for a quick read without looking at the scores
    const resultOf = (game) => {
        if (game.running) return null;
        return game.players.find(entry => entry.player === player.id)?.isWinner ? 'won' : 'lost';
    };

    return (
        <Panel header="Latest games" className="h-100">
            {data.games.length === 0
                ? <p className="text-subtle m-0">{player.nickname} has not played a game yet.</p>
                : (
                    <div className="d-flex flex-column gap-3">
                        <ol className="timeline list-unstyled m-0">
                            {data.games.map(game => {
                                const result = resultOf(game);
                                return (
                                    <li key={`${game.type}-${game.id}`} className={`timeline-entry ${game.running ? 'timeline-running' : ''}`}>
                                        <span className="timeline-time text-faint fs-8 text-nowrap">{dayjs(game.playedAt).format('DD.MM.')}</span>
                                        <div className="timeline-body">
                                            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                                <GameTypeTag type={game.type} />
                                                {result
                                                    ? <span className={`game-result game-result-${result}`}>{result === 'won' ? 'Won' : 'Lost'}</span>
                                                    : <GameStatusTag running />
                                                }
                                                <span className="text-faint fs-8">{game.format}</span>
                                            </div>
                                            <GamePlayers game={game} players={playersById} />
                                        </div>
                                        <div className="row-actions">
                                            {game.running
                                                ? <Link to={`/${game.type}/${game.id}`} className="row-action-link" title="Continue playing" aria-label="Continue playing"><GiDart /></Link>
                                                : <Link to={`/stats/games/${game.type}/${game.id}`} className="row-action-link" title="Show statistics" aria-label="Show statistics"><FaChartColumn /></Link>
                                            }
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                        <Link to={`/games?player=${player.id}`} className="align-self-start fs-7">
                            All {data.total} games of {player.nickname} <i className="pi pi-arrow-right fs-8 ms-1" aria-hidden="true" />
                        </Link>
                    </div>
                )
            }
        </Panel>
    );
};

export default PlayerLatestGames;
