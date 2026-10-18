import { useContext } from 'react';

import EliminationContext from '../../../utils/elimination.context';
import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { knockBacks, liveScores } from './elimination.live';

/**
 * The race to the target: the players by score, live while the darts are
 * entered, with the distance to the target; for the player at the oche the
 * dart that sends someone back to 0.
 */
const EliminationStandings = () => {
    const { game, players, getCurrentThrowScore } = useContext(EliminationContext);
    const scores = liveScores(game, getCurrentThrowScore());
    const colourOf = (id) => PLAYER_COLORS[game.players.indexOf(id)];
    const knocks = new Map(knockBacks(game, scores, game.currentPlayerTurn).map(entry => [entry.playerId, entry.dart]));
    const ranked = [...game.players].sort((a, b) => scores[b] - scores[a]);

    return (
        <ul className="elimination-standings list-unstyled m-0">
            {ranked.map(id => {
                const player = players.find(entry => entry.id === id);
                const share = Math.min(100, Math.max(0, scores[id] / game.targetScore * 100));
                return (
                    <li key={id} className={id === game.currentPlayerTurn ? 'is-turn' : ''}>
                        <span className="d-flex align-items-center justify-content-between gap-2">
                            <span className="d-inline-flex align-items-center text-default fw-semibold text-truncate">
                                <span className="result-hero-dot" style={{ background: colourOf(id) }} aria-hidden="true" />{player?.nickname}
                            </span>
                            <span className="text-nowrap">
                                {knocks.has(id) && <span className="elimination-knock" title={`${knocks.get(id)} lands on this score: back to 0`}>{knocks.get(id)} sends back</span>}
                                <strong className="text-default">{scores[id]}</strong>
                                <span className="text-faint fs-8"> · {game.targetScore - scores[id]} to go</span>
                            </span>
                        </span>
                        <span className="elimination-track" aria-hidden="true">
                            <span style={{ width: `${share}%`, background: colourOf(id) }} />
                        </span>
                    </li>
                );
            })}
        </ul>
    );
};

export default EliminationStandings;
