import { useContext, useEffect, useRef } from 'react';
import { Panel } from 'primereact/panel';
import { useNavigate } from 'react-router-dom';

import CricketContext from '../../../utils/cricket.context';
import CricketLiveHeader from './cricket.live.header';
import CricketScoreInputBoard from './cricket.score.input.board';
import CricketVisitsPanel from './cricket.visits.panel';
import LiveFigures from '../common/live.figures';
import PageLoader from '../../elements/page.loader';
import { cricketFigures, replayCricket } from '../../../utils/cricket.game.summary';
import { variantOf } from '../../../utils/cricket.variants';

/**
 * A running Cricket game in the look of the X01 page: the players on top, the
 * board and the visit, then the visits and the key figures. Once it is won
 * (and saved) the statistics page takes over and celebrates.
 */
const CricketGame = () => {
    const navigate = useNavigate();
    const { game, players, loading, winnerSaved, celebrating, quick } = useContext(CricketContext);

    // only a game won on this page is celebrated; a finished game opened later just shows its statistics
    const wasRunning = useRef(false);
    useEffect(() => {
        if (loading.initGameLoading || !game?.id) return;
        if (!game.hasWinner) {
            wasRunning.current = true;
            return;
        }
        const stats = quick ? `/quick/stats/cricket/${game.id}` : `/stats/games/cricket/${game.id}`;
        if (!wasRunning.current) navigate(stats, { replace: true });
        // a moment of the winning visit (e.g. the shut-out) plays to its end first
        else if (winnerSaved && !celebrating) navigate(stats, { replace: true, state: { justFinished: true } });
    }, [loading.initGameLoading, game?.hasWinner, game?.id, winnerSaved, celebrating, navigate, quick]);

    if (loading.initGameLoading) return <PageLoader />;

    if (!game?.players?.length || !players?.length) {
        return <div className="text-center text-subtle fs-6 mt-5">Game data not available.</div>;
    }

    const ordered = game.players.map(id => players.find(player => player.id === id)).filter(Boolean);
    const replay = replayCricket(game);
    const figures = Object.fromEntries(ordered.map(player => [player.id, cricketFigures(game, player.id, replay)]));
    const standard = variantOf(game) === 'Standard';
    const rows = [
        { label: 'Marks per round', value: (id) => figures[id].marksPerRound ?? null },
        { label: 'Marks', value: (id) => figures[id].marks },
        { label: 'Best round', value: (id) => figures[id].bestRound ? `${figures[id].bestRound} marks` : null },
        ...(standard ? [{ label: 'Most points in a round', value: (id) => figures[id].bestPoints || null }] : []),
        { label: 'Triples', value: (id) => figures[id].triples },
        { label: 'Bull marks', value: (id) => figures[id].bulls },
        { label: 'Closed first', value: (id) => figures[id].closedFirst },
        { label: 'Darts thrown', value: (id) => figures[id].dartsThrown, neutral: true },
    ];

    return (
        <div className="game-stats-page x01-live">
            <CricketLiveHeader />

            <CricketScoreInputBoard />

            <div className="row g-4 mb-4">
                <div className="col-12 col-xl-7">
                    <CricketVisitsPanel game={game} players={ordered} />
                </div>
                <div className="col-12 col-xl-5">
                    <Panel header="Key figures" className="h-100">
                        <div className="x01-live-figures">
                            <LiveFigures players={ordered} rows={rows} />
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default CricketGame;
