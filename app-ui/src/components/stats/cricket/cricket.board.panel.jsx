import { Panel } from 'primereact/panel';

import RoundsLineChart from '../charts/rounds.line.chart';
import { PLAYER_COLORS } from '../charts/chart.theme';
import { CRICKET_NUMBERS } from '../../../utils/cricket.game.summary';

// the marks on a number as on a cricket scoreboard: /, X, then a circled X once it is closed
const MARK_SYMBOLS = ['', '/', '✕', 'ⓧ'];

const numberLabel = (number) => number === 25 ? 'Bull' : String(number);

/**
 * The board at the end: every number with each player's marks and the points
 * they scored on it, and who closed it first; next to it the race to close
 * all seven numbers.
 */
const CricketBoardPanel = ({ board, players, closing }) => {
    const indexOf = new Map(players.map((player, index) => [player.id, index]));

    return (
        <div className="row g-4 mb-4">
            <div className="col-12 col-xl-6">
                <Panel header="The board" className="h-100">
                    <div className="cricket-board-wrap">
                        <table className="cricket-board">
                            <thead>
                                <tr>
                                    <th scope="col"><span className="d-none d-sm-inline">Number</span><span className="d-sm-none">No.</span></th>
                                    {players.map((player, index) => (
                                        <th key={player.id} scope="col" className="text-center" title={player.nickname}>
                                            <span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />
                                            <span className="cricket-board-name">{player.nickname}</span>
                                        </th>
                                    ))}
                                    <th scope="col"><span className="d-none d-sm-inline">Closed first</span><span className="d-sm-none">First</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {CRICKET_NUMBERS.map(number => {
                                    const row = board[number];
                                    const closer = row.closedBy;
                                    return (
                                        <tr key={number}>
                                            <th scope="row">{numberLabel(number)}</th>
                                            {players.map(player => {
                                                const marks = row.marks[player.id] ?? 0;
                                                const points = row.points[player.id] ?? 0;
                                                return (
                                                    <td key={player.id}>
                                                        {/* the same two columns in every row, so the marks line up */}
                                                        <span className="cricket-cell">
                                                            <span className={`cricket-marks ${marks >= 3 ? 'is-closed' : ''}`} aria-label={`${Math.min(marks, 3)} of 3 marks`}>
                                                                {MARK_SYMBOLS[Math.min(marks, 3)] || '·'}
                                                            </span>
                                                            <span className="cricket-points">{points > 0 ? `+${points}` : ''}</span>
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="text-nowrap">
                                                {closer
                                                    // on a phone only the player's colour, the names are in the head of the table
                                                    ? <span title={players[indexOf.get(closer)]?.nickname}><span className="result-hero-dot" style={{ background: PLAYER_COLORS[indexOf.get(closer)] }} aria-hidden="true" /><span className="d-none d-sm-inline">{players[indexOf.get(closer)]?.nickname}</span></span>
                                                    : <span className="text-faint">open</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <span className="d-block text-faint fs-8 mt-2">/ one mark, ✕ two, ⓧ closed; +points scored on the number.</span>
                </Panel>
            </div>
            <div className="col-12 col-xl-6">
                <RoundsLineChart
                    title="Race to close"
                    description="How far each player was towards closing 15 to 20 and the bull (21 marks) after every round."
                    data={closing}
                    players={players}
                    max={21}
                    unit="of 21 marks"
                />
            </div>
        </div>
    );
};

export default CricketBoardPanel;
