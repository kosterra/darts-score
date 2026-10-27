import { FaTrophy } from 'react-icons/fa';
import { t, tn } from '../../utils/i18n';

const AWARDS = {
    // the cup of the whole app (react-icons), the others PrimeIcons
    champion: { icon: FaTrophy, title: t('Champion of the night'), value: (value) => tn(value, '{{count}} win', '{{count}} wins') },
    average: { icon: 'pi-chart-line', title: t('Best average'), value: (value) => value.toFixed(2) },
    oneEighties: { icon: 'pi-bolt', title: t('Most 180s'), value: (value) => tn(value, '{{count}} × 180', '{{count}} × 180') },
    checkout: { icon: 'pi-flag', title: t('Highest checkout'), value: (value) => String(value) },
    woodenSpoon: { icon: 'pi-face-smile', title: t('Wooden spoon'), value: (value) => tn(value, '{{count}} win', '{{count}} wins') },
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
    <div className="evening-awards">
        {report.awards.map(award => {
            const words = AWARDS[award.id];
            if (!words) return null;
            return (
                <div key={award.id} className={`evening-award is-${award.id}`}>
                    <span className="evening-award-icon" aria-hidden="true">{typeof words.icon === 'string' ? <i className={`pi ${words.icon}`} /> : <words.icon />}</span>
                    <span className="d-flex flex-column min-w-0">
                        <span className="text-faint fs-8">{words.title}</span>
                        <span className="text-default fw-semibold text-truncate">{nameOf(award.player)}</span>
                        <span className="text-subtle fs-8">{words.value(award.value)}</span>
                    </span>
                </div>
            );
        })}
    </div>
);

/**
 * Who beat whom: a row per player, a column per opponent, the wins in the cell.
 */
export const EveningHeadToHead = ({ report, players }) => (
    <div className="evening-table-wrap">
        <table className="evening-table evening-h2h">
            <thead>
                <tr>
                    <th aria-label={t('Winner')} />
                    {players.map(player => <th key={player.id} title={player.name}>{player.name}</th>)}
                </tr>
            </thead>
            <tbody>
                {players.map(row => (
                    <tr key={row.id}>
                        <td className="evening-name">{row.name}</td>
                        {players.map(column => (
                            <td key={column.id} className={row.id === column.id ? 'is-self' : report.headToHead[row.id]?.[column.id] ? 'has-wins' : ''}>
                                {row.id === column.id ? '' : report.headToHead[row.id]?.[column.id] || '·'}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
        <p className="text-faint fs-8 mt-2 mb-0">{t('Read across: how often the player of the row beat the player of the column.')}</p>
    </div>
);

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
