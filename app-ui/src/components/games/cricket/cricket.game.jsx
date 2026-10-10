import { Fragment, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { SplitButton } from 'primereact/splitbutton';
import { PiShuffle, PiUserSwitch } from "react-icons/pi";
import { MdReplay } from "react-icons/md";

import CricketContext from '../../../utils/cricket.context';
import CricketModels from '../../../models/cricket.models';
import CricketService from '../../../services/cricket.service';
import CricketScoreBoard from './cricket.scoreboard';
import CricketScoreInputBoard from './cricket.score.input.board';
import PageLoader from '../../elements/page.loader';

const CricketGame = () => {
    const navigate = useNavigate();
    const { game, players, loading } = useContext(CricketContext);

    const onNewGame = () => navigate("/cricket", { replace: true });
    const onFinishGame = () => navigate("/", { replace: true });

    const onRestartGame = async (switchPlayers = false, shufflePlayers = false) => {
        const newMatchSetup = { ...CricketModels.CricketGameModel };
        newMatchSetup.isSoloGame = game.players.length === 1;
        newMatchSetup.startingScore = game.startingScore;
        newMatchSetup.numberOfPlayers = game.players.length;

        if (switchPlayers) {
            newMatchSetup.players = game.players.slice().reverse();
        } else if (shufflePlayers) {
            newMatchSetup.players = game.players.slice().sort(() => Math.random() - 0.5);
        } else {
            newMatchSetup.players = [...game.players];
        }

        newMatchSetup.currentPlayerTurn = newMatchSetup.players[0];
        newMatchSetup.playerModels = {};

        newMatchSetup.players.forEach(player => {
            newMatchSetup.playerModels[player] = {
                ...CricketModels.CricketPlayerModel,
                score: Number(game.startingScore)
            };
        });

        const newGame = await CricketService.createCricketGame(newMatchSetup);
        navigate('/cricket/' + newGame.id);
    };

    if (loading.initGameLoading) return <PageLoader />;

    return (
        <Fragment>
            <div className="d-flex justify-content-center mb-4">
                <div className="d-flex flex-column align-items-center rounded-bottom-4 bg-shade701 p-2 px-4">
                    <div className="text-shade100 fw-semibold fs-7">Cricket</div>
                </div>
            </div>

            <div className="container-fluid">
                <div className="row justify-content-md-center">
                    {game.players.map((playerId, idx) => (
                        <div
                            key={`score-board-col-${idx}`}
                            className={`col-12 col-md-6 col-xxl-3 border-top border-bottom border-opacity-50 ${idx < players.length - 1 ? 'border-end-md' : ''}`}
                        >
                            <CricketScoreBoard playerId={playerId} idx={idx} />
                        </div>
                    ))}
                </div>
            </div>

            <CricketScoreInputBoard />

            {game.hasWinner && (
                <div className="container-fluid mt-4">
                    <div className="row">
                        <div className="col d-flex justify-content-center align-items-center gap-2">
                            <SplitButton
                                label="PLAY AGAIN"
                                icon={<MdReplay className="me-2 fs-5" />}
                                onClick={onRestartGame}
                                size="small"
                                severity="primary"
                                model={[
                                    { label: 'Switch Players', icon: <PiUserSwitch className="me-2 mb-1 fs-5" />, visible: game.players.length === 2, command: () => onRestartGame(true) },
                                    { label: 'Shuffle Players', icon: <PiShuffle className="me-2 mb-1 fs-5" />, visible: game.players.length > 2, command: () => onRestartGame(false, true) }
                                ]}
                            />
                            <Button
                                label="NEW GAME"
                                icon="pi pi-plus"
                                onClick={onNewGame}
                                size="small"
                                outlined
                                severity="primary"
                            />
                            <Button
                                label="BACK HOME"
                                icon="pi pi-home"
                                onClick={onFinishGame}
                                size="small"
                                outlined
                                severity="primary"
                            />
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    );
}

export default CricketGame;
