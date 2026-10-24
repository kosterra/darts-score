import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';

import StatsService from '../../../services/stats.service';
import { Lines } from '../../elements/skeletons';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { t, tn } from '../../../utils/i18n';

const TILES = [
    { key: 'mostPlayed', label: t('Played most'), icon: 'pi pi-users' },
    { key: 'leastPlayed', label: t('Played least'), icon: 'pi pi-user' },
    { key: 'best', label: t('Best record'), icon: 'pi pi-thumbs-up' },
    { key: 'worst', label: t('Toughest opponent'), icon: 'pi pi-shield' },
];

/**
 * A player's head to head with the others of the club, on their statistics:
 * the opponent played most and least, the best record and the toughest, each
 * with the games together and the score of wins, and the way to the
 * comparison of the two, in the game they play most.
 */
const HeadToHeadPanel = ({ player }) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        setData(null);
        StatsService.loadRivals(player.id).then(setData).catch(() => setData({}));
    }, [player.id]);

    const tiles = TILES.filter(tile => data?.[tile.key]);

    return (
        <Panel header={t('Head to head')} className="h-100">
            {!data
                ? <Lines count={4} />
                : tiles.length === 0
                    ? <p className="text-subtle fs-7 m-0">{t('No games against others in the club yet.')}</p>
                    : <>
                        <ul className="rival-tiles list-unstyled m-0">
                            {tiles.map(tile => {
                                const entry = data[tile.key];
                                const other = entry.player;
                                const params = new URLSearchParams({ players: `${player.id},${other.id}`, ...(entry.type && { type: entry.type }) });
                                return (
                                    <li key={tile.key}>
                                        <Link to={`/stats/players?${params.toString()}`} className="rival-tile">
                                            <span className="rival-tile-label"><i className={tile.icon} aria-hidden="true" />{tile.label}</span>
                                            <span className="d-flex align-items-center gap-2 min-w-0">
                                                <Avatar
                                                    label={other.profileImg ? undefined : resolvePlayerInitials(other.firstname, other.lastname)}
                                                    image={resolvePlayerImg(other.profileImg)}
                                                    shape="circle"
                                                    className="avatar-sm bg-surface-high flex-shrink-0"
                                                />
                                                <span className="d-flex flex-column min-w-0">
                                                    <span className="text-default fw-semibold text-truncate">{other.nickname}</span>
                                                    <span className="text-subtle fs-8 tabular-nums">
                                                        {tn(entry.games, '{{count}} game', '{{count}} games')}{' · '}{t('{{wins}} : {{losses}} won', { wins: entry.wins, losses: entry.losses })}
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="rival-tile-compare">{t('Compare')}<i className="pi pi-arrow-right" aria-hidden="true" /></span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                        {(!data.best || !data.worst) && <p className="text-faint fs-8 mt-3 mb-0">{t('The best record and the toughest opponent count from {{count}} games together.', { count: data.minGames })}</p>}
                    </>}
        </Panel>
    );
};

export default HeadToHeadPanel;
