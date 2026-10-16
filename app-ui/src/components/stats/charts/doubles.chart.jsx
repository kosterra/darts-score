import ChartCard from './chart.card';
import DartboardHeatmap from './dartboard.heatmap';
import { PLAYER_COLORS } from './chart.theme';

const TOP = 3;

const doubleName = (section) => String(section) === '25' ? 'Bull' : `D${section}`;

/**
 * Checkout success per double: the double ring shaded by success rate, and
 * the best doubles listed.
 *
 * ratesByPlayer: one entry per player, each [{ section, hit, total, rate }]
 */
const DoublesChart = ({ ratesByPlayer = [], players = [] }) => (
    <ChartCard title="Favourite doubles" description="Checkout attempts per double, shaded by how often they went in. Hover a double for the details.">
        <div className="row g-3 justify-content-center">
            {players.map((player, index) => {
                const rates = (ratesByPlayer[index] ?? []).map(entry => ({ ...entry, rate: Number(entry.rate) || 0 }));
                const bySection = new Map(rates.map(entry => [String(entry.section), entry]));
                const best = rates.filter(entry => entry.hit > 0).sort((a, b) => b.rate - a.rate || b.hit - a.hit).slice(0, TOP);
                return (
                    <div key={player.id} className={players.length > 1 ? 'col-12 col-md-6' : 'col-12'}>
                        {players.length > 1 && <div className="text-center fw-semibold mb-1" style={{ color: PLAYER_COLORS[index] }}>{player.nickname}</div>}
                        <div className="mx-auto" style={{ maxWidth: '20rem' }}>
                            <DartboardHeatmap
                                onlyDoubles
                                color={PLAYER_COLORS[index]}
                                label={`Checkout success of ${player.nickname} per double`}
                                valueOf={(section, ring) => ring === 'D' ? bySection.get(String(section))?.rate ?? 0 : 0}
                                describe={(section) => {
                                    const entry = bySection.get(String(section));
                                    return entry ? `${doubleName(section)}: ${entry.hit} of ${entry.total} (${Math.round(entry.rate)} %)` : `${doubleName(section)}: not tried`;
                                }}
                            />
                        </div>
                        {best.length > 0 &&
                            <ol className="list-unstyled d-flex justify-content-center flex-wrap gap-2 mt-2 mb-0">
                                {best.map(entry => (
                                    <li key={entry.section} className="bg-surface rounded-2 px-2 py-1 fs-8 text-subtle">
                                        <span className="text-default fw-semibold">{doubleName(entry.section)}</span> {Math.round(entry.rate)} % · {entry.hit}/{entry.total}
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
