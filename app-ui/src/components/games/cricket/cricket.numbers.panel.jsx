import { useContext } from 'react';

import CricketContext from '../../../utils/cricket.context';
import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { CRICKET_NUMBERS } from '../../../utils/cricket.game.summary';
import { liveMarks, numberLabel } from './cricket.live';

// the marks on a number as on a cricket scoreboard: /, X, then a circled X once it is closed
const MARK_SYMBOLS = ['', '/', '✕', 'ⓧ'];

/**
 * The board of the running game: every number with each player's marks, the
 * darts of the visit being entered included (in gold); a number everyone
 * closed is out of play.
 */
const CricketNumbersPanel = () => {
    const { game, players, getCurrentSectionHit } = useContext(CricketContext);
    const ordered = game.players.map(id => players.find(player => player.id === id)).filter(Boolean);
    const marks = liveMarks(game, getCurrentSectionHit());
    const before = liveMarks(game, null);

    return (
        <div className="cricket-board-wrap">
            <table className="cricket-board cricket-live-board">
                <thead>
                    <tr>
                        <th scope="col" aria-label="Number" />
                        {ordered.map((player, index) => (
                            <th key={player.id} scope="col" className={`text-center ${player.id === game.currentPlayerTurn ? 'is-turn' : ''}`} title={player.nickname}>
                                <span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />
                                <span className="cricket-board-name">{player.nickname}</span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {CRICKET_NUMBERS.map(number => {
                        const dead = ordered.every(player => marks[player.id][number] >= 3);
                        return (
                            <tr key={number} className={dead ? 'is-dead' : ''}>
                                <th scope="row">{numberLabel(number)}</th>
                                {ordered.map(player => {
                                    const count = marks[player.id][number];
                                    const fresh = count > before[player.id][number];
                                    return (
                                        <td key={player.id} className="text-center">
                                            <span className={`cricket-marks ${count >= 3 ? 'is-closed' : ''} ${fresh ? 'is-new' : ''}`} aria-label={`${Math.min(count, 3)} of 3 marks`}>
                                                {MARK_SYMBOLS[Math.min(count, 3)] || '·'}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default CricketNumbersPanel;
