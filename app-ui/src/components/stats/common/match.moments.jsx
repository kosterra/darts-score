import { FaBolt, FaBullseye, FaCrosshairs, FaFire, FaScaleBalanced, FaStopwatch, FaXmark } from 'react-icons/fa6';

import { PLAYER_COLORS } from '../charts/chart.theme';

// X01: highest visit, best checkout, quickest leg, 180s, deciding leg;
// Cricket: best round in marks, most points, triples, bullseyes
const ICONS = {
    highest: FaBolt, checkout: FaCrosshairs, quickest: FaStopwatch, '180s': FaFire, decider: FaScaleBalanced,
    marks: FaXmark, points: FaBolt, triples: FaFire, bullseyes: FaBullseye,
};

/**
 * The moments of a game in a row of small cards, e.g. the highest visit or
 * the best round, each with the player and when it happened.
 */
const MatchMoments = ({ moments, players }) => {
    if (!moments.length) return null;
    const byId = new Map(players.map((player, index) => [player.id, { player, color: PLAYER_COLORS[index] }]));

    return (
        <section className="match-moments mb-4" aria-label="Moments of the match">
            {moments.map(moment => {
                const Icon = ICONS[moment.id];
                const who = byId.get(moment.playerId);
                return (
                    <div key={moment.id} className="match-moment bg-surface rounded-2">
                        <Icon className="match-moment-icon" aria-hidden="true" />
                        <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                            <span className="text-faint fs-8">{moment.label}</span>
                            <span className="text-default fw-semibold fs-5 lh-sm">{moment.value}</span>
                            <span className="text-subtle fs-8 text-truncate">
                                {who && <><span className="result-hero-dot" style={{ background: who.color }} aria-hidden="true" />{who.player.nickname} · </>}
                                {moment.detail}
                            </span>
                        </div>
                    </div>
                );
            })}
        </section>
    );
};

export default MatchMoments;
