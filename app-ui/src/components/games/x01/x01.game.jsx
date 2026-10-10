import { Fragment, useContext, useEffect } from 'react';
import { useNavigate } from "react-router-dom";

import X01Context from '../../../utils/x01.context';
import X01ScoreBoard from './x01.scoreboard';
import X01StatisticsBoard from './x01.statisticsboard';
import X01ScoreInputBoard from './x01.score.input.board';
import X01GameHeader from './x01.game.header';
import PageLoader from '../../elements/page.loader';

const X01Game = () => {
    const { game, players, loading } = useContext(X01Context);
    const navigate = useNavigate();

    useEffect(() => {
        if (game?.hasWinner) {
            navigate(`/stats/games/x01/${game.id}`, { replace: true });
        }
    }, [game?.hasWinner, game?.id, navigate]);

    if (loading?.initGameLoading) {
        return <PageLoader />;
    }

    if (!game || !players?.length) {
        return (
            <div className="text-center text-shade400 fs-6 mt-5">
                Game data not available.
            </div>
        );
    }

    return (
        <Fragment>
            <X01GameHeader
                setMode={game.setMode}
                numberOfSets={game.numberOfSets}
                legMode={game.legMode}
                numberOfLegs={game.numberOfLegs}
                legInMode={game.legInMode}
                legOutMode={game.legOutMode}
            />

            {/* --- Scoreboard Section --- */}
            <div className="container-fluid">
                <div className="row justify-content-md-center">
                    {game.players.map((playerId, idx) => (
                        <div
                            key={`score-board-col-${playerId}`}
                            className={`col-12 col-md-6 col-xxl-3 border-top border-bottom border-opacity-50 ${idx < players.length - 1 ? 'border-end-md' : ''
                                }`}
                        >
                            <X01ScoreBoard playerId={playerId} idx={idx} />
                        </div>
                    ))}
                </div>
            </div>

            <X01ScoreInputBoard />

            {/* --- Statistics Section --- */}
            <div className="container-fluid mt-4">
                <div className="row justify-content-md-center">
                    {game.players.map((playerId, idx) => (
                        <div
                            key={`statistics-board-col-${playerId}`}
                            className={`col-6 col-lg-3 p-0 py-2 border-top border-bottom border-opacity-50 ${idx < players.length - 1 ? 'border-end-md' : ''
                                }`}
                        >
                            <X01StatisticsBoard playerId={playerId} />
                        </div>
                    ))}
                </div>
            </div>
        </Fragment>
    );
};

export default X01Game;
