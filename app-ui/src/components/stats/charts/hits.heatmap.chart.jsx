import ChartCard from './chart.card';
import DartboardHeatmap from './dartboard.heatmap';
import { PLAYER_COLORS } from './chart.theme';
import { hitFields, formatShare } from '../../../utils/hit.fields';

const RING_NAMES = { S: 'Single', D: 'Double', T: 'Treble' };
const TOP_FIELDS = 5;

/**
 * Where the darts landed, on a dartboard per player, with each player's most
 * hit fields as a list and every field's share of the darts on hovering.
 *
 * hitsByPlayer: one entry per player, each [{ section: '20', S, D, T }]
 * gameName: the game the hits are from, for the description
 */
const HitsHeatmapChart = ({ hitsByPlayer = [], players = [], gameName = 'X01' }) => (
    <ChartCard
        title="Where the darts land"
        description={`Every field of the board shaded by how often it was hit in ${gameName}, with the most hit fields below. Hover a field for its share of the darts.`}
    >
        <div className="row g-3 justify-content-center">
            {players.map((player, index) => {
                const hits = hitsByPlayer[index] ?? [];
                const bySection = new Map(hits.map(entry => [String(entry.section), entry]));
                const valueOf = (section, ring) => bySection.get(String(section))?.[ring] ?? 0;
                const fields = hitFields(hits);
                const total = fields.reduce((sum, field) => sum + field.count, 0);
                const describe = (section, ring) => {
                    const count = valueOf(section, ring);
                    const name = section === 25 ? (ring === 'D' ? 'Bull' : 'Outer bull') : `${RING_NAMES[ring]} ${section}`;
                    return `${name}: ${total ? formatShare(count / total) : '0 %'} of the darts on the board (${count} ${count === 1 ? 'hit' : 'hits'})`;
                };
                return (
                    <div key={player.id} className={players.length > 1 ? 'col-12 col-md-6' : 'col-12'}>
                        {players.length > 1 && <div className="text-center fw-semibold mb-1" style={{ color: PLAYER_COLORS[index] }}>{player.nickname}</div>}
                        <div className="mx-auto" style={{ maxWidth: '20rem' }}>
                            <DartboardHeatmap
                                valueOf={valueOf}
                                color={PLAYER_COLORS[index]}
                                label={`Hits of ${player.nickname} on the dartboard`}
                                describe={describe}
                            />
                        </div>
                        {fields.length > 0 &&
                            <ol className="hit-fields" aria-label={`Most hit fields of ${player.nickname}`}>
                                {fields.slice(0, TOP_FIELDS).map(field => (
                                    <li key={field.key} className="hit-field" title={`${field.name}: ${field.count} hits`}>
                                        <span className="hit-field-bar" style={{ background: PLAYER_COLORS[index], width: `${(field.share / fields[0].share) * 100}%` }} aria-hidden="true" />
                                        <span className="hit-field-name">{field.short}</span>
                                        <span className="hit-field-share">{formatShare(field.share)}</span>
                                    </li>
                                ))}
                            </ol>
                        }
                    </div>
                );
            })}
        </div>
        <div className="hit-scale" aria-hidden="true">
            <span>rarely</span>
            <span className="hit-scale-bar" />
            <span>often</span>
        </div>
    </ChartCard>
);

export default HitsHeatmapChart;
