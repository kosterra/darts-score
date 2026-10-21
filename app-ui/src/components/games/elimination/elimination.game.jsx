import { useContext, useEffect, useRef } from 'react';
import { Panel } from 'primereact/panel';
import { useNavigate } from 'react-router-dom';

import EliminationContext from '../../../utils/elimination.context';
import EliminationLiveHeader from './elimination.live.header';
import EliminationScoreInputBoard from './elimination.score.input.board';
import EliminationVisitsPanel from './elimination.visits.panel';
import LiveFigures from '../common/live.figures';
import PageLoader from '../../elements/page.loader';
import { visitsOf } from './elimination.live';
import { t } from '../../../utils/i18n';

const OVER_100 = ['101-120', '121-140', '141-160', '161-180', '180'];

/**
 * A running Elimination game in the look of the X01 page: the players on top,
 * the board and the visit, then the visits and the key figures. Once it is won
 * (and saved) the statistics page takes over and celebrates.
 */
const EliminationGame = () => {
    const { game, players, loading, winnerSaved, celebrating } = useContext(EliminationContext);
    const navigate = useNavigate();

    // only a game won on this page is celebrated; a finished game opened later just shows its statistics
    const wasRunning = useRef(false);
    useEffect(() => {
        if (loading.initGameLoading || !game?.id) return;
        if (!game.hasWinner) {
            wasRunning.current = true;
            return;
        }
        if (!wasRunning.current) navigate(`/stats/games/elimination/${game.id}`, { replace: true });
        else if (winnerSaved && !celebrating) navigate(`/stats/games/elimination/${game.id}`, { replace: true, state: { justFinished: true } });
    }, [loading.initGameLoading, game?.hasWinner, game?.id, winnerSaved, celebrating, navigate]);

    if (loading.initGameLoading || !players?.length || !game.playerModels || !game.players?.length) {
        return <PageLoader />;
    }

    const ordered = game.players.map(id => players.find(player => player.id === id)).filter(Boolean);
    const stats = Object.fromEntries(ordered.map(player => {
        const visits = visitsOf(game, player.id);
        const model = game.playerModels[player.id] ?? {};
        // a bust scores 0, as in X01
        const scored = visits.reduce((sum, visit) => sum + visit.roundScore, 0);
        const darts = model.totalThrow?.darts ?? visits.reduce((sum, visit) => sum + visit.darts.length, 0);
        const ranges = model.scoreRanges ?? {};
        return [player.id, {
            average: darts ? (scored / darts * 3).toFixed(1) : null,
            best: model.bestThreeDarts || null,
            over100: OVER_100.reduce((sum, key) => sum + (Number(ranges[key]) || 0), 0),
            maximums: Number(ranges['180']) || 0,
            darts,
        }];
    }));
    const rows = [
        { label: t('Average'), value: (id) => stats[id].average },
        { label: t('Best visit'), value: (id) => stats[id].best },
        { label: t('Over 100'), value: (id) => stats[id].over100 },
        { label: t('180s'), value: (id) => stats[id].maximums },
        { label: t('Darts thrown'), value: (id) => stats[id].darts, neutral: true },
    ];

    return (
        <div className="game-stats-page x01-live">
            <EliminationLiveHeader />

            <EliminationScoreInputBoard />

            <div className="row g-4 mb-4">
                <div className="col-12 col-xl-7">
                    <EliminationVisitsPanel game={game} players={ordered} />
                </div>
                <div className="col-12 col-xl-5">
                    <Panel header={t('Key figures')} className="h-100">
                        <div className="x01-live-figures">
                            <LiveFigures players={ordered} rows={rows} />
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default EliminationGame;
