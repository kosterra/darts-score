import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';

import StatsService from '../../services/stats.service';
import BadgeMedal from './badge.medal';
import Celebration from './celebration';
import ShameMedal from './shame.medal';
import TarredAndFeathered from './tarred.and.feathered';
import { FaSoap } from 'react-icons/fa6';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { t } from '../../utils/i18n';

const RETRIES = 3;
const RETRY_MS = 1200;

/**
 * The badges players earned in one game, and their Hall of Shame of the game
 * (what they got and what they washed off). With "celebrate" (right after the
 * game was won) it also opens the winner celebration, and after it the
 * tarred and feathered for whoever landed in the Hall of Shame.
 */
const GameBadges = ({ gameType, gameId, players = [], winner, celebrate = false, className = '' }) => {
    const [groups, setGroups] = useState([]);
    const [shame, setShame] = useState([]);
    // 'celebrating' → 'tarring' → null
    const [moment, setMoment] = useState(celebrate ? 'celebrating' : null);

    useEffect(() => {
        if (celebrate) setMoment('celebrating');
    }, [celebrate]);

    useEffect(() => {
        let cancelled = false;
        const load = async (attempt) => {
            try {
                const result = await StatsService.loadGameBadges(gameType, gameId);
                if (cancelled) return;
                // right after the last dart the game may not be saved as finished yet
                if (!result.finished && celebrate && attempt < RETRIES) {
                    setTimeout(() => load(attempt + 1), RETRY_MS);
                    return;
                }
                setGroups(result.players
                    .map(entry => ({ player: players.find(player => player.id === entry.player), badges: entry.badges }))
                    .filter(group => group.player));
                setShame((result.shame ?? [])
                    .map(entry => ({ ...entry, player: players.find(player => player.id === entry.player) }))
                    .filter(group => group.player));
            } catch (error) {
                console.error('Failed to load the badges of this game', error);
            }
        };
        if (players.length > 0) load(0);
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameType, gameId, players.length, celebrate]);

    return (
        <>
            {groups.length > 0 &&
                <Panel header={t('Badges earned in this game')} className={className}>
                    <div className="d-flex flex-column gap-3 p-2">
                        {groups.map((group, groupIndex) => (
                            <div key={group.player.id} className="d-flex flex-wrap align-items-center gap-3">
                                <Link to={`/players/${group.player.id}#badges`} className="d-flex align-items-center gap-2 text-default fw-semibold" style={{ minWidth: '10rem' }}>
                                    <Avatar
                                        label={resolvePlayerInitials(group.player.firstname, group.player.lastname)}
                                        image={resolvePlayerImg(group.player.profileImg)}
                                        shape="circle"
                                        className="avatar-sm bg-surface-high"
                                    />
                                    {group.player.nickname}
                                </Link>
                                <ul className="list-unstyled m-0 d-flex flex-wrap gap-3">
                                    {group.badges.map((badge, index) => (
                                        <li key={badge.id} className="d-flex align-items-center gap-2">
                                            <BadgeMedal badge={badge} size="sm" animate delay={150 * (index + groupIndex * 3)} />
                                            <span className="text-subtle fs-7">{badge.title}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </Panel>
            }
            {shame.length > 0 &&
                <Panel header={t('Hall of Shame in this game')} className={className}>
                    <div className="d-flex flex-column gap-3 p-2">
                        {shame.map(group => (
                            <div key={group.player.id} className="d-flex flex-wrap align-items-center gap-3">
                                <Link to={`/players/${group.player.id}#badges`} className="d-flex align-items-center gap-2 text-default fw-semibold" style={{ minWidth: '10rem' }}>
                                    <Avatar
                                        label={resolvePlayerInitials(group.player.firstname, group.player.lastname)}
                                        image={resolvePlayerImg(group.player.profileImg)}
                                        shape="circle"
                                        className="avatar-sm bg-surface-high"
                                    />
                                    {group.player.nickname}
                                </Link>
                                <ul className="list-unstyled m-0 d-flex flex-wrap gap-3">
                                    {group.got.map(badge => (
                                        <li key={`got-${badge.id}`} className="d-flex align-items-center gap-2">
                                            <ShameMedal badge={badge} size="sm" />
                                            <span className="text-subtle fs-7">{badge.title}{badge.count > 1 ? t(' × {{count}}', { count: badge.count }) : ''}</span>
                                        </li>
                                    ))}
                                    {group.washed.map(badge => (
                                        <li key={`washed-${badge.id}`} className="d-flex align-items-center gap-2">
                                            <ShameMedal badge={badge} size="sm" washed />
                                            <span className="text-subtle fs-7"><FaSoap className="game-shame-soap" aria-hidden="true" />{' '}{t('Washed off')}{' '}{badge.title}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </Panel>
            }
            {moment === 'celebrating' && winner &&
                <Celebration
                    title={t('Game shot!')}
                    subtitle={t('wins the game')}
                    player={winner}
                    badgeGroups={groups}
                    onClose={() => setMoment('tarring')}
                />
            }
            {moment === 'tarring' && shame.some(group => group.got.length > 0) &&
                <TarredAndFeathered
                    groups={shame.filter(group => group.got.length > 0)}
                    onClose={() => setMoment(null)}
                />
            }
        </>
    );
};

export default GameBadges;
