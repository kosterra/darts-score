import { useContext, useEffect } from 'react';
import { Avatar } from 'primereact/avatar';
import { Tag } from 'primereact/tag';
import { FaCircle, FaRegCircle } from "react-icons/fa";

import CricketContext from '../../../utils/cricket.context';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

const CricketScoreBoard = ({ playerId, idx }) => {
    const {
        game,
        players,
        getCurrentThrowScore,
        getCurrentSectionHit,
        checkSectionClosed
    } = useContext(CricketContext);

    const player = players.find(p => p.id === playerId);

    useEffect(() => {
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                const submitButton = document.getElementById('submit-throws');
                if (submitButton) submitButton.click();
            }
        };
        document.addEventListener('keyup', handleEnter);
        return () => document.removeEventListener('keyup', handleEnter);
    }, []);

    if (!player) return null;

    const isCurrentPlayer = game.currentPlayerTurn === playerId;
    const score = isCurrentPlayer ? getCurrentThrowScore() : game.playerModels[playerId].score;
    const sectionHit = isCurrentPlayer ? getCurrentSectionHit() : game.playerModels[playerId].sectionHit;

    const renderNumberTemplate = (label, number) => {
        const hits = sectionHit[number.toString()] || 0;
        const filled = Math.min(hits, 3);
        const empty = 3 - filled;

        return (
            <div className="d-flex flex-row" key={number}>
                <div className={`col-4 d-flex justify-content-center text-shade100 fw-semibold p-0 ${checkSectionClosed(number) ? 'text-red text-decoration-line-through' : ''}`}>
                    {label}
                </div>
                <div className="col-8 d-flex justify-content-center align-items-center gap-1 p-0">
                    {[...Array(filled)].map((_, i) => <FaCircle key={`filled-${i}`} className="text-gold" />)}
                    {[...Array(empty)].map((_, i) => <FaRegCircle key={`empty-${i}`} className="text-gold" />)}
                </div>
            </div>
        );
    };

    return (
        <div className="container-fluid py-xl-2 px-xl-2">
            <div className={`row pt-2 pb-2 ${game.players.length === 2 && idx === 1 ? 'flex-md-row-reverse' : ''}`}>

                {/* Player Info */}
                <div className="col-4 d-flex flex-column align-items-center justify-content-center p-0">
                    <Avatar
                        label={resolvePlayerInitials(player.firstname, player.lastname)}
                        image={resolvePlayerImg(player.profileImg)}
                        shape="circle"
                        size="xlarge"
                        style={{ maxWidth: '5.2rem', maxHeight: '5.2rem' }}
                        className="w-100 h-100 ratio ratio-1x1"
                    />
                    <div className="text-center mt-2">
                        <div className="fs-6 text-shade100 fw-semibold">{player.nickname}</div>
                        <div className="fs-7 text-shade500 text-truncate" title={player.firstname + ' ' + player.lastname}>
                            {player.firstname + ' ' + player.lastname}
                        </div>
                    </div>

                    {/* Current Player Tag */}
                    <div className="d-flex mt-3 gap-1">
                        <Tag
                            value={isCurrentPlayer ? 'Current Player' : ''}
                            severity={isCurrentPlayer ? 'success' : ''}
                            rounded
                            className={`text-truncate fs-9 ${!isCurrentPlayer ? 'bg-transparent' : ''}`}
                        />
                    </div>
                </div>

                {/* Player Score */}
                <div className="col-4 d-flex justify-content-center align-items-center">
                    <div className="display-3 text-shade100 fw-semibold">{score}</div>
                </div>

                {/* Section Hits */}
                <div className="col-4 p-0">
                    {['20', '19', '18', '17', '16', '15', 'BULL'].map((num) => renderNumberTemplate(num === 'BULL' ? 'BULL' : num, num === 'BULL' ? 25 : Number(num)))}
                </div>
            </div>
        </div>
    );
};

export default CricketScoreBoard;
