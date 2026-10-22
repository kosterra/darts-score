import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Panel } from 'primereact/panel';

import ChartCard from '../charts/chart.card';
import { AXIS, GRID, PLAYER_COLORS, TOOLTIP, LEGEND } from '../charts/chart.theme';
import { raceOf } from '../../../utils/x01.game.summary';
import { startingScoreOf } from '../../../utils/x01.rules';
import useHiddenSeries from '../charts/use.hidden.series';
import { t } from '../../../utils/i18n';

/**
 * Every leg of the game in a list (who started, who won, the darts, the
 * checkout and the highest visit) and the race to zero of the leg picked in it.
 */
const X01LegsPanel = ({ game, players, legs }) => {
    // the last leg first: in a close game it is the one that decided it
    const [selectedKey, setSelectedKey] = useState(legs[legs.length - 1]?.key ?? null);
    const series = useHiddenSeries();
    if (!legs.length) return null;

    const indexOf = new Map(players.map((player, index) => [player.id, index]));
    const nameOf = (id) => players[indexOf.get(id)]?.nickname ?? '–';
    const severalSets = (game.setsPlayed ?? 1) > 1;
    const selected = legs.find(leg => leg.key === selectedKey) ?? legs[legs.length - 1];
    const race = raceOf(selected, players.map(player => player.id), id => startingScoreOf(game, id));
    const legName = (leg) => severalSets ? t('Set {{set}} · Leg {{legInSet}}', { set: leg.set, legInSet: leg.legInSet }) : t('Leg {{legInSet}}', { legInSet: leg.legInSet });

    const Who = ({ id }) => id
        ? <span className="d-inline-flex align-items-center text-nowrap"><span className="result-hero-dot" style={{ background: PLAYER_COLORS[indexOf.get(id)] }} aria-hidden="true" />{nameOf(id)}</span>
        : <span className="text-faint">–</span>;

    return (
        <div className="row g-4 mb-4">
            <div className="col-12 col-xl-6">
                <Panel header={t('Leg by leg')} className="h-100">
                    <div className="x01-legs-wrap">
                        <table className="x01-legs">
                            <thead>
                                <tr>
                                    <th scope="col">{t('Leg')}</th>
                                    <th scope="col">{t('Started')}</th>
                                    <th scope="col">{t('Won by')}</th>
                                    <th scope="col" className="text-end">{t('Darts')}</th>
                                    <th scope="col" className="text-end">{t('Checkout')}</th>
                                    <th scope="col" className="text-end">{t('Highest')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {legs.map(leg => (
                                    <tr
                                        key={leg.key}
                                        className={leg === selected ? 'is-selected' : ''}
                                        onClick={() => setSelectedKey(leg.key)}
                                        tabIndex={0}
                                        onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && setSelectedKey(leg.key)}
                                        aria-label={t('{{legName}}: show the race to zero', { legName: legName(leg) })}
                                    >
                                        <td className="text-nowrap fw-semibold">{legName(leg)}</td>
                                        <td><Who id={leg.starter} /></td>
                                        <td className="fw-semibold"><Who id={leg.winner} /></td>
                                        <td className="text-end">{leg.winnerDarts ?? '–'}</td>
                                        <td className="text-end">{leg.checkout ?? '–'}</td>
                                        <td className="text-end">{leg.highest.score || '–'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <span className="d-block text-faint fs-8 mt-2">{t('Pick a leg to see its race to zero.')}</span>
                </Panel>
            </div>
            <div className="col-12 col-xl-6">
                <ChartCard title={t('Race to zero · {{legName}}', { legName: legName(selected) })} description={t('The score each player had left after every visit of this leg.')}>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={race} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                            <CartesianGrid {...GRID} />
                            <XAxis dataKey="visit" {...AXIS} allowDecimals={false} label={{ value: 'Visit', position: 'insideBottomRight', offset: -2, fill: '#7a7a7a', fontSize: 11 }} />
                            <YAxis {...AXIS} domain={[0, Math.max(...players.map(player => startingScoreOf(game, player.id)))]} allowDecimals={false} />
                            <Tooltip {...TOOLTIP} labelFormatter={(visit) => visit === 0 ? t('Start') : t('Visit {{visit}}', { visit: visit })} />
                            {players.map((player, index) => (
                                <Line legendType="plainline" key={player.id} type="linear" dataKey={player.id} name={player.nickname} stroke={PLAYER_COLORS[index]} strokeWidth={2.5} dot={{ r: 2.5, fill: PLAYER_COLORS[index], strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} hide={series.isHidden(player.id)} />
                            ))}
                            {players.length > 1 && <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />}
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
};

export default X01LegsPanel;
