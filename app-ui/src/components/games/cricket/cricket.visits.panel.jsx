import { Panel } from 'primereact/panel';

import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { replayCricket } from '../../../utils/cricket.game.summary';

/**
 * Every visit of the game with the players side by side, a row per round,
 * the newest on top: the darts, the marks and the points so far.
 */
const CricketVisitsPanel = ({ game, players }) => {
    const { visits } = replayCricket(game);
    const columns = players.map(player => visits.filter(visit => visit.playerId === player.id));
    const rounds = Math.max(0, ...columns.map(list => list.length));
    // the points of the visits add up to the score only in Standard
    const scoring = (game.variant ?? 'Standard') === 'Standard';

    return (
        <Panel header="Visits" className="h-100">
            {rounds
                ? (
                    <div className="x01-legs-wrap x01-visits">
                        <table className="x01-legs">
                            <thead>
                                <tr>
                                    <th scope="col">Round</th>
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
                                                    <span className="text-subtle">{visit.marks} {visit.marks === 1 ? 'mark' : 'marks'}</span>
                                                    {scoring && <span className="x01-visit-left">{visit.totalPoints}</span>}
                                                </td>,
                                            ];
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
                : <p className="text-subtle fs-8 m-0">No visits yet.</p>
            }
        </Panel>
    );
};

export default CricketVisitsPanel;
