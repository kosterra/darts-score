import { useContext } from 'react';

import CricketContext from '../../../utils/cricket.context';
import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { CRICKET_NUMBERS } from '../../../utils/cricket.game.summary';
import { liveMarks, numberLabel } from './cricket.live';
import { t } from '../../../utils/i18n';

// the marks on a number as on a cricket scoreboard: /, X, then a circled X once it is closed
const MARK_SYMBOLS = ['', '/', '✕', 'ⓧ'];

/**
 * The board of the running game, flat enough to stay in view next to the
 * visit: the numbers across, a row per player with their marks, the darts of
 * the visit being entered included (in gold). A number everyone closed is out
 * of play; one the others all closed is marked, nothing more to score there.
 */
const CricketNumbersPanel = () => {
    const { game, players, getCurrentSectionHit } = useContext(CricketContext);
    const ordered = game.players.map(id => players.find(player => player.id === id)).filter(Boolean);
    const marks = liveMarks(game, getCurrentSectionHit());
    const before = liveMarks(game, null);
    const closedBy = (number) => ordered.filter(player => marks[player.id][number] >= 3);
    const dead = (number) => closedBy(number).length === ordered.length;
    // out of play only through the darts being entered: the chalk line is drawn now
    const killed = (number) => dead(number) && !ordered.every(player => before[player.id][number] >= 3);

    return (
        <div className="cricket-strip-wrap">
            <table className="cricket-strip">
                <thead>
                    <tr>
                        <th scope="col" aria-label={t('Player')} />
                        {CRICKET_NUMBERS.map(number => (
                            <th
                                key={number}
                                scope="col"
                                className={dead(number) ? 'is-dead' : ''}
                                title={dead(number) ? t('Closed by everyone: out of play') : t('Closed by {{value}}', { value: closedBy(number).map(player => player.nickname).join(', ') || 'nobody yet' })}
                            >
                                <span className="cricket-strip-number">
                                    {numberLabel(number)}
                                    {dead(number) && <span key={killed(number) ? 'drawn' : 'there'} className={`cricket-chalk ${killed(number) ? 'is-drawn' : ''}`} aria-hidden="true" />}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {ordered.map((player, index) => (
                        <tr key={player.id} className={player.id === game.currentPlayerTurn ? 'is-turn' : ''}>
                            <th scope="row" title={player.nickname}>
                                <span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />
                                <span className="cricket-strip-name">{player.nickname}</span>
                            </th>
                            {CRICKET_NUMBERS.map(number => {
                                const count = marks[player.id][number];
                                const fresh = count > before[player.id][number];
                                // closed by the darts being entered: stamped on, once
                                const stamped = fresh && count >= 3 && before[player.id][number] < 3;
                                return (
                                    <td key={number} className={dead(number) ? 'is-dead' : ''}>
                                        <span
                                            key={stamped ? 'stamped' : 'plain'}
                                            className={`cricket-marks ${count >= 3 ? 'is-closed' : ''} ${fresh ? 'is-new' : ''} ${stamped ? 'is-stamped' : ''}`}
                                            aria-label={t('{{numberLabel}}: {{min}} of 3 marks', { numberLabel: numberLabel(number), min: Math.min(count, 3) })}
                                        >
                                            {MARK_SYMBOLS[Math.min(count, 3)] || '·'}
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CricketNumbersPanel;
