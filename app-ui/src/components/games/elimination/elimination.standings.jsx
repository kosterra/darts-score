import { useContext, useEffect, useRef, useState } from 'react';

import EliminationContext from '../../../utils/elimination.context';
import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { knockBacks, liveScores } from './elimination.live';
import { t } from '../../../utils/i18n';

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

    // a player sent back: their bar drops and wobbles for a moment; known in the
    // render that shows 0 already, so the bar falls with its own pace
    const previous = useRef(scores);
    const falling = (id) => scores[id] === 0 && (previous.current[id] ?? 0) > 0;
    const [dropped, setDropped] = useState({});
    const scoreLine = game.players.map(id => scores[id]).join();
    useEffect(() => {
        const fallen = game.players.filter(id => scores[id] === 0 && (previous.current[id] ?? 0) > 0);
        previous.current = scores;
        if (!fallen.length) return undefined;
        const key = Date.now();
        setDropped(current => ({ ...current, ...Object.fromEntries(fallen.map(id => [id, key])) }));
        const timer = setTimeout(() => setDropped(current => Object.fromEntries(Object.entries(current).filter(([, value]) => value !== key))), 1200);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scoreLine]);

    return (
        <ul className="elimination-standings list-unstyled m-0">
            {ranked.map(id => {
                const player = players.find(entry => entry.id === id);
                const share = Math.min(100, Math.max(0, scores[id] / game.targetScore * 100));
                return (
                    <li key={id} className={[id === game.currentPlayerTurn ? 'is-turn' : '', knocks.has(id) ? 'is-in-danger' : '', dropped[id] || falling(id) ? 'is-dropped' : ''].filter(Boolean).join(' ')}>
                        <span className="d-flex align-items-center justify-content-between gap-2">
                            <span className="d-inline-flex align-items-center text-default fw-semibold text-truncate">
                                <span className="result-hero-dot" style={{ background: colourOf(id) }} aria-hidden="true" />{player?.nickname}
                            </span>
                            <span className="text-nowrap">
                                {knocks.has(id) && <span className="elimination-knock" title={t('{{get}} lands on this score: back to 0', { get: knocks.get(id) })}>{knocks.get(id)}{' '}{t('sends back')}</span>}
                                <strong className="text-default">{scores[id]}</strong>
                                <span className="text-faint fs-8"> · {game.targetScore - scores[id]}{' '}{t('to go')}</span>
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
