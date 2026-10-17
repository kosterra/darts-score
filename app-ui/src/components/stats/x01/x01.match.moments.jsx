import { FaBolt, FaCrosshairs, FaFire, FaScaleBalanced, FaStopwatch } from 'react-icons/fa6';

import { PLAYER_COLORS } from '../charts/chart.theme';

const ICONS = { highest: FaBolt, checkout: FaCrosshairs, quickest: FaStopwatch, '180s': FaFire, decider: FaScaleBalanced };

/**
 * The moments of the match in a row of small cards: highest visit, best
 * checkout, quickest leg, the 180s and a deciding leg.
 */
const X01MatchMoments = ({ moments, players }) => {
    if (!moments.length) return null;
    const byId = new Map(players.map((player, index) => [player.id, { player, color: PLAYER_COLORS[index] }]));

    return (
        <section className="x01-moments mb-4" aria-label="Moments of the match">
            {moments.map(moment => {
                const Icon = ICONS[moment.id];
                const who = byId.get(moment.playerId);
                return (
                    <div key={moment.id} className="x01-moment bg-surface rounded-2">
                        <Icon className="x01-moment-icon" aria-hidden="true" />
                        <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                            <span className="text-faint fs-8">{moment.label}</span>
                            <span className="text-default fw-semibold fs-5 lh-sm">{moment.value}</span>
                            <span className="text-subtle fs-8 text-truncate">
                                {who && <><span className="x01-result-dot" style={{ background: who.color }} aria-hidden="true" />{who.player.nickname} · </>}
                                {moment.detail}
                            </span>
                        </div>
                    </div>
                );
            })}
        </section>
    );
};

export default X01MatchMoments;
