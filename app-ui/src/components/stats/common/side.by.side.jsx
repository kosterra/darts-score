import { PLAYER_COLORS } from '../charts/chart.theme';
import { t } from '../../../utils/i18n';

/**
 * Figures of the players side by side, like the "tale of the tape" on TV.
 * Two players: the values left and right of the figure, with a thin line
 * growing from the centre to each side; three or four: a thin line per player.
 * The better value is bright, the others are dimmed.
 * The best value shows its lead over the next one, e.g. "109 +22".
 * rows: [{ key, label, values: [number], texts?: [string], details?: [string],
 *         lowerIsBetter?, neutral?, formatLead?(difference) }] — neutral rows
 *         mark no one as better; formatLead writes the lead, e.g. as a percentage.
 * Rows where every value is 0 are left out. names: false when the names are shown
 * above already (the result of a game, under the portraits).
 */
const SideBySide = ({ rows, players, names = true }) => {
    const shown = rows.filter(row => row.values.some(value => Number(value) > 0));
    if (!shown.length) return <p className="text-subtle m-0">{t('Nothing to compare yet.')}</p>;

    const textOf = (row, index) => row.texts?.[index] ?? row.values[index];
    const isBest = (row, index) => {
        if (row.neutral) return false;
        const values = row.values.map(Number);
        const best = row.lowerIsBetter ? Math.min(...values.filter(value => value > 0)) : Math.max(...values);
        return values[index] === best && values.some(value => value !== best);
    };
    // decimals as in the shown value: "42.3" leads by "+0.4", "13" by "+2"
    const decimalsOf = (text) => (String(text).match(/\.(\d+)/)?.[1].length ?? 0);
    // the lead of the best value over the next one, or null
    const leadOf = (row, index) => {
        if (!isBest(row, index)) return null;
        const values = row.values.map(Number);
        const others = values.filter((_, i) => i !== index);
        const next = row.lowerIsBetter
            ? Math.min(...others.filter(value => value > 0))
            : Math.max(...others);
        if (!Number.isFinite(next)) return null;
        const difference = Math.abs(values[index] - next);
        if (!difference) return null;
        // without trailing zeros: "+383", not "+383.0"
        const text = row.formatLead
            ? row.formatLead(difference)
            : String(Number(difference.toFixed(decimalsOf(textOf(row, index)))));
        // a lead that rounds to nothing is not worth showing
        if (!/[1-9]/.test(text)) return null;
        // fewer is better: the lead is how many fewer
        return `${row.lowerIsBetter ? '−' : '+'}${text}`;
    };
    const Lead = ({ row, index }) => {
        const lead = leadOf(row, index);
        return lead ? <span className="tape-lead">{lead}</span> : null;
    };

    // the longest line is the best value: the highest, or the lowest where fewer is better
    const share = (row, index) => {
        const values = row.values.map(Number);
        const value = Math.max(0, values[index]);
        if (row.lowerIsBetter) {
            const min = Math.min(...values.filter(entry => entry > 0));
            return value > 0 && Number.isFinite(min) ? min / value : 0;
        }
        const max = Math.max(...values);
        return max > 0 ? value / max : 0;
    };

    if (players.length === 2) {
        return (
            <div className="tape">
                {names && <div className="tape-names">
                    {players.map((player, index) => (
                        <span key={player.id} className={index === 0 ? 'text-start' : 'text-end'}>
                            <span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />
                            {player.nickname}
                        </span>
                    ))}
                </div>}
                {shown.map(row => (
                    <div key={row.key} className="tape-row">
                        <div className="tape-values">
                            {[0, 1].map(index => (
                                <span key={index} className={`tape-value ${index === 0 ? 'is-left' : 'is-right'} ${isBest(row, index) ? 'is-best' : ''}`}>
                                    {/* the lead sits on the inside, next to the figure's name */}
                                    {index === 1 && <Lead row={row} index={index} />}
                                    {textOf(row, index)}
                                    {row.details?.[index] && <span className="tape-detail">{row.details[index]}</span>}
                                    {index === 0 && <Lead row={row} index={index} />}
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

    // three or four: each figure a box of its own, the name, line, lead and value of every
    // player in shared columns on one line each, so the lines are evenly spaced
    return (
        <div className="tape tape-multi">
            {shown.map(row => (
                <div key={row.key} className="tape-figure">
                    <span className="tape-label tape-figure-label">{row.label}</span>
                    {players.map((player, index) => (
                        <div key={player.id} className="tape-line">
                            <span className="tape-line-name text-truncate" title={player.nickname}>{player.nickname}</span>
                            <span className="tape-line-track" aria-hidden="true">
                                <span
                                    className={`tape-fill ${isBest(row, index) ? 'is-best' : ''}`}
                                    style={{ width: `${share(row, index) * 100}%`, background: PLAYER_COLORS[index] }}
                                />
                            </span>
                            <span className="tape-line-lead"><Lead row={row} index={index} /></span>
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
