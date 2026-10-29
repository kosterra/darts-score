import ChartCard from './chart.card';
import DartboardHeatmap from './dartboard.heatmap';
import { PLAYER_COLORS } from './chart.theme';
import { hitFields, formatShare } from '../../../utils/hit.fields';
import { t, tn } from '../../../utils/i18n';
import { heatGradient } from '../../../utils/heat.scale';

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
        title={t('Where the darts land')}
        description={t('Every field of the board shaded by how often it was hit in {{gameName}}, with the most hit fields below. Hover a field for its share of the darts.', { gameName: gameName })}
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
                    const share = total ? formatShare(count / total) : '0 %';
                    return count === 1 ? t('{{name}}: {{share}} of the darts on the board (1 hit)', { name, share }) : t('{{name}}: {{share}} of the darts on the board ({{count}} hits)', { name, share, count });
                };
                return (
                    <div key={player.id} className={players.length > 1 ? 'col-12 col-md-6' : 'col-12'}>
                        {players.length > 1 && <div className="text-center fw-semibold mb-1" style={{ color: PLAYER_COLORS[index] }}>{player.nickname}</div>}
                        <div className="mx-auto" style={{ maxWidth: '20rem' }}>
                            <DartboardHeatmap
                                valueOf={valueOf}
                                color={PLAYER_COLORS[index]}
                                label={t('Hits of {{nickname}} on the dartboard', { nickname: player.nickname })}
                                describe={describe}
                                name={player.nickname}
                                tooltip={(section, ring) => {
                                    const count = valueOf(section, ring);
                                    return {
                                        label: section === 25 ? (ring === 'D' ? t('Bull') : t('Outer bull')) : `${RING_NAMES[ring]} ${section}`,
                                        value: total ? formatShare(count / total) : '0 %',
                                        detail: tn(count, '{{count}} hit of {{total}} on the board', '{{count}} hits of {{total}} on the board', { total }),
                                    };
                                }}
                            />
                        </div>
                        {fields.length > 0 &&
                            <ol className="hit-fields" aria-label={t('Most hit fields of {{nickname}}', { nickname: player.nickname })}>
                                {fields.slice(0, TOP_FIELDS).map(field => (
                                    <li key={field.key} className="hit-field" title={t('{{name}}: {{count}} hits', { name: field.name, count: field.count })}>
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
            <span>{t('rarely')}</span>
            <span className="hit-scale-bar" style={{ background: heatGradient(PLAYER_COLORS[0]) }} />
            <span>{t('often')}</span>
        </div>
    </ChartCard>
);

export default HitsHeatmapChart;
