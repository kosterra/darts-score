import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';
import { FaTrophy } from "react-icons/fa";

import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { t } from '../../../utils/i18n';

/**
 * Top players of the club for one figure, e.g. most wins or highest average.
 */
const LeaderboardWidget = ({ widget, entries = [], players }) => {
    return (
        <Panel header={widget.title} className="h-100 dashboard-widget">
            {entries.length === 0
                ? <p className="text-subtle fs-7 m-0 p-2">{t('No games played yet that count for this.')}</p>
                : (
                    <ol className="leaderboard list-unstyled m-0">
                        {entries.map((entry, idx) => {
                            const player = players.get(entry.player);
                            return (
                                <li key={entry.player} className={`leaderboard-row ${idx === 0 ? 'leaderboard-first' : ''}`}>
                                    <span className="leaderboard-rank">
                                        {idx === 0 ? <FaTrophy className="text-gold" aria-label="1" /> : idx + 1}
                                    </span>
                                    <Avatar
                                        label={resolvePlayerInitials(player?.firstname ?? '?', player?.lastname ?? '')}
                                        image={resolvePlayerImg(player?.profileImg)}
                                        shape="circle"
                                        className="avatar-sm bg-surface-high"
                                    />
                                    <Link to={`/players/${entry.player}`} className="leaderboard-name text-default fw-semibold">{player?.nickname ?? t('Unknown')}</Link>
                                    <span className="leaderboard-value">
                                        <span className="text-default fw-semibold fs-5">{widget.format(entry.value)}</span>
                                        <span className="text-faint fs-8 ms-1">{t(widget.unit)}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                )
            }
        </Panel>
    );
};

export default LeaderboardWidget;
