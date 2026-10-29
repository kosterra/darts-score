import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
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
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { t, tn } from '../../../utils/i18n';

// the shame badges of a comparison as rows: each badge once, with how often each player got it
// and when last, the most frequent first
const shameRows = (shame) => {
    const rows = new Map();
    for (const entry of shame) {
        const row = rows.get(entry.id) ?? { id: entry.id, title: entry.title, badge: entry, counts: {}, total: 0, at: entry.at };
        row.counts[entry.playerId] = (row.counts[entry.playerId] ?? 0) + (entry.count ?? 1);
        row.total += entry.count ?? 1;
        if (new Date(entry.at) > new Date(row.at)) row.at = entry.at;
        rows.set(entry.id, row);
    }
    return [...rows.values()].sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));
};

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

// an icon for what a difference is about
const INSIGHT_ICONS = {
    average: 'pi pi-chart-line', firstNine: 'pi pi-chart-line', checkout: 'pi pi-flag', checkoutRate: 'pi pi-flag',
    won: 'pi pi-trophy', wins: 'pi pi-trophy', winRate: 'pi pi-trophy', rating: 'pi pi-star',
    dartsPerLeg: 'pi pi-bolt', 180: 'pi pi-bolt', num180s: 'pi pi-bolt', highest: 'pi pi-flag-fill', highestCheckout: 'pi pi-flag-fill',
};

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// the sentence with every player's name in their colour
const Highlighted = ({ text, players, colours }) => {
    const names = players.map((player, index) => ({ name: player.nickname, colour: colours[index] })).filter(entry => entry.name).sort((a, b) => b.name.length - a.name.length);
    if (!names.length) return text;
    const parts = text.split(new RegExp(`(${names.map(entry => escape(entry.name)).join('|')})`, 'g'));
    return parts.map((part, index) => {
        const entry = names.find(candidate => candidate.name === part);
        return entry ? <strong key={index} className="compare-insight-name" style={{ color: entry.colour }}>{part}</strong> : part;
    });
};

/**
 * The comparison in words: the differences that stand out, each as a line in
 * the colour of the player ahead, with the names in the players' colours.
 */
export const CompareInsights = ({ rows, players, colours = [] }) => {
    const insights = insightsOf(rows, players);
    if (!insights.length) return null;
    return (
        <Panel header={t('In a few words')}>
            <ul className="compare-insights list-unstyled m-0">
                {insights.map(insight => (
                    <li key={insight.key} className="compare-insight" style={{ '--insight-colour': colours[insight.playerIndex] ?? 'var(--primary-color)' }}>
                        <span className="compare-insight-icon" aria-hidden="true"><i className={INSIGHT_ICONS[insight.key] ?? 'pi pi-arrow-up-right'} /></span>
                        <span><Highlighted text={insight.text} players={players} colours={colours} /></span>
                    </li>
                ))}
            </ul>
        </Panel>
    );
};

/**
 * The best and the worst moments of the duel: per player a tile with their
 * best game average and highest checkout against the others (with the date,
 * to the game) and their 180s (X01); beside it the Hall of Shame badges they
 * got in these games, the same badge of a player once, with how often.
 */
const DuelHighlights = ({ data, players, colours }) => {
    const highlights = data.highlights;
    // the same badge of the same player once: how often, and the last time
    const shame = Object.values((data.shame ?? []).reduce((groups, entry) => {
        const key = `${entry.playerId}-${entry.id}`;
        const group = groups[key] ?? { ...entry, count: 0, at: entry.at };
        group.count += entry.count ?? 1;
        if (new Date(entry.at) > new Date(group.at)) group.at = entry.at;
        groups[key] = group;
        return groups;
    }, {})).sort((a, b) => new Date(b.at) - new Date(a.at));
    const badges = data.badges ?? {};
    const hasBadges = Object.values(badges).some(entry => entry.earned > 0);
    // the tiles: the X01 moments, and in every game the badges earned
    const tiles = Boolean(highlights) || hasBadges;
    if (!tiles && !shame.length) return null;
    const gameLink = (gameId) => `/stats/games/x01/${gameId}`;

    // a part of a whole, as "of 70 in the club · 57 %"
    const share = (part, whole, text) => (whole ? `${text} · ${Math.round(part / whole * 100)} %` : null);

    const Moment = ({ value, label, entry, detail, to }) => (
        <div className="duel-moment">
            <span className="duel-moment-value tabular-nums">{value}</span>
            <span className="duel-moment-label">
                {to ? <Link to={to} className="duel-moment-link">{label}<i className="pi pi-arrow-right" aria-hidden="true" /></Link> : label}
                {entry && <Link to={gameLink(entry.gameId)} className="duel-moment-date">{formatDate(entry.at)}<i className="pi pi-arrow-right" aria-hidden="true" /></Link>}
                {detail && <span className="duel-moment-detail">{detail}</span>}
            </span>
        </div>
    );

    return (
        <Panel header={t('Highlights of their games')}>
            <div className="row g-4">
                {tiles &&
                    <div className={shame.length ? 'col-12 col-xl-7' : 'col-12'}>
                        {/* a title as the Hall of Shame beside it has, so both start at the same height */}
                        <span className="d-block text-faint fs-8 mb-2">{t('Their best moments')}</span>
                        <div className="duel-moments">
                            {players.map((player, index) => {
                                const entry = highlights?.[player.id] ?? {};
                                return (
                                    <section key={player.id} className="duel-moments-player" style={{ '--duel-colour': colours[index] }}>
                                        <header className="d-flex align-items-center gap-2">
                                            <Avatar
                                                label={resolvePlayerInitials(player.firstname, player.lastname)}
                                                image={resolvePlayerImg(player.profileImg)}
                                                shape="circle"
                                                className="avatar-sm bg-surface-high duel-moments-avatar"
                                            />
                                            <span className="text-default fw-semibold text-truncate">{player.nickname}</span>
                                        </header>
                                        {highlights && <>
                                            <Moment value={entry.bestAverage ? entry.bestAverage.value.toFixed(1) : '–'} label={t('Best game average')} entry={entry.bestAverage} />
                                            <Moment value={entry.highestCheckout?.value ?? '–'} label={t('Highest checkout')} entry={entry.highestCheckout} />
                                            <Moment
                                                value={entry.num180s ?? 0}
                                                label={t('180s thrown')}
                                                detail={share(entry.num180s ?? 0, entry.total180s, t('of {{total}} in the club', { total: entry.total180s ?? 0 }))}
                                            />
                                        </>}
                                        <Moment
                                            value={badges[player.id]?.earned ?? 0}
                                            label={t('Badges earned in these games')}
                                            to={`/players/${player.id}#badges`}
                                            detail={share(badges[player.id]?.earned ?? 0, badges[player.id]?.total, t('of {{total}} in all', { total: badges[player.id]?.total ?? 0 }))}
                                        />
                                    </section>
                                );
                            })}
                        </div>
                    </div>}
                {shame.length > 0 &&
                    <div className={tiles ? 'col-12 col-xl-5' : 'col-12'}>
                        <span className="d-block text-faint fs-8 mb-2">{t('Hall of Shame in these games')}</span>
                        {/* a badge a row, how often each player got it in their colour, the most frequent first */}
                        <table className="duel-shame-table">
                            <thead>
                                <tr>
                                    <th scope="col"><span className="visually-hidden">{t('Badge')}</span></th>
                                    {players.map((player, index) => <th key={player.id} scope="col" className="text-truncate" style={{ color: colours[index] }}>{player.nickname}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {shameRows(shame).map(row => (
                                    <tr key={row.id}>
                                        <th scope="row">
                                            <span className="d-flex align-items-center gap-2 min-w-0">
                                                <ShameMedal badge={row.badge} size="sm" />
                                                <span className="d-flex flex-column min-w-0">
                                                    <span className="text-default fs-7 fw-semibold">{row.title}</span>
                                                    <span className="text-faint fs-8">{t('Last {{date}}', { date: formatDate(row.at) })}</span>
                                                </span>
                                            </span>
                                        </th>
                                        {players.map((player, index) => (
                                            <td key={player.id} className="tabular-nums" style={row.counts[player.id] ? { color: colours[index] } : undefined}>
                                                {row.counts[player.id] ?? <span className="text-faint">–</span>}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
            {/* the duel and the words on the left, the figures beside them: both end about the same height */}
            <div className="row g-4">
                <div className="col-12 col-xl-7 d-flex flex-column gap-4">
                    <DuelSummary data={data} players={players} colours={colours} type={type} />
                    <CompareInsights rows={rows} players={players} colours={colours} />
                </div>
                <div className="col-12 col-xl-5">
                    <Panel header={t('{{game}}: figures', { game: typeTitle(type) })} className="h-100">
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
