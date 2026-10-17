import ChartCard from './chart.card';
import DartboardHeatmap from './dartboard.heatmap';
import { PLAYER_COLORS } from './chart.theme';

const RING_NAMES = { S: 'single', D: 'double', T: 'treble' };

/**
 * Where the darts landed, on a dartboard per player.
 *
 * hitsByPlayer: one entry per player, each [{ section: '20', S, D, T }]
 * gameName: the game the hits are from, for the description
 */
const HitsHeatmapChart = ({ hitsByPlayer = [], players = [], gameName = 'X01' }) => (
    <ChartCard title="Where the darts land" description={`Every field of the board shaded by how often it was hit in ${gameName}. Hover a field for the number.`}>
        <div className="row g-3 justify-content-center">
            {players.map((player, index) => {
                const bySection = new Map((hitsByPlayer[index] ?? []).map(entry => [String(entry.section), entry]));
                const valueOf = (section, ring) => bySection.get(String(section))?.[ring] ?? 0;
                return (
                    <div key={player.id} className={players.length > 1 ? 'col-12 col-md-6' : 'col-12'}>
                        {players.length > 1 && <div className="text-center fw-semibold mb-1" style={{ color: PLAYER_COLORS[index] }}>{player.nickname}</div>}
                        <div className="mx-auto" style={{ maxWidth: '20rem' }}>
                            <DartboardHeatmap
                                valueOf={valueOf}
                                color={PLAYER_COLORS[index]}
                                label={`Hits of ${player.nickname} on the dartboard`}
                                describe={(section, ring) => section === 25
                                    ? `${ring === 'D' ? 'Bullseye' : 'Outer bull'}: ${valueOf(25, ring)} hits`
                                    : `${RING_NAMES[ring]} ${section}: ${valueOf(section, ring)} hits`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    </ChartCard>
);

export default HitsHeatmapChart;
