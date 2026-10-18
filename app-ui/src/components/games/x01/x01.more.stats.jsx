import { Panel } from 'primereact/panel';
import { PLAYER_COLORS } from '../../stats/charts/chart.theme';

const RANGES = ['180', '160-179', '140-159', '120-139', '100-119', '80-99', '60-79', '40-59', '20-39', '1-19', 'ZERO'];

/**
 * More of the running game: how often each score range was thrown, and the
 * darts at the doubles when finishing, for every player side by side.
 */
const X01MoreStats = ({ game, players }) => {
    const Head = () => (
        <thead>
            <tr>
                <th scope="col"><span className="visually-hidden">Figure</span></th>
                {players.map((player, index) => (
                    <th key={player.id} scope="col" className="text-end">
                        <span className="d-inline-flex align-items-center"><span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />{player.nickname}</span>
                    </th>
                ))}
            </tr>
        </thead>
    );
    const doublesOf = (playerId) => Object.entries(game.playerModels[playerId]?.checkout?.sections ?? {})
        .filter(([, section]) => section?.total > 0)
        .map(([number, section]) => ({ label: number === '25' ? 'Bull' : `D${number}`, ...section }))
        .sort((a, b) => b.total - a.total);

    return (
        <div className="row g-4">
            <div className="col-12 col-xl-6">
                <Panel header="Score per visit" className="h-100">
                    <div className="x01-legs-wrap">
                        <table className="x01-legs">
                            <Head />
                            <tbody className="is-static">
                                {RANGES.map(range => (
                                    <tr key={range}>
                                        <td className="fw-semibold">{range === 'ZERO' ? '0' : range.replace('-', '–')}</td>
                                        {players.map(player => <td key={player.id} className="text-end">{game.playerModels[player.id]?.scoreRanges?.game?.[range] ?? 0}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            </div>
            <div className="col-12 col-xl-6">
                <Panel header="Doubles at the finish" className="h-100">
                    {players.map((player, index) => {
                        const doubles = doublesOf(player.id);
                        return (
                            <div key={player.id} className="x01-doubles-player">
                                <span className="d-inline-flex align-items-center fw-semibold text-default"><span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />{player.nickname}</span>
                                {doubles.length
                                    ? <div className="x01-stats-doubles">{doubles.map(d => <span key={d.label} title={`${d.hit} of ${d.total} darts at ${d.label} hit`}><strong>{d.label}</strong> {d.hit}/{d.total}</span>)}</div>
                                    : <div className="text-faint fs-8">No darts at a double yet.</div>}
                            </div>
                        );
                    })}
                    <span className="d-block text-faint fs-8 mt-2">Darts thrown at each double when a finish was possible, and how many hit.</span>
                </Panel>
            </div>
        </div>
    );
};

export default X01MoreStats;
