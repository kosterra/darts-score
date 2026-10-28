import { FaArrowRotateLeft, FaBolt, FaBullseye, FaCrosshairs, FaFire, FaFlagCheckered, FaScaleBalanced, FaSkull, FaStopwatch, FaXmark } from 'react-icons/fa6';

import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';

import { PLAYER_COLORS } from '../charts/chart.theme';
import { KpiChip } from '../players/kpi';
import { t } from '../../../utils/i18n';

// X01: highest visit, best checkout, quickest leg, 180s, deciding leg;
// Cricket: best round in marks, most points, triples, bullseyes;
// Elimination: the biggest knock-out, all knock-outs, the winning visit, a comeback
const ICONS = {
    highest: FaBolt, checkout: FaCrosshairs, quickest: FaStopwatch, '180s': FaFire, decider: FaScaleBalanced,
    marks: FaXmark, points: FaBolt, triples: FaFire, bullseyes: FaBullseye,
    knockout: FaSkull, eliminations: FaSkull, finish: FaFlagCheckered, comeback: FaArrowRotateLeft,
};

/**
 * The moments of a game as the figure chips of the dashboard and profile,
 * e.g. the highest visit or the best round, each with the player and when it
 * happened. "color" is the colour of the game type. shares: the moments
 * worth a picture, [{ id, label, onShare }], each a button below.
 */
const MatchMoments = ({ moments, players, color, shares = [] }) => {
    if (!moments.length) return null;
    const byId = new Map(players.map((player, index) => [player.id, { player, color: PLAYER_COLORS[index] }]));

    return (
        <Panel header={t('Moments of the game')} className="mb-4">
            <div className="kpi-chips kpi-chips-wide">
                {moments.map(moment => {
                    const who = byId.get(moment.playerId);
                    return (
                        <KpiChip
                            key={moment.id}
                            icon={ICONS[moment.id]}
                            label={moment.label}
                            value={moment.value}
                            color={color}
                            detail={<>
                                {who && <><span className="result-hero-dot" style={{ background: who.color }} aria-hidden="true" />{who.player.nickname} · </>}
                                {moment.detail}
                            </>}
                        />
                    );
                })}
            </div>
            {shares.length > 0 &&
                <div className="d-flex flex-wrap gap-2 mt-3">
                    {shares.map(share => <Button key={share.id} label={share.label} icon="pi pi-share-alt" size="small" severity="secondary" onClick={share.onShare} />)}
                </div>}
        </Panel>
    );
};

export default MatchMoments;
