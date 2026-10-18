import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { startingScoreOf } from '../../../utils/x01.rules';

/**
 * Every visit of the running leg, the latest first, in the table look of the
 * statistics page: who threw, the darts, the score and what it left.
 */
const X01LegVisits = ({ game, players }) => {
    const indexOf = new Map(game.players.map((id, index) => [id, index]));
    const nameOf = (id) => players.find(player => player.id === id)?.nickname ?? '–';
    const left = Object.fromEntries(game.players.map(id => [id, startingScoreOf(game, id)]));
    const turns = Object.fromEntries(game.players.map(id => [id, 0]));
    const visits = (game.currentLegThrows ?? []).map(visit => {
        const scoreLeft = Number(visit.scoreLeft);
        const bust = left[visit.playerId] === scoreLeft && Number(visit.roundScore) > 0;
        left[visit.playerId] = scoreLeft;
        turns[visit.playerId] += 1;
        return { ...visit, turn: turns[visit.playerId], scoreLeft, bust };
    }).reverse();

    if (!visits.length) return <p className="text-subtle fs-8 m-0">No visits in this leg yet.</p>;

    return (
        <div className="x01-legs-wrap x01-leg-visits">
            <table className="x01-legs">
                <thead>
                    <tr>
                        <th scope="col">Visit</th>
                        <th scope="col">Player</th>
                        <th scope="col">Darts</th>
                        <th scope="col" className="text-end">Score</th>
                        <th scope="col" className="text-end">Left</th>
                    </tr>
                </thead>
                <tbody className="is-static">
                    {visits.map((visit, index) => (
                        <tr key={`${visit.playerId}-${visit.turn}`} className={index === 0 ? 'is-latest' : ''}>
                            <td className="fw-semibold">{visit.turn}</td>
                            <td>
                                <span className="d-inline-flex align-items-center text-nowrap">
                                    <span className="result-hero-dot" style={{ background: PLAYER_COLORS[indexOf.get(visit.playerId)] }} aria-hidden="true" />
                                    {nameOf(visit.playerId)}
                                </span>
                            </td>
                            <td><span className="x01-visit-darts">{visit.darts.map((dart, i) => <span key={i}>{dart}</span>)}</span></td>
                            <td className={`text-end ${visit.bust ? 'x01-bust-text' : ''}`}>{visit.bust ? 'Bust' : visit.roundScore}</td>
                            <td className="text-end fw-semibold">{visit.scoreLeft}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default X01LegVisits;
