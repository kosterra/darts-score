import { useState } from 'react';
import { Panel } from 'primereact/panel';
import { Dropdown } from 'primereact/dropdown';

import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { startingScoreOf } from '../../../utils/x01.rules';
import { legsInOrder } from '../../../utils/x01.form';
import { t } from '../../../utils/i18n';

/**
 * Every visit of a leg with the players side by side, a row per turn: the
 * darts, the score and what was left. The running leg by default; earlier
 * legs can be picked.
 */
const X01VisitsPanel = ({ game, players }) => {
    const legs = legsInOrder(game);
    const severalSets = game.numberOfSets > 1;
    const options = legs.map((leg, index) => ({
        value: index,
        label: t('{{value}}Leg {{leg}}{{value2}}', { value: severalSets ? `Set ${leg.set} · ` : '', leg: leg.leg, value2: leg.running ? ' · now' : '' }),
    })).reverse();
    // null follows the running leg
    const [picked, setPicked] = useState(null);
    const index = picked ?? legs.length - 1;
    const leg = legs[Math.min(index, legs.length - 1)];

    // each player's visits in this leg, with busts marked
    const visitsOf = (playerId) => {
        let left = startingScoreOf(game, playerId);
        return leg.throws.filter(visit => visit.playerId === playerId).map(visit => {
            const scoreLeft = Number(visit.scoreLeft);
            const bust = left === scoreLeft && Number(visit.roundScore) > 0;
            left = scoreLeft;
            return { ...visit, scoreLeft, bust };
        });
    };
    const columns = players.map(player => visitsOf(player.id));
    const turns = Math.max(0, ...columns.map(visits => visits.length));

    const header = (
        <div className="p-panel-header">
            <span className="p-panel-title">{t('Visits')}</span>
            {options.length > 1 &&
                <Dropdown
                    value={index}
                    options={options}
                    onChange={(e) => setPicked(e.value === legs.length - 1 ? null : e.value)}
                    className="x01-visits-leg"
                    aria-label={t('Leg')}
                />
            }
        </div>
    );

    return (
        <Panel headerTemplate={() => header} className="h-100">
            {turns
                ? (
                    <div className="x01-legs-wrap x01-visits">
                        <table className="x01-legs">
                            <thead>
                                <tr>
                                    <th scope="col">{t('Turn')}</th>
                                    {players.map((player, i) => (
                                        <th key={player.id} scope="col" colSpan={2}>
                                            <span className="d-inline-flex align-items-center text-nowrap">
                                                <span className="result-hero-dot" style={{ background: PLAYER_COLORS[i] }} aria-hidden="true" />{player.nickname}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="is-static">
                                {Array.from({ length: turns }, (_, turn) => turns - 1 - turn).map(turn => (
                                    <tr key={turn}>
                                        <td className="fw-semibold">{turn + 1}</td>
                                        {columns.map((visits, i) => {
                                            const visit = visits[turn];
                                            if (!visit) return [<td key={`${i}-d`} />, <td key={`${i}-s`} />];
                                            return [
                                                <td key={`${i}-d`}>
                                                    <span className="x01-visit-darts">{visit.darts.map((dart, d) => <span key={d}>{dart}</span>)}</span>
                                                </td>,
                                                <td key={`${i}-s`} className="text-end text-nowrap">
                                                    <span className={visit.bust ? 'x01-bust-text' : 'text-subtle'}>{visit.bust ? t('Bust') : visit.roundScore}</span>
                                                    <span className="x01-visit-left">{visit.scoreLeft}</span>
                                                </td>,
                                            ];
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
                : <p className="text-subtle fs-8 m-0">{t('No visits in this leg yet.')}</p>
            }
        </Panel>
    );
};

export default X01VisitsPanel;
