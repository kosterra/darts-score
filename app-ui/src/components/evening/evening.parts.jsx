import { Avatar } from 'primereact/avatar';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FaChartLine, FaCrosshairs, FaFire, FaSpoon, FaTrophy } from 'react-icons/fa6';

import { KpiChip } from '../stats/players/kpi';
import { AXIS, GRID, LEGEND, TOOLTIP } from '../stats/charts/chart.theme';
import useHiddenSeries from '../stats/charts/use.hidden.series';
import { ACCENT, PODIUM } from '../../utils/palette';
import { colourOf } from '../../utils/evening.colours';
import { resolvePlayerInitials } from '../../utils/image.utils';
import { t, tn } from '../../utils/i18n';


// a player of the evening: the initials on their colour
const PlayerAvatar = ({ players, player, size = 'avatar-sm' }) => (
    <Avatar
        label={resolvePlayerInitials(player.name, '')}
        shape="circle"
        className={`${size} evening-avatar`}
        style={{ '--player-colour': colourOf(players, player.id) }}
        title={player.name}
    />
);

// the awards as the club's figures: the icon of the same figure there, the cup in gold
const AWARDS = {
    champion: { icon: FaTrophy, gold: true, title: t('Champion of the night'), value: (value) => tn(value, '{{count}} win', '{{count}} wins') },
    average: { icon: FaChartLine, title: t('Best average'), value: (value) => value.toFixed(2) },
    oneEighties: { icon: FaFire, title: t('Most 180s'), value: (value) => tn(value, '{{count}} × 180', '{{count}} × 180') },
    checkout: { icon: FaCrosshairs, title: t('Highest checkout'), value: (value) => String(value) },
    woodenSpoon: { icon: FaSpoon, title: t('Wooden spoon'), value: (value) => tn(value, '{{count}} win', '{{count}} wins') },
};

/**
 * The table of the evening, as the rankings of the app: the best first, a
 * trophy for the first three with a win, each player in their colour with
 * the wins of their games as a bar, and their figures beside (in X01 the
 * average, 180s and best checkout).
 */
export const EveningTable = ({ report, players }) => (
    <ol className="badge-ranking evening-standings list-unstyled m-0">
        {report.table.map((row, index) => {
            const podium = row.wins > 0 && index < 3 ? PODIUM[index] : null;
            const player = players.find(entry => entry.id === row.id) ?? { id: row.id, name: row.name };
            return (
                <li key={row.id} className="badge-ranking-row" style={{ '--podium': podium ?? 'transparent' }}>
                    <span className="badge-ranking-place" aria-label={t('Place {{place}}', { place: index + 1 })}>
                        {podium ? <FaTrophy style={{ color: podium }} aria-hidden="true" /> : row.games ? index + 1 : '–'}
                    </span>
                    <PlayerAvatar players={players} player={player} size="avatar-md" />
                    <span className="evening-standing-name d-flex flex-column gap-1 min-w-0">
                        <span className="d-flex align-items-baseline justify-content-between gap-2">
                            <span className="text-default fw-semibold text-truncate">{row.name}</span>
                            <span className="text-subtle fs-8 text-nowrap">{t('{{wins}} of {{games}} won', { wins: row.wins, games: row.games })}</span>
                        </span>
                        <span className="badge-ranking-bar is-green" aria-hidden="true"><span style={{ width: `${row.games ? row.wins / row.games * 100 : 0}%` }} /></span>
                    </span>
                    <dl className="evening-standing-figures">
                        <div><dt>{t('Win rate')}</dt><dd>{row.games ? `${row.winRate} %` : '–'}</dd></div>
                        <div><dt>{t('Average')}</dt><dd>{row.average != null ? row.average.toFixed(1) : '–'}</dd></div>
                        <div><dt>180</dt><dd>{row.oneEighties || '–'}</dd></div>
                        <div><dt>{t('Checkout')}</dt><dd>{row.highestCheckout || '–'}</dd></div>
                    </dl>
                </li>
            );
        })}
    </ol>
);

/**
 * The awards of the evening: whoever leads in wins, average, 180s and
 * checkout, and the wooden spoon in good humour.
 */
export const EveningAwards = ({ report, nameOf }) => (
    <div className="kpi-chips kpi-chips-wide evening-awards">
        {report.awards.map(award => {
            const words = AWARDS[award.id];
            if (!words) return null;
            // as the club's figures: the figure big, the award under it, who holds it on a line of its own
            return <KpiChip key={award.id} icon={words.icon} value={words.value(award.value)} label={words.title} detail={<span title={nameOf(award.player)}>{nameOf(award.player)}</span>} color={words.gold ? ACCENT.gold : ACCENT.green} />;
        })}
    </div>
);

/**
 * Who beat whom, as the head to head of a club: how often the row's player
 * beat the column's player, green when they lead the duel, red when behind.
 */
export const EveningHeadToHead = ({ report, players }) => {
    const winsOf = (a, b) => report.headToHead[a]?.[b] ?? 0;
    // each player in a colour of their own: the initials alone may be the same
    const avatar = (player) => <PlayerAvatar players={players} player={player} />;
    return (
        <>
            <p className="text-faint fs-8 mt-0 mb-3">{t('Wins of the player on the left against the player above.')}</p>
            <div className="overflow-auto">
                <table className="h2h-matrix">
                    <thead>
                        <tr>
                            <th aria-hidden="true" />
                            {players.map(player => <th key={player.id} scope="col">{avatar(player)}<span className="visually-hidden">{player.name}</span></th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {players.map(row => (
                            <tr key={row.id}>
                                <th scope="row">
                                    <span className="d-flex align-items-center gap-2">
                                        {avatar(row)}
                                        <span className="text-default fs-7 fw-semibold text-truncate">{row.name}</span>
                                    </span>
                                </th>
                                {players.map(column => {
                                    if (row.id === column.id) return <td key={column.id} className="is-self" aria-label="–" />;
                                    const won = winsOf(row.id, column.id);
                                    const lost = winsOf(column.id, row.id);
                                    const state = won + lost === 0 ? 'none' : won > lost ? 'lead' : won < lost ? 'behind' : 'even';
                                    return <td key={column.id} className={`is-${state}`} title={`${row.name} ${won} : ${lost} ${column.name}`}>{won + lost === 0 ? '·' : won}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

/**
 * The form: each player's X01 average game by game, a line each in their colour.
 */
export const EveningForm = ({ report, players }) => {
    const series = useHiddenSeries();
    const playing = players.filter(player => report.form[player.id]?.length);
    const games = Math.max(0, ...playing.map(player => report.form[player.id].length));
    const data = Array.from({ length: games }, (_, index) => ({
        game: index + 1,
        ...Object.fromEntries(playing.map(player => [player.id, report.form[player.id][index] ?? null])),
    }));
    return (
        <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="game" {...AXIS} allowDecimals={false} />
                <YAxis {...AXIS} allowDecimals={false} />
                <Tooltip {...TOOLTIP} labelFormatter={(game) => t('Game {{value}}', { value: game })} formatter={(value) => Number(value).toFixed(1)} />
                {playing.map(player => (
                    <Line key={player.id} legendType="plainline" type="linear" dataKey={player.id} name={player.name} stroke={colourOf(players, player.id)} strokeWidth={2.5} dot={{ r: 4, fill: colourOf(players, player.id), strokeWidth: 0 }} connectNulls isAnimationActive={false} hide={series.isHidden(player.id)} />
                ))}
                <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />
            </LineChart>
        </ResponsiveContainer>
    );
};
