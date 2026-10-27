import { Avatar } from 'primereact/avatar';
import { FaChartLine, FaCrosshairs, FaFire, FaSpoon, FaTrophy } from 'react-icons/fa6';

import { KpiChip } from '../stats/players/kpi';
import { ACCENT } from '../../utils/palette';
import { resolvePlayerInitials } from '../../utils/image.utils';
import { t, tn } from '../../utils/i18n';

// the awards as the club's figures: the icon of the same figure there, the cup in gold
const AWARDS = {
    champion: { icon: FaTrophy, gold: true, title: t('Champion of the night'), value: (value) => tn(value, '{{count}} win', '{{count}} wins') },
    average: { icon: FaChartLine, title: t('Best average'), value: (value) => value.toFixed(2) },
    oneEighties: { icon: FaFire, title: t('Most 180s'), value: (value) => tn(value, '{{count}} × 180', '{{count}} × 180') },
    checkout: { icon: FaCrosshairs, title: t('Highest checkout'), value: (value) => String(value) },
    woodenSpoon: { icon: FaSpoon, title: t('Wooden spoon'), value: (value) => tn(value, '{{count}} win', '{{count}} wins') },
};

/**
 * The table of the evening: per player games, wins, win rate, and in X01 the
 * average, 180s and highest checkout; the best first.
 */
export const EveningTable = ({ report }) => (
    <div className="evening-table-wrap">
        <table className="evening-table">
            <thead>
                <tr>
                    <th aria-label={t('Place')} />
                    <th>{t('Player')}</th>
                    <th>{t('Games')}</th>
                    <th>{t('Wins')}</th>
                    <th>{t('Win rate')}</th>
                    <th>{t('X01 average')}</th>
                    <th>180</th>
                    <th>{t('Best checkout')}</th>
                </tr>
            </thead>
            <tbody>
                {report.table.map((row, index) => (
                    <tr key={row.id} className={index === 0 && row.wins > 0 ? 'is-leader' : ''}>
                        <td className="evening-place">{row.games ? index + 1 : '–'}</td>
                        <td className="evening-name">{row.name}</td>
                        <td>{row.games}</td>
                        <td className="fw-semibold">{row.wins}</td>
                        <td>{row.games ? `${row.winRate} %` : '–'}</td>
                        <td>{row.average != null ? row.average.toFixed(2) : '–'}</td>
                        <td>{row.oneEighties || '–'}</td>
                        <td>{row.highestCheckout ?? '–'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/**
 * The awards of the evening: whoever leads in wins, average, 180s and
 * checkout, and the wooden spoon in good humour.
 */
export const EveningAwards = ({ report, nameOf }) => (
    <div className="kpi-chips">
        {report.awards.map(award => {
            const words = AWARDS[award.id];
            if (!words) return null;
            return <KpiChip key={award.id} icon={words.icon} value={nameOf(award.player)} label={words.title} detail={words.value(award.value)} color={words.gold ? ACCENT.gold : ACCENT.green} />;
        })}
    </div>
);

/**
 * Who beat whom, as the head to head of a club: how often the row's player
 * beat the column's player, green when they lead the duel, red when behind.
 */
export const EveningHeadToHead = ({ report, players }) => {
    const winsOf = (a, b) => report.headToHead[a]?.[b] ?? 0;
    const avatar = (player) => <Avatar label={resolvePlayerInitials(player.name, '')} shape="circle" className="avatar-sm bg-surface-high" title={player.name} />;
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
 * The form of the evening: each player's X01 average, game by game, as bars.
 */
export const EveningForm = ({ report, players }) => {
    const best = Math.max(1, ...Object.values(report.form).flat());
    return (
        <ul className="list-unstyled m-0 evening-form">
            {players.filter(player => report.form[player.id]?.length).map(player => (
                <li key={player.id}>
                    <span className="evening-name text-truncate">{player.name}</span>
                    <span className="evening-form-bars" aria-label={t('X01 average game by game: {{values}}', { values: report.form[player.id].join(', ') })}>
                        {report.form[player.id].map((value, index) => (
                            <span key={index} title={value.toFixed(1)} style={{ height: `${Math.max(6, (value / best) * 100)}%` }} />
                        ))}
                    </span>
                    <span className="text-subtle fs-8 tabular-nums">{report.form[player.id].at(-1).toFixed(1)}</span>
                </li>
            ))}
        </ul>
    );
};
