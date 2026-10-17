import ChartCard from './chart.card';
import DartboardHeatmap from './dartboard.heatmap';
import { PLAYER_COLORS } from './chart.theme';

// the favourite doubles listed: the most tried ones
const MOST_TRIED = 6;
// a double counts as the best one only with enough attempts
const MIN_ATTEMPTS = 10;

const doubleName = (section) => String(section) === '25' ? 'Bull' : `D${section}`;

/**
 * The doubles a player goes for: a wide ring shaded by how often each double
 * was tried, the most tried doubles with their checkout rate, and the best
 * double among those tried often enough.
 *
 * ratesByPlayer: one entry per player, each [{ section, hit, total, rate }]
 */
const DoublesChart = ({ ratesByPlayer = [], players = [] }) => (
    <ChartCard
        title="Favourite doubles"
        description={`The doubles shaded by how often they were tried, with the checkout rate of the most tried ones below. The best double needs at least ${MIN_ATTEMPTS} attempts.`}
    >
        <div className="row g-3 justify-content-center">
            {players.map((player, index) => {
                const rates = (ratesByPlayer[index] ?? []).map(entry => ({ ...entry, rate: Number(entry.rate) || 0, total: Number(entry.total) || 0, hit: Number(entry.hit) || 0 }));
                const bySection = new Map(rates.map(entry => [String(entry.section), entry]));
                const mostTried = rates.filter(entry => entry.total > 0).sort((a, b) => b.total - a.total || b.rate - a.rate).slice(0, MOST_TRIED);
                const best = rates.filter(entry => entry.total >= MIN_ATTEMPTS && entry.hit > 0).sort((a, b) => b.rate - a.rate || b.total - a.total)[0];
                return (
                    <div key={player.id} className={players.length > 1 ? 'col-12 col-md-6' : 'col-12'}>
                        {players.length > 1 && <div className="text-center fw-semibold mb-1" style={{ color: PLAYER_COLORS[index] }}>{player.nickname}</div>}
                        <div className="mx-auto" style={{ maxWidth: '20rem' }}>
                            <DartboardHeatmap
                                onlyDoubles
                                color={PLAYER_COLORS[index]}
                                label={`Checkout attempts of ${player.nickname} per double`}
                                valueOf={(section, ring) => ring === 'D' ? bySection.get(String(section))?.total ?? 0 : 0}
                                describe={(section) => {
                                    const entry = bySection.get(String(section));
                                    return entry?.total ? `${doubleName(section)}: ${entry.hit} of ${entry.total} went in (${Math.round(entry.rate)} %)` : `${doubleName(section)}: not tried`;
                                }}
                            />
                        </div>
                        {best &&
                            <p className="doubles-best">
                                Best double <strong>{doubleName(best.section)}</strong> · {Math.round(best.rate)} % ({best.hit} of {best.total})
                            </p>
                        }
                        {mostTried.length > 0 &&
                            <ol className="hit-fields" aria-label={`Most tried doubles of ${player.nickname}`}>
                                {mostTried.map(entry => (
                                    <li key={entry.section} className="hit-field" title={`${doubleName(entry.section)}: ${entry.hit} of ${entry.total} went in`}>
                                        <span className="hit-field-bar" style={{ background: PLAYER_COLORS[index], width: `${Math.min(100, entry.rate)}%` }} aria-hidden="true" />
                                        <span className="hit-field-name">{doubleName(entry.section)}</span>
                                        <span className="hit-field-share">{Math.round(entry.rate)} % <span className="text-faint fw-normal">· {entry.hit}/{entry.total}</span></span>
                                    </li>
                                ))}
                            </ol>
                        }
                    </div>
                );
            })}
        </div>
    </ChartCard>
);

export default DoublesChart;
