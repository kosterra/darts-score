import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';

import StatsService from '../../../services/stats.service';
import LevelBadge from '../../players/level.badge';
import FormBadge from '../../stats/players/form.badge';
import { useAuth } from '../../../utils/auth.context';
import { useMyPlayers, playerInClub } from '../../../utils/use.my.players';
import { averageLevelOf } from '../../../utils/average.levels';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);

/**
 * "You" on the dashboard: the user's own level, X01 average and form in the
 * club, with the way to their full statistics. Every user sees their own;
 * nothing for someone who does not play in the club.
 */
const MeWidget = ({ widget }) => {
    const navigate = useNavigate();
    const { activeClub, isGlobalAdmin } = useAuth();
    const player = playerInClub(useMyPlayers(!isGlobalAdmin), activeClub?.id);
    const [stats, setStats] = useState(null);
    const [form, setForm] = useState(null);

    useEffect(() => {
        if (!player?.id) return;
        StatsService.loadPlayerStats(player.id).then(setStats).catch(() => setStats({}));
        StatsService.loadPlayersForm([player.id]).then(forms => setForm(forms?.[player.id] ?? null)).catch(() => setForm(null));
    }, [player?.id]);

    if (!player) return null;

    const level = stats?.level;
    const average = stats?.avg?.overallX01 ?? 0;
    const averageLevel = average > 0 ? averageLevelOf(average) : null;
    const games = stats?.playedGames?.total ?? 0;
    const wins = stats?.wonGames?.total ?? 0;

    return (
        <Panel header={widget.title} className="h-100">
            <div className="me-widget">
                <div className="me-widget-head">
                    <Avatar
                        image={player.profileImg ? resolvePlayerImg(player.profileImg) : undefined}
                        label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname, player.lastname)}
                        shape="circle"
                        className="avatar-md bg-surface-high flex-shrink-0"
                    />
                    <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
                        <span className="text-default fw-semibold text-truncate">{player.nickname}</span>
                        {level && <LevelBadge level={level.level} />}
                    </div>
                </div>

                {!stats
                    ? <span className="text-faint fs-8">Loading…</span>
                    : (
                        <dl className="me-widget-figures">
                            <div>
                                <dt>X01 average</dt>
                                <dd>
                                    {average > 0 ? average.toFixed(1) : '–'}
                                    {averageLevel && <span className="fs-8 fw-semibold ms-2" style={{ color: averageLevel.color }}>{averageLevel.name}</span>}
                                </dd>
                            </div>
                            <div>
                                <dt>Games</dt>
                                <dd>{formatNumber(games)}{games > 0 && <span className="text-faint fs-8 fw-normal ms-2">{formatNumber(wins)} won</span>}</dd>
                            </div>
                            <div className="me-widget-wide">
                                <dt>Form</dt>
                                <dd><FormBadge form={form} color="var(--primary-color)" /></dd>
                            </div>
                            {level?.next &&
                                <div className="me-widget-wide">
                                    <dt>Next level</dt>
                                    <dd className="fw-normal fs-8 text-subtle">
                                        {level.next.name}{level.next.missing?.length > 0 && ` – needs ${level.next.missing.map(entry => entry.label).join(' and ')}`}
                                    </dd>
                                </div>
                            }
                        </dl>
                    )
                }

                <Button type="button" label="My statistics" icon="pi pi-chart-bar" size="small" severity="secondary" className="align-self-start" onClick={() => navigate(`/players/${player.id}`)} />
            </div>
        </Panel>
    );
};

export default MeWidget;
