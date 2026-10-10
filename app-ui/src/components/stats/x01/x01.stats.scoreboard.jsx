import { Tag } from 'primereact/tag';
import dayjs from 'dayjs';
import X01StatsScoreBoardPlayer from './x01.stats.scoreboard.player';

const X01StatsScoreBoard = ({ players, game }) => {
    const playerModels = game.playerModels;

    const player1 = players.find(p => p.id === game.players[0]);
    const player2 = players.find(p => p.id === game.players[1]);

    const setsScore = `${playerModels[game.players[0]].setsWon} - ${playerModels[game.players[1]].setsWon}`;
    const gameStatus = game.gameIsRunning ? 'Running' : 'Finished';
    const tagSeverity = game.gameIsRunning ? 'warning' : 'info';
    const formattedDate = dayjs(game.createdAt).format("DD.MM.YYYY HH:mm");

    return (
        <div className="row bg-shade900 mb-3 p-3">
            {/* Spieler 1 */}
            <div className="col d-flex justify-content-center align-items-center">
                <X01StatsScoreBoardPlayer
                    player={player1}
                    hasWonGame={playerModels[game.players[0]].hasWonGame}
                />
            </div>

            {/* Mittlere Spalte */}
            <div className="col d-flex flex-column justify-content-center align-items-center">
                <div className="fs-8 fw-semibold text-shade500">{formattedDate}</div>
                <div className="text-shade100 fs-1 fw-semibold">{setsScore}</div>
                <div className="mt-3">
                    <Tag severity={tagSeverity} value={gameStatus} rounded />
                </div>
            </div>

            {/* Spieler 2 */}
            <div className="col d-flex justify-content-center align-items-center">
                <X01StatsScoreBoardPlayer
                    player={player2}
                    hasWonGame={playerModels[game.players[1]].hasWonGame}
                />
            </div>
        </div>
    );
};

export default X01StatsScoreBoard;
