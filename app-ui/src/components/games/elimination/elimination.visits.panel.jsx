import { Panel } from 'primereact/panel';

import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { visitsOf } from './elimination.live';
import { t } from '../../../utils/i18n';

/**
 * Every visit of the game with the players side by side, a row per round,
 * the newest on top: the darts, the score and the total after it.
 */
const EliminationVisitsPanel = ({ game, players }) => {
    const columns = players.map(player => visitsOf(game, player.id));
    const rounds = Math.max(0, ...columns.map(list => list.length));

    return (
        <Panel header={t('Visits')} className="h-100">
            {rounds
                ? (
                    <div className="x01-legs-wrap x01-visits">
                        <table className="x01-legs">
                            <thead>
                                <tr>
                                    <th scope="col">{t('Round')}</th>
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
                                {Array.from({ length: rounds }, (_, round) => rounds - 1 - round).map(round => (
                                    <tr key={round}>
                                        <td className="fw-semibold">{round + 1}</td>
                                        {columns.map((list, i) => {
                                            const visit = list[round];
                                            if (!visit) return [<td key={`${i}-d`} />, <td key={`${i}-s`} />];
                                            return [
                                                <td key={`${i}-d`}>
                                                    <span className="x01-visit-darts">{visit.darts.map((dart, d) => <span key={d}>{dart}</span>)}</span>
                                                </td>,
                                                <td key={`${i}-s`} className="text-end text-nowrap">
                                                    <span className={visit.bust ? 'x01-bust-text' : 'text-subtle'}>{visit.bust ? t('Bust') : visit.roundScore}</span>
                                                    <span className="x01-visit-left">{visit.total}</span>
                                                </td>,
                                            ];
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
                : <p className="text-subtle fs-8 m-0">{t('No visits yet.')}</p>
            }
        </Panel>
    );
};

export default EliminationVisitsPanel;
