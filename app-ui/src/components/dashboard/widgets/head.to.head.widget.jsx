import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Avatar } from 'primereact/avatar';

import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

/**
 * Who beats whom: each cell is how often the row's player beat the column's
 * player, green when the row's player leads the duel.
 */
const HeadToHeadWidget = ({ widget, headToHead, players }) => {
    const ids = headToHead.players;
    const winsOf = (a, b) => headToHead.wins[a]?.[b] ?? 0;

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
            <p className="text-faint fs-8 mt-0 mb-3">Wins of the player on the left against the player above.</p>
            {ids.length < 2
                ? <p className="text-subtle m-0">Head-to-heads appear once players have played each other.</p>
                : (
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
                                                    {won + lost === 0 ? '·' : won}
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
