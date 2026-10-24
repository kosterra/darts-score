import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';

import StatsService from '../../../services/stats.service';
import SideBySide from '../common/side.by.side';
import ShameMedal from '../../badges/shame.medal';
import { CardSkeleton } from '../../elements/skeletons';
import AverageTrendChart from '../charts/average.trend.chart';
import HitsHeatmapChart from '../charts/hits.heatmap.chart';
import DoublesChart from '../charts/doubles.chart';
import { ScoreRangesChart, ScoringFinishingChart, DartsPerLegChart, LegsPerGameChart } from '../charts/simple.bar.charts';
import { sectionHitsOf } from '../charts/chart.theme';
import { x01DuelRows } from '../players/x01.duel.rows';
import { duelRows, setupLinkOf, typeTitle } from './compare.figures';
import { insightsOf } from './compare.insights';
import { formatDate } from '../../../utils/dates';
import { t, tn } from '../../../utils/i18n';

const CHART_TABS = [
    { value: 'trend', label: t('Trend') },
    { value: 'scoring', label: t('Scoring') },
    { value: 'finishing', label: t('Finishing') },
    { value: 'board', label: t('Board') },
];

/**
 * How the duel stands: the score of wins (and for X01 the legs and sets), who
 * is on a streak, the last results, the matches won in the deciding leg, the
 * chances for the next game from the club rating, and with three or more who
 * beats whom pair by pair.
 */
const DuelSummary = ({ data, players, colours, type }) => {
    const { record, chances, ratings } = data;
    const ids = players.map(player => player.id);
    const nicknameOf = (id) => players.find(player => player.id === id)?.nickname ?? '';
    const colourOf = (id) => colours[ids.indexOf(id)] ?? 'var(--text-faint)';
    const x01 = type === 'x01';
    const anyDeciding = ids.some(id => record.decidingWins?.[id] > 0);

    return (
        <Panel header={t('The duel')}>
            <div className="d-flex flex-column gap-4">
                {players.length === 2
                    ? <div className="duel-score" aria-label={t('{{a}} {{winsA}}, {{b}} {{winsB}}', { a: players[0].nickname, winsA: record.wins[ids[0]], b: players[1].nickname, winsB: record.wins[ids[1]] })}>
                        <span className="duel-score-name text-end" style={{ '--duel-colour': colours[0] }}>{players[0].nickname}</span>
                        <span className="duel-score-figure tabular-nums">{record.wins[ids[0]]}<span className="duel-score-colon">:</span>{record.wins[ids[1]]}</span>
                        <span className="duel-score-name" style={{ '--duel-colour': colours[1] }}>{players[1].nickname}</span>
                        {x01 && <span className="duel-score-sub tabular-nums">{t('Legs')}{' '}{record.legs[ids[0]]} : {record.legs[ids[1]]}{(record.sets[ids[0]] || record.sets[ids[1]]) ? ` · ${t('Sets')} ${record.sets[ids[0]]} : ${record.sets[ids[1]]}` : ''}</span>}
                    </div>
                    : <ol className="duel-ranking list-unstyled m-0">
                        {[...ids].sort((a, b) => record.wins[b] - record.wins[a]).map(id => (
                            <li key={id}>
                                <span className="result-hero-dot" style={{ background: colourOf(id) }} aria-hidden="true" />
                                <span className="text-default fw-semibold flex-grow-1">{nicknameOf(id)}</span>
                                <span className="text-default fw-semibold tabular-nums">{tn(record.wins[id], '{{count}} win', '{{count}} wins')}</span>
                            </li>
                        ))}
                    </ol>}

                <div className="duel-facts">
                    {record.streak &&
                        <span><i className="pi pi-bolt" aria-hidden="true" />{' '}{tn(record.streak.count, '{{name}} won the last game', '{{name}} won the last {{count}} games', { name: nicknameOf(record.streak.playerId) })}</span>}
                    {x01 && anyDeciding &&
                        <span><i className="pi pi-flag" aria-hidden="true" />{' '}{t('Won in the deciding leg:')}{' '}{ids.map(id => `${nicknameOf(id)} ${record.decidingWins[id]}`).join(' · ')}</span>}
                </div>

                {record.last.length > 0 &&
                    <div className="d-flex flex-column gap-2">
                        <span className="text-faint fs-8">{t('The last results, newest first')}</span>
                        <ol className="duel-strip list-unstyled m-0">
                            {record.last.map(entry => (
                                <li key={entry.id} title={`${formatDate(entry.at)} · ${entry.winner ? nicknameOf(entry.winner) : t('someone else')}`} style={{ '--duel-colour': entry.winner ? colourOf(entry.winner) : 'var(--surface-high)' }}>
                                    {entry.winner ? nicknameOf(entry.winner).slice(0, 1).toUpperCase() : '–'}
                                </li>
                            ))}
                        </ol>
                    </div>}

                {/* with three or more: who beats whom, the wins of the row's player against the column's */}
                {players.length > 2 &&
                    <div className="table-responsive">
                        <table className="duel-matrix">
                            <caption className="text-faint fs-8">{t('Wins of the player in the row against the player in the column, in games they both played')}</caption>
                            <thead>
                                <tr><th aria-label={t('Player')} />{players.map(player => <th key={player.id} scope="col">{player.nickname}</th>)}</tr>
                            </thead>
                            <tbody>
                                {players.map(row => (
                                    <tr key={row.id}>
                                        <th scope="row"><span className="result-hero-dot" style={{ background: colourOf(row.id) }} aria-hidden="true" />{row.nickname}</th>
                                        {players.map(column => (
                                            <td key={column.id} className="tabular-nums">{row.id === column.id ? '–' : record.pairs?.[row.id]?.[column.id] ?? 0}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>}

                {/* the club rating: the chances for the next game */}
                {chances &&
                    <div className="d-flex flex-column gap-2">
                        <span className="text-faint fs-8">{t('Chances for the next game, from the club rating')}</span>
                        <div className="duel-chances" role="img" aria-label={ids.map(id => `${nicknameOf(id)} ${chances[id]} %`).join(', ')}>
                            {ids.map(id => <span key={id} style={{ width: `${chances[id]}%`, background: colourOf(id) }}>{chances[id] >= 12 ? `${chances[id]} %` : ''}</span>)}
                        </div>
                        <span className="text-faint fs-8">
                            {ids.map(id => `${nicknameOf(id)}: ${ratings?.[id]?.rating ?? '–'}${ratings?.[id]?.provisional ? ` (${t('still settling')})` : ''}`).join(' · ')}
                        </span>
                    </div>}
            </div>
        </Panel>
    );
};

/**
 * The comparison in words: the differences that stand out.
 */
export const CompareInsights = ({ rows, players }) => {
    const insights = insightsOf(rows, players);
    if (!insights.length) return null;
    return (
        <Panel header={t('In a few words')}>
            <ul className="compare-insights m-0">
                {insights.map(insight => <li key={insight.key}>{insight.text}</li>)}
            </ul>
        </Panel>
    );
};

/**
 * The best and the worst moments of the duel: each player's best game average
 * and highest checkout against the others (X01), the 180s, and the Hall of
 * Shame badges they got in these games.
 */
const DuelHighlights = ({ data, players, colours }) => {
    const ids = players.map(player => player.id);
    const highlights = data.highlights;
    const shame = data.shame ?? [];
    if (!highlights && !shame.length) return null;
    const nicknameOf = (id) => players.find(player => player.id === id)?.nickname ?? '';
    const gameLink = (gameId) => `/stats/games/x01/${gameId}`;

    return (
        <Panel header={t('Highlights of their games')}>
            <div className="d-flex flex-column gap-4">
                {highlights &&
                    <ul className="duel-highlights list-unstyled m-0">
                        {ids.map((id, index) => {
                            const entry = highlights[id] ?? {};
                            return (
                                <li key={id}>
                                    <span className="d-flex align-items-center gap-2 text-default fw-semibold">
                                        <span className="result-hero-dot" style={{ background: colours[index] }} aria-hidden="true" />{nicknameOf(id)}
                                    </span>
                                    <span className="text-subtle fs-7">
                                        {entry.bestAverage
                                            ? <Link to={gameLink(entry.bestAverage.gameId)}>{t('Best game: average {{value}}', { value: entry.bestAverage.value.toFixed(1) })}</Link>
                                            : t('No game average yet')}
                                    </span>
                                    <span className="text-subtle fs-7">
                                        {entry.highestCheckout
                                            ? <Link to={gameLink(entry.highestCheckout.gameId)}>{t('Highest checkout: {{value}}', { value: entry.highestCheckout.value })}</Link>
                                            : t('No checkout yet')}
                                    </span>
                                    <span className="text-subtle fs-7">{tn(entry.num180s ?? 0, '{{count}} × 180', '{{count}} × 180')}</span>
                                </li>
                            );
                        })}
                    </ul>}
                {shame.length > 0 &&
                    <div className="d-flex flex-column gap-2">
                        <span className="text-faint fs-8">{t('Hall of Shame in these games')}</span>
                        <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                            {shame.slice(0, 8).map(entry => (
                                <li key={`${entry.playerId}-${entry.id}-${entry.gameId}`} className="d-flex align-items-center gap-3">
                                    <ShameMedal badge={entry} size="sm" />
                                    <span className="d-flex flex-column min-w-0">
                                        <span className="text-default fs-7 fw-semibold">{nicknameOf(entry.playerId)}{' · '}{entry.title}{entry.count > 1 ? ` × ${entry.count}` : ''}</span>
                                        <span className="text-faint fs-8">{formatDate(entry.at)}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>}
            </div>
        </Panel>
    );
};

/**
 * The X01 charts in tabs; only the open tab is drawn.
 */
const X01Charts = ({ data, players }) => {
    const [tab, setTab] = useState('trend');
    const stats = data.x01;
    const of = (key) => players.map((_, index) => stats?.[key]?.[`player${index + 1}`]);
    return (
        <section className="d-flex flex-column gap-3">
            <SelectButton value={tab} options={CHART_TABS} onChange={(e) => e.value && setTab(e.value)} className="p-selectbutton-pills pills-inline" aria-label={t('Charts')} />
            <div className="row g-4">
                {tab === 'trend' && <>
                    <div className="col-12"><AverageTrendChart data={stats.trend ?? []} players={players} /></div>
                    <div className="col-12"><LegsPerGameChart games={data.games} players={players} /></div>
                </>}
                {tab === 'scoring' && <>
                    <div className="col-12 col-xl-6"><ScoringFinishingChart scoring={of('scoring')} players={players} /></div>
                    <div className="col-12 col-xl-6"><ScoreRangesChart data={stats.scoreRanges ?? []} players={players} /></div>
                </>}
                {tab === 'finishing' && <>
                    <div className="col-12"><DoublesChart ratesByPlayer={players.map((_, index) => stats.checkouts?.rates?.[`player${index + 1}`] ?? [])} players={players} /></div>
                    <div className="col-12"><DartsPerLegChart data={stats.dartsPerLeg ?? []} players={players} /></div>
                </>}
                {tab === 'board' &&
                    <div className="col-12"><HitsHeatmapChart hitsByPlayer={players.map((_, index) => sectionHitsOf(stats.sectionHits ?? [], index))} players={players} /></div>}
            </div>
        </section>
    );
};

/**
 * Head to head in one game type: one answer of the API with everything.
 * onData(answer) hands the filter options up; onSideBySide switches the mode.
 */
const CompareDuel = ({ type, players, request, colours, onData, onSideBySide }) => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const key = JSON.stringify({ type, ids: players.map(player => player.id), request });

    useEffect(() => {
        let cancelled = false;
        setData(null);
        setFailed(false);
        StatsService.loadDuel({ ...request, type, playerIds: players.map(player => player.id) })
            .then(answer => { if (!cancelled) { setData(answer); onData?.(answer); } })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
        // the request is rebuilt on every render; its content is what matters
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    if (failed) return <p className="text-subtle m-0">{t('The players could not be compared. Please try again.')}</p>;
    if (!data) {
        return (
            <div className="d-flex flex-column gap-4" aria-busy="true">
                <CardSkeleton title={t('The duel')} />
                <CardSkeleton chart />
            </div>
        );
    }

    if (data.playedGames === 0) {
        return (
            <Panel header={t('The duel')}>
                <div className="d-flex flex-column gap-3">
                    <p className="text-subtle m-0">
                        {t('These players have no finished {{game}} games together with these filters. Compare them side by side, from all their games, or start a game between them.', { game: typeTitle(type) })}
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                        <Button type="button" label={t('Show them side by side')} icon="pi pi-th-large" size="small" onClick={onSideBySide} />
                        <Link to={setupLinkOf(type, players)} className="p-button p-button-sm p-button-secondary text-decoration-none">
                            <i className="pi pi-play me-2" aria-hidden="true" />{t('Start a game between them')}
                        </Link>
                    </div>
                </div>
            </Panel>
        );
    }

    const rows = type === 'x01' ? x01DuelRows(data.x01 ?? {}, players) : duelRows(type, data.players);

    return (
        <div className="d-flex flex-column gap-4">
            <div className="row g-4">
                <div className="col-12 col-xl-7"><DuelSummary data={data} players={players} colours={colours} type={type} /></div>
                <div className="col-12 col-xl-5 d-flex flex-column gap-4">
                    <CompareInsights rows={rows} players={players} />
                    <Panel header={t('{{game}}: figures', { game: typeTitle(type) })} className="flex-grow-1">
                        <p className="text-faint fs-8 mt-0">{tn(data.playedGames, 'In their {{count}} game together.', 'In their {{count}} games together.')}</p>
                        <SideBySide rows={rows} players={players} />
                    </Panel>
                </div>
            </div>
            <DuelHighlights data={data} players={players} colours={colours} />
            {type === 'x01' && data.x01 && <X01Charts data={data} players={players} />}
        </div>
    );
};

export default CompareDuel;
