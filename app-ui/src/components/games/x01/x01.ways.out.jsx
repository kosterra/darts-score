import { useContext, useState } from 'react';
import { Button } from 'primereact/button';

import X01Context from '../../../utils/x01.context';
import { outModeOf } from '../../../utils/x01.rules';
import { checkoutRoutes, formatRoute } from '../../../utils/checkout.routes';

// routes shown per number of darts before "Show all"
const SHOWN = 6;

/**
 * Every way the player at the oche can finish with the darts left in the
 * visit, grouped by the number of darts, the usual route first.
 */
const X01WaysOut = () => {
    const { game, getCurrentThrowScore, checkIfScoreIsBusted } = useContext(X01Context);
    const [expanded, setExpanded] = useState({});
    const playerId = game.currentPlayerTurn;
    const score = game.playerModels[playerId].score - getCurrentThrowScore();
    const dartsLeft = 3 - game.currentThrow.filter(dart => dart.trim() !== '').length;
    const outMode = outModeOf(game, playerId);
    const busted = checkIfScoreIsBusted(score);
    const routes = busted ? [] : checkoutRoutes(score, { dartsLeft, outMode });

    if (busted) return <p className="text-subtle fs-8 m-0">Bust: the score stays as it was.</p>;
    if (!routes.length) {
        return (
            <p className="text-subtle fs-8 m-0">
                {score > 170
                    ? `${score} left: no finish in one visit (170 is the highest).`
                    : `No finish for ${score} with ${dartsLeft} ${dartsLeft === 1 ? 'dart' : 'darts'}${outMode === 'Double Out' ? ' and a double' : ''}.`}
            </p>
        );
    }

    const groups = [1, 2, 3].map(count => ({ count, routes: routes.filter(route => route.length === count) })).filter(group => group.routes.length);

    return (
        <div className="x01-ways">
            <div className="x01-ways-best">
                <span className="x01-ways-label">Usual way</span>
                <span className="x01-ways-route is-preferred">{formatRoute(routes[0])}</span>
            </div>
            {groups.map(group => {
                const open = expanded[group.count];
                const shown = open ? group.routes : group.routes.slice(0, SHOWN);
                return (
                    <div key={group.count} className="x01-ways-group">
                        <span className="x01-ways-label">{group.count} {group.count === 1 ? 'dart' : 'darts'} · {group.routes.length} {group.routes.length === 1 ? 'way' : 'ways'}</span>
                        <div className="x01-ways-list">
                            {shown.map(route => <span key={route.join()} className="x01-ways-route">{formatRoute(route)}</span>)}
                        </div>
                        {group.routes.length > SHOWN &&
                            <Button
                                type="button"
                                label={open ? 'Fewer' : `Show all ${group.routes.length}`}
                                text
                                size="small"
                                className="p-0 mt-1 fs-8"
                                onClick={() => setExpanded({ ...expanded, [group.count]: !open })}
                            />
                        }
                    </div>
                );
            })}
        </div>
    );
};

export default X01WaysOut;
