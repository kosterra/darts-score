import { Tag } from 'primereact/tag';
import dayjs from 'dayjs';
import X01StatsScoreBoardPlayer from './x01.stats.scoreboard.player';

const X01StatsScoreBoardMultiple = ({ players, game }) => {
    const playerModels = game.playerModels;
    const formattedDate = dayjs(game.createdAt).format("DD.MM.YYYY HH:mm");
    const gameStatus = game.gameIsRunning ? 'Running' : 'Finished';
    const tagSeverity = game.gameIsRunning ? 'warning' : 'info';

    return (
        <div className="row bg-shade900 mb-3 p-3">
            {/* Obere Zeile: Datum & Status */}
            <div className="row p-3">
                <div className="col d-flex justify-content-center align-items-center">
                    <div className="d-flex flex-column justify-content-center align-items-center">
                        <div className="fs-8 fw-semibold text-shade500">{formattedDate}</div>
                        <div className="mt-3">
                            <Tag severity={tagSeverity} value={gameStatus} rounded />
                        </div>
                    </div>
                </div>
            </div>

            {/* Spieler-Zeile */}
            <div className="row p-3">
                {game.players.map((playerId, idx) => {
                    const player = players.find(p => p.id === playerId);
                    const setsWon = playerModels[playerId]?.setsWon || 0;
                    const hasWonGame = playerModels[playerId]?.hasWonGame || false;

                    return (
                        <div key={`player-${idx}`} className="col d-flex justify-content-center align-items-center">
                            <div className="d-flex flex-column justify-content-center align-items-center">
                                <X01StatsScoreBoardPlayer player={player} hasWonGame={hasWonGame} />
                                <div className="text-shade100 fs-1 fw-semibold mt-4">{setsWon}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default X01StatsScoreBoardMultiple;
