import { useContext } from 'react';

import X01Context from '../../../utils/x01.context';
import { outModeOf } from '../../../utils/x01.rules';
import { checkoutRoutes, formatRoute, scoringTip, setupSuggestions } from '../../../utils/checkout.routes';

// the usual way and this many others: nobody looks through hundreds
const OTHER_WAYS = 4;

// a plan of darts and what it leaves for the next visit
const Plan = ({ darts, leaves, note, preferred }) => (
    <div className="x01-ways-setup">
        <span className={`x01-ways-route ${preferred ? 'is-preferred' : ''}`}>{formatRoute(darts)}</span>
        <span className="x01-route-leaves text-subtle fs-8"><i className="pi pi-arrow-right" aria-hidden="true" />leaves <strong className="text-default">{leaves}</strong>{note ? `, ${note}` : ''}</span>
    </div>
);

/**
 * How the player at the oche gets out: the usual way with the darts left in the
 * visit and a few others; without a finish what to set up, or what to score to
 * leave a finish for the next visit, as is common practice.
 */
const X01WaysOut = () => {
    const { game, getCurrentThrowScore, checkIfScoreIsBusted } = useContext(X01Context);
    const playerId = game.currentPlayerTurn;
    const score = game.playerModels[playerId].score - getCurrentThrowScore();
    const dartsLeft = 3 - game.currentThrow.filter(dart => dart.trim() !== '').length;
    const outMode = outModeOf(game, playerId);

    if (checkIfScoreIsBusted(score)) return <p className="text-subtle fs-8 m-0">Bust: the score stays as it was.</p>;

    if (dartsLeft === 0) {
        const next = checkoutRoutes(score, { outMode })[0];
        return (
            <div className="x01-ways">
                <p className="text-subtle fs-8 m-0">All three darts are in: Enter score finishes the visit{score === 0 ? ' and the leg' : ''}.</p>
                {next &&
                    <div className="x01-ways-best">
                        <span className="x01-ways-label">Next visit</span>
                        <span className="x01-ways-route is-preferred">{formatRoute(next)}</span>
                    </div>
                }
            </div>
        );
    }

    const routes = checkoutRoutes(score, { dartsLeft, outMode });
    if (routes.length) {
        const others = routes.slice(1, 1 + OTHER_WAYS);
        return (
            <div className="x01-ways">
                <div className="x01-ways-best">
                    <span className="x01-ways-label">Usual way</span>
                    <span className="x01-ways-route is-preferred">{formatRoute(routes[0])}</span>
                </div>
                {others.length > 0 &&
                    <div className="x01-ways-group">
                        <span className="x01-ways-label">Other ways</span>
                        <div className="x01-ways-list">
                            {others.map(route => <span key={route.join()} className="x01-ways-route">{formatRoute(route)}</span>)}
                        </div>
                    </div>
                }
            </div>
        );
    }

    const setups = setupSuggestions(score, { dartsLeft, outMode });
    const tip = setups.length ? null : scoringTip(score, { dartsLeft, outMode });
    return (
        <div className="x01-ways">
            <p className="text-subtle fs-8 m-0">
                {score > 170
                    ? `${score} left: no finish in one visit (170 is the highest).`
                    : `No finish for ${score} with ${dartsLeft} ${dartsLeft === 1 ? 'dart' : 'darts'}${outMode === 'Double Out' ? ' and a double' : ''}.`}
            </p>
            {setups.length > 0 &&
                <div className="x01-ways-group">
                    <span className="x01-ways-label">Set up instead</span>
                    {setups.map((setup, index) => <Plan key={setup.darts.join()} {...setup} preferred={index === 0} />)}
                </div>
            }
            {tip &&
                <div className="x01-ways-group">
                    <span className="x01-ways-label">Tip</span>
                    {tip.darts && <Plan darts={tip.darts} leaves={tip.leaves} preferred />}
                    {tip.advice && <span className="text-subtle fs-8">{tip.advice}</span>}
                    {tip.darts && !tip.advice && <span className="text-subtle fs-8">Leaves a finish for the next visit.</span>}
                </div>
            }
        </div>
    );
};

export default X01WaysOut;
