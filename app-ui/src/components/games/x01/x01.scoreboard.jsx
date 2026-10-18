import { useContext } from 'react';
import { Avatar } from 'primereact/avatar';
import { FaCircle, FaRegCircle } from "react-icons/fa";
import { GiDart } from "react-icons/gi";

import X01Context from '../../../utils/x01.context';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { describeRules, hasHandicap, rulesOf } from '../../../utils/x01.rules';
import { checkoutRouteOf, legSummaryOf } from '../../../utils/x01.live';

/**
 * Legs or sets won as filled circles out of those needed, or as a number when
 * there are too many for circles.
 */
const WonCount = ({ label, won, mode, count }) => {
    const needed = mode === 'Best of' ? Math.round(count / 2) : count;
    const circles = mode === 'Best of' ? count <= 5 : count <= 4;
    return (
        <div className="x01-won">
            <span className="x01-won-label">{label}</span>
            {circles
                ? (
                    <span className="x01-won-circles" aria-label={`${won} of ${needed}`}>
                        {Array.from({ length: needed }, (_, index) => index < won
                            ? <FaCircle key={index} className="text-gold" />
                            : <FaRegCircle key={index} className="text-gold" />)}
                    </span>
                )
                : <span className="x01-won-number">{won}</span>
            }
        </div>
    );
};

/**
 * One player of a running X01 game: the score left (live while the darts of
 * the visit are entered), the way out, the last visit, darts and average in
 * the leg, and the legs and sets won. The player at the oche is highlighted.
 */
const X01ScoreBoard = ({ playerId }) => {
    const { game, players, getCurrentThrowScore, checkIfScoreIsBusted } = useContext(X01Context);

    const player = players.find(entry => entry.id === playerId);
    if (!player) return null;

    const model = game.playerModels[playerId];
    const isCurrent = game.currentPlayerTurn === playerId;
    const score = isCurrent ? model.score - getCurrentThrowScore() : model.score;
    const busted = isCurrent && checkIfScoreIsBusted(score);
    const route = busted ? null : checkoutRouteOf(game, playerId, score);
    const leg = legSummaryOf(game, playerId);

    return (
        <div className={`x01-player ${isCurrent ? 'is-current' : ''}`} aria-current={isCurrent ? 'true' : undefined}>
            <div className="x01-player-head">
                <Avatar
                    label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname, player.lastname)}
                    image={resolvePlayerImg(player.profileImg)}
                    shape="circle"
                    className="avatar-md flex-shrink-0"
                />
                <div className="x01-player-name">
                    <span className="x01-player-nickname">{player.nickname}</span>
                    {hasHandicap(game)
                        ? <span className="x01-handicap-rules" title={`Handicap: ${rulesOf(game, playerId).startingScore}, ${rulesOf(game, playerId).legInMode} / ${rulesOf(game, playerId).legOutMode}`}>{describeRules(rulesOf(game, playerId))}</span>
                        : <span className="x01-player-detail">{isCurrent ? 'Throwing' : `${player.firstname ?? ''} ${player.lastname ?? ''}`.trim()}</span>
                    }
                </div>
                {game.startingPlayerLeg === playerId &&
                    <span className="x01-player-starter" title="Threw first in this leg"><GiDart aria-hidden="true" /> Started</span>
                }
            </div>

            <div className={`x01-player-score ${busted ? 'is-bust' : ''}`}>{busted ? 'BUST' : score}</div>
            <div className="x01-player-route" aria-label={route ? `Checkout ${route}` : undefined}>{route ?? ' '}</div>

            <div className="x01-player-leg">
                <span>Last <strong>{leg.lastVisit ? (leg.lastVisit.bust ? 'Bust' : leg.lastVisit.score) : '–'}</strong></span>
                <span><strong>{leg.darts}</strong> darts</span>
                <span>Avg <strong>{leg.average == null ? '–' : leg.average.toFixed(1)}</strong></span>
            </div>

            <div className="x01-player-won">
                <WonCount label="Legs" won={model.currentSetLegsWon} mode={game.legMode} count={game.numberOfLegs} />
                {game.numberOfSets > 1 && <WonCount label="Sets" won={model.setsWon} mode={game.setMode} count={game.numberOfSets} />}
            </div>
        </div>
    );
};

export default X01ScoreBoard;
