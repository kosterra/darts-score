import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Avatar } from 'primereact/avatar';

import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { t } from '../../../utils/i18n';
import useMediaQuery from '../../../utils/use.media.query';

// on a phone the duels as a list, the most played first
const PHONE_DUELS = 8;

/**
 * Who beats whom: each cell is how often the row's player beat the column's
 * player, green when the row's player leads the duel. On a phone, where the
 * grid would not fit, the duels as a list instead: "Anna 12 : 8 Ben", the
 * most played first, the leader first.
 */
const HeadToHeadWidget = ({ widget, headToHead, players }) => {
    const phone = useMediaQuery('(max-width: 575.98px)');
    const ids = headToHead.players;
    const winsOf = (a, b) => headToHead.wins[a]?.[b] ?? 0;
    const nameOf = (id) => players.get(id)?.nickname ?? t('Unknown');
    const duels = ids.flatMap((a, index) => ids.slice(index + 1).map(b => {
        const [first, second] = winsOf(a, b) >= winsOf(b, a) ? [a, b] : [b, a];
        return { first, second, won: winsOf(first, second), lost: winsOf(second, first) };
    })).filter(duel => duel.won + duel.lost > 0).sort((x, y) => (y.won + y.lost) - (x.won + x.lost)).slice(0, PHONE_DUELS);

    const avatar = (id) => {
        const player = players.get(id);
        return (
            <Avatar
                label={resolvePlayerInitials(player?.firstname, player?.lastname)}
                image={resolvePlayerImg(player?.profileImg)}
                shape="circle"
                className="avatar-sm bg-surface-high"
                title={player?.nickname}
            />
        );
    };

    return (
        <Panel header={widget.title} className="h-100">
            {!phone && <p className="text-faint fs-8 mt-0 mb-3">{t('Wins of the player on the left against the player above.')}</p>}
            {ids.length < 2 || (phone && !duels.length)
                ? <p className="text-subtle m-0">{t('Head-to-heads appear once players have played each other.')}</p>
                : phone ? (
                    <ol className="h2h-duels list-unstyled m-0">
                        {duels.map(({ first, second, won, lost }) => (
                            <li key={`${first}-${second}`}>
                                <Link to={`/stats/players?players=${first},${second}`} className="h2h-duel text-decoration-none" aria-label={`${nameOf(first)} ${won} : ${lost} ${nameOf(second)}`}>
                                    <span className="h2h-duel-side">{avatar(first)}<span className="text-default fs-7 fw-semibold text-truncate">{nameOf(first)}</span></span>
                                    <span className="h2h-duel-score tabular-nums">{won}<span className="text-faint"> : </span>{lost}</span>
                                    <span className="h2h-duel-side is-second"><span className="text-subtle fs-7 fw-semibold text-truncate">{nameOf(second)}</span>{avatar(second)}</span>
                                    <span className="h2h-duel-bar" aria-hidden="true"><span style={{ width: `${(won / (won + lost)) * 100}%` }} /></span>
                                </Link>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <div className="overflow-auto">
                        <table className="h2h-matrix">
                            <thead>
                                <tr>
                                    <th aria-hidden="true" />
                                    {ids.map(id => <th key={id} scope="col">{avatar(id)}<span className="visually-hidden">{players.get(id)?.nickname}</span></th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {ids.map(row => (
                                    <tr key={row}>
                                        <th scope="row">
                                            <Link to={`/players/${row}`} className="d-flex align-items-center gap-2 text-decoration-none">
                                                {avatar(row)}
                                                <span className="text-default fs-7 fw-semibold text-truncate">{players.get(row)?.nickname}</span>
                                            </Link>
                                        </th>
                                        {ids.map(column => {
                                            if (row === column) return <td key={column} className="is-self" aria-label="–" />;
                                            const won = winsOf(row, column);
                                            const lost = winsOf(column, row);
                                            const state = won + lost === 0 ? 'none' : won > lost ? 'lead' : won < lost ? 'behind' : 'even';
                                            return (
                                                <td key={column} className={`is-${state}`} title={`${players.get(row)?.nickname} ${won} : ${lost} ${players.get(column)?.nickname}`}>
                                                    {won + lost === 0 ? '·' : <Link to={`/stats/players?players=${row},${column}`} className="text-reset text-decoration-none">{won}</Link>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }
        </Panel>
    );
};

export default HeadToHeadWidget;
