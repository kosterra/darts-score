import { Fragment, useContext, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";

import EliminationContext from '../../../utils/elimination.context';
import EliminationScoreBoard from './elimination.scoreboard';
import EliminationStatisticsBoard from './elimination.statisticsboard';
import EliminationScoreInputBoard from './elimination.score.input.board';
import EliminationGameHeader from './elimination.game.header';
import PageLoader from '../../elements/page.loader';

const EliminationGame = () => {
    const { game, players, loading } = useContext(EliminationContext);
    const navigate = useNavigate();
    const isInitialLoad = useRef(true);

    // Navigate to stats page when game ends — but skip the initial load
    useEffect(() => {
        if (loading.initGameLoading) return;

        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }

        if (game.hasWinner) {
            navigate(`/stats/games/elimination/${game.id}`, { replace: true });
        }
    }, [game.hasWinner, loading.initGameLoading, navigate, game.id]);

    if (loading.initGameLoading) {
        return <PageLoader />;
    }

    if (!players?.length || !game.playerModels || !game.players?.length) {
        return <PageLoader />;
    }

    return (
        <Fragment>
            <EliminationGameHeader
                targetScore={game.targetScore}
                gameInMode={game.gameInMode}
                gameOutMode={game.gameOutMode}
            />

            <div className="container-fluid">
                <div className="row justify-content-md-center">
                    {game.players.map((playerId, idx) => (
                        <div
                            key={`score-board-${playerId}`}
                            className={`col-12 col-md-6 col-xxl-3 border-top border-bottom border-opacity-50 ${idx < game.players.length - 1 ? 'border-end-md' : ''}`}
                        >
                            <EliminationScoreBoard playerId={playerId} idx={idx} />
                        </div>
                    ))}
                </div>
            </div>

            <EliminationScoreInputBoard />

            <div className="container-fluid mt-4">
                <div className="row justify-content-md-center">
                    {game.players.map((playerId, idx) => (
                        <div
                            key={`statistics-board-${playerId}`}
                            className={`col-6 col-lg-3 p-0 py-2 border-top border-bottom border-opacity-50 ${idx < game.players.length - 1 ? 'border-end-md' : ''}`}
                        >
                            <EliminationStatisticsBoard playerId={playerId} />
                        </div>
                    ))}
                </div>
            </div>
        </Fragment>
    );
};

export default EliminationGame;
