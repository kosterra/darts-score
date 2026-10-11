import { useContext, useMemo } from 'react';
import { Avatar } from 'primereact/avatar';
import { Tag } from 'primereact/tag';
import EliminationContext from '../../../utils/elimination.context';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

const EliminationScoreBoard = ({ playerId, idx }) => {
    const {
        game,
        players,
        getCurrentThrowScore,
        checkIfScoreIsBusted,
        getPointsToNextPlayer
    } = useContext(EliminationContext);

    const player = players.find(p => p.id === playerId);
    const playerModel = game.playerModels[playerId];

    const isCurrentPlayer = game.currentPlayerTurn === playerId;

    // Calculate the live score for display
    const liveScore = useMemo(() => {
        if (!player || !playerModel) return 0;
        return isCurrentPlayer
            ? playerModel.score + getCurrentThrowScore()
            : playerModel.score;
    }, [player, playerModel, isCurrentPlayer, getCurrentThrowScore]);

    // Calculate the live points needed to beat the next player
    const pointsToNext = useMemo(() => getPointsToNextPlayer(playerId), [getPointsToNextPlayer, playerId]);

    if (!player || !playerModel) return null;

    return (
        <div className="container-fluid py-xl-2 px-xl-2">
            <div className={`row pt-2 pb-2 ${game.players.length === 2 && Number(idx) === 1 ? 'flex-md-row-reverse' : ''}`}>
                <div className="col-7 col-xl-6 d-flex flex-column align-items-center justify-content-center p-0">
                    <div className="col-12 d-flex flex-row flex-xxl-column justify-content-center">
                        <div className="col-3 col-md-4 col-xxl-12 d-flex justify-content-center mb-xl-2">
                            <Avatar
                                label={resolvePlayerInitials(player.firstname, player.lastname)}
                                image={resolvePlayerImg(player.profileImg)}
                                shape="circle"
                                className="avatar-fluid"
                            />
                        </div>
                        <div className="col-7 col-md-8 col-xxl-12 d-flex flex-column justify-content-center align-items-center">
                            <div>
                                <span className="fs-6 text-shade100 fw-semibold">{player.nickname}</span>
                            </div>
                            <div>
                                <span className="fs-7 text-shade500 text-truncate" title={player.firstname + ' ' + player.lastname}>
                                    {player.firstname + ' ' + player.lastname}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="d-none d-md-flex col-12 justify-content-center align-items-center mt-3 gap-1">
                        {isCurrentPlayer ? (
                            <Tag value="&nbsp;Current Player&nbsp;" severity="success" rounded className="text-truncate fs-9" />
                        ) : (
                            <Tag value="&nbsp;" severity="" rounded className="text-truncate bg-transparent fs-9" />
                        )}
                    </div>
                </div>
                <div className="col-5 col-xl-6 d-flex flex-row flex-md-column align-items-center justify-content-center p-0">
                    <div className="flex-column d-flex justify-content-center align-items-center">
                        <div className="display-3 text-shade100 fw-semibold">
                            {isCurrentPlayer && checkIfScoreIsBusted(liveScore) ? 'BUST' : liveScore}
                        </div>
                        <div className="fs-6 text-shade100 mt-3 d-flex flex-column justify-content-center align-items-center">
                            <span className="fs-7 fw-semibold text-shade500">Points to beat next player</span>
                            <span className="fs-2 fw-semibold">{pointsToNext === 0 ? '-' : pointsToNext}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EliminationScoreBoard;
