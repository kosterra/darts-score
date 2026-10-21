import { useContext, useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { useNavigate } from "react-router-dom";

import X01Context from '../../../utils/x01.context';
import X01LiveHeader from './x01.live.header';
import X01LiveFigures from './x01.live.figures';
import X01VisitsPanel from './x01.visits.panel';
import X01MoreStats from './x01.more.stats';
import X01FormCard from './x01.form.card';
import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import X01ScoreInputBoard from './x01.score.input.board';
import PageLoader from '../../elements/page.loader';

const X01Game = () => {
    const { game, players, loading, celebrating, training, quick } = useContext(X01Context);
    const navigate = useNavigate();
    const [more, setMore] = useState(false);

    // a moment of the winning visit (e.g. the big fish) plays to its end first; a
    // training also stays a moment on the finish, so a win of the bot is seen too
    useEffect(() => {
        if (!game?.hasWinner || celebrating) return undefined;
        const open = () => navigate(quick ? `/quick/stats/x01/${game.id}` : `/stats/${training ? 'training' : 'games'}/x01/${game.id}`, { replace: true, state: { justFinished: true } });
        if (!training) {
            open();
            return undefined;
        }
        const timer = setTimeout(open, 2200);
        return () => clearTimeout(timer);
    }, [game?.hasWinner, game?.id, celebrating, navigate, training, quick]);

    if (loading?.initGameLoading) {
        return <PageLoader />;
    }

    if (!game || !players?.length) {
        return (
            <div className="text-center text-subtle fs-6 mt-5">
                Game data not available.
            </div>
        );
    }

    const ordered = game.players.map(id => players.find(player => player.id === id)).filter(Boolean);

    return (
        <div className="game-stats-page x01-live">
            <X01LiveHeader />

            {/* a training on its finish, before its statistics open */}
            {training && game.hasWinner &&
                <div className="x01-bot-turn x01-training-won" role="status">
                    <i className="pi pi-trophy" aria-hidden="true" />
                    {ordered.find(player => game.playerModels[player.id]?.hasWonGame)?.nickname ?? 'Someone'} wins the training
                </div>
            }

            <X01ScoreInputBoard />

            <div className="row g-4 mb-4">
                <div className="col-12 col-xl-7">
                    <X01VisitsPanel game={game} players={ordered} />
                </div>
                <div className="col-12 col-xl-5">
                    <Panel header="Key figures" className="h-100">
                        <div className="x01-live-figures">
                            <X01LiveFigures game={game} players={ordered} />
                        </div>
                    </Panel>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-12">
                    <Panel header="Form">
                        <div className={`x01-form-list count-${ordered.length}`}>
                            {ordered.map((player, index) => (
                                <div key={player.id}>
                                    <span className="d-inline-flex align-items-center fw-semibold text-default fs-7 mb-1">
                                        <span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />{player.nickname}
                                    </span>
                                    <X01FormCard game={game} playerId={player.id} />
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>

            <div className="text-center mb-3">
                <Button
                    type="button"
                    label={more ? 'Fewer statistics' : 'More statistics'}
                    icon={more ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
                    text
                    aria-expanded={more}
                    onClick={() => setMore(!more)}
                />
            </div>
            {more && <X01MoreStats game={game} players={ordered} />}
        </div>
    );
};

export default X01Game;
