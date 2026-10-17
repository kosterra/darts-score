import { PLAYER_COLORS } from '../charts/chart.theme';

/**
 * Figures of the players side by side, like the "tale of the tape" on TV.
 * Two players: the values left and right of the figure, with a thin line
 * growing from the centre to each side; three or four: a thin line per player.
 * The better value is bright, the others are dimmed.
 * rows: [{ key, label, values: [number], texts?: [string], details?: [string],
 *         lowerIsBetter?, neutral? }] — neutral rows mark no one as better.
 * Rows where every value is 0 are left out.
 */
const SideBySide = ({ rows, players }) => {
    const shown = rows.filter(row => row.values.some(value => Number(value) > 0));
    if (!shown.length) return <p className="text-subtle m-0">Nothing to compare yet.</p>;

    const textOf = (row, index) => row.texts?.[index] ?? row.values[index];
    const isBest = (row, index) => {
        if (row.neutral) return false;
        const values = row.values.map(Number);
        const best = row.lowerIsBetter ? Math.min(...values.filter(value => value > 0)) : Math.max(...values);
        return values[index] === best && values.some(value => value !== best);
    };
    // the longest line is the highest value
    const share = (row, index) => {
        const max = Math.max(...row.values.map(Number));
        return max > 0 ? Math.max(0, Number(row.values[index])) / max : 0;
    };

    if (players.length === 2) {
        return (
            <div className="tape">
                <div className="tape-names">
                    {players.map((player, index) => (
                        <span key={player.id} className={index === 0 ? 'text-start' : 'text-end'}>
                            <span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />
                            {player.nickname}
                        </span>
                    ))}
                </div>
                {shown.map(row => (
                    <div key={row.key} className="tape-row">
                        <div className="tape-values">
                            {[0, 1].map(index => (
                                <span key={index} className={`tape-value ${index === 0 ? 'is-left' : 'is-right'} ${isBest(row, index) ? 'is-best' : ''}`}>
                                    {textOf(row, index)}
                                    {row.details?.[index] && <span className="tape-detail">{row.details[index]}</span>}
                                </span>
                            ))}
                            <span className="tape-label">{row.label}</span>
                        </div>
                        <div className="tape-track" aria-hidden="true">
                            {[0, 1].map(index => (
                                <span key={index} className={`tape-half ${index === 0 ? 'is-left' : 'is-right'}`}>
                                    <span
                                        className={`tape-fill ${isBest(row, index) ? 'is-best' : ''}`}
                                        style={{ width: `${share(row, index) * 100}%`, background: PLAYER_COLORS[index] }}
                                    />
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="tape">
            {shown.map(row => (
                <div key={row.key} className="tape-row">
                    <span className="tape-label d-block mb-1">{row.label}</span>
                    {players.map((player, index) => (
                        <div key={player.id} className="tape-line">
                            <span className="tape-line-name text-truncate" title={player.nickname}>{player.nickname}</span>
                            <span className="tape-line-track" aria-hidden="true">
                                <span
                                    className={`tape-fill ${isBest(row, index) ? 'is-best' : ''}`}
                                    style={{ width: `${share(row, index) * 100}%`, background: PLAYER_COLORS[index] }}
                                />
                            </span>
                            <span className={`tape-value ${isBest(row, index) ? 'is-best' : ''}`}>
                                {textOf(row, index)}
                                {row.details?.[index] && <span className="tape-detail">{row.details[index]}</span>}
                            </span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default SideBySide;
