import { useState, useEffect } from 'react';
import { useParams, Link } from "react-router-dom";
import { Tag } from 'primereact/tag';
import { Avatar } from 'primereact/avatar';

import PlayerService from '../../../services/player.service';
import PageLoader from '../../elements/page.loader';
import EliminationService from '../../../services/elimination.service';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

const EliminationGameStats = () => {
    const { id } = useParams();
    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            const g = await EliminationService.loadEliminationGameById(id);
            const p = await PlayerService.findPlayersByIds(g.players);
            setGame(g);
            setPlayers(p);
        };
        loadData();
    }, [id]);

    if (!game || !players) return <PageLoader />;

    const winner = players.find(p => game.playerModels[p.id]?.hasWonGame);

    // Sort players by final score descending
    const rankedPlayers = [...players].sort((a, b) => {
        const scoreA = game.playerModels[a.id]?.score ?? 0;
        const scoreB = game.playerModels[b.id]?.score ?? 0;
        return scoreB - scoreA;
    });

    return (
        <div className="container-fluid p-4">
            {/* Winner Banner */}
            {winner && (
                <div className="row justify-content-center mb-4">
                    <div className="col-12 col-md-8 col-xl-6 text-center">
                        <div className="rounded-3 bg-surface-high p-4 shadow">
                            <div className="text-subtle fs-7 mb-1">🏆 Winner</div>
                            <div className="text-default fs-3 fw-bold">{winner.nickname}</div>
                            <div className="text-subtle fs-7">{winner.firstname} {winner.lastname}</div>
                            <div className="mt-2">
                                <Tag
                                    value={`Target: ${game.targetScore} · Out: ${game.gameOutMode}`}
                                    severity="success"
                                    rounded
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Per-player stats */}
            <div className="row justify-content-center g-3">
                {rankedPlayers.map((player, rank) => {
                    const model = game.playerModels[player.id];
                    if (!model) return null;

                    const totalDarts = model.totalThrow?.darts ?? 0;
                    const totalRounds = model.totalThrow?.rounds ?? 0;
                    const finalScore = model.score ?? 0;
                    const avgPerDart = totalDarts > 0 ? (finalScore / totalDarts).toFixed(2) : '—';
                    const avgPerRound = totalRounds > 0 ? (finalScore / totalRounds).toFixed(2) : '—';
                    const best = model.bestThreeDarts ?? 0;
                    const isWinner = model.hasWonGame;

                    return (
                        <div key={player.id} className="col-12 col-sm-6 col-xl-3">
                            <div className={`rounded-3 p-3 shadow ${isWinner ? 'bg-shade600' : 'bg-surface-high'}`}>
                                {/* Player header */}
                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <Avatar
                                        label={resolvePlayerInitials(player.firstname, player.lastname)}
                                        image={resolvePlayerImg(player.profileImg)}
                                        shape="circle"
                                        className="avatar-md"
                                    />
                                    <div>
                                        <div className="text-default fw-semibold">{player.nickname}</div>
                                        <div className="text-faint fs-8">{player.firstname} {player.lastname}</div>
                                        {isWinner && (
                                            <Tag value="Winner 🏆" severity="success" rounded className="mt-1 fs-9" />
                                        )}
                                    </div>
                                    <div className="ms-auto text-subtle fs-7">#{rank + 1}</div>
                                </div>

                                {/* Stats */}
                                <div className="d-flex flex-column gap-1 fs-7">
                                    <div className="d-flex justify-content-between">
                                        <span className="text-subtle">Final Score</span>
                                        <span className="text-default fw-semibold">{finalScore}</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-subtle">Darts Thrown</span>
                                        <span className="text-default">{totalDarts}</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-subtle">Rounds</span>
                                        <span className="text-default">{totalRounds}</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-subtle">Avg / Dart</span>
                                        <span className="text-default">{avgPerDart}</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-subtle">Avg / Round</span>
                                        <span className="text-default">{avgPerRound}</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-subtle">Best 3 Darts</span>
                                        <span className="text-default">{best}</span>
                                    </div>
                                </div>

                                {/* Score Ranges */}
                                {model.scoreRanges && Object.keys(model.scoreRanges).length > 0 && (
                                    <div className="mt-3 border-top border-default pt-2">
                                        <div className="text-faint fs-8 mb-1">Score Ranges</div>
                                        {Object.entries(model.scoreRanges)
                                            .sort((a, b) => a[0].localeCompare(b[0]))
                                            .map(([range, count]) => (
                                                <div key={range} className="d-flex justify-content-between fs-8">
                                                    <span className="text-subtle">{range}</span>
                                                    <span className="text-default">{count}x</span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Back link */}
            <div className="row justify-content-center mt-4">
                <div className="col-auto">
                    <Link to="/" className="btn btn-outline-secondary btn-sm">
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default EliminationGameStats;
