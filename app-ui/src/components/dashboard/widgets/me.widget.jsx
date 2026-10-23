import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';

import StatsService from '../../../services/stats.service';
import LevelBadge from '../../players/level.badge';
import { LEVEL_STYLES } from '../../../utils/levels';
import FormBadge from '../../stats/players/form.badge';
import FormFigures from '../../stats/players/form.figures';
import { useAuth } from '../../../utils/auth.context';
import { useMyPlayers, playerInClub } from '../../../utils/use.my.players';
import { averageLevelOf } from '../../../utils/average.levels';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { locale, t, tn } from '../../../utils/i18n';

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

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

    const nextColor = (LEVEL_STYLES[level?.next?.id] ?? LEVEL_STYLES[level?.level?.id])?.color;
    const needs = level?.next?.missing?.length
        ? level.next.missing.map(entry => entry.id === 'xp' && level.next.xp ? t('{{formatNumber}} XP', { formatNumber: formatNumber(level.next.xp - level.xp) }) : entry.label).join(' · ')
        : null;
    const recentGames = form?.figures?.recent?.games ?? 0;

    return (
        <Panel header={widget.title} className="h-100">
            <div className="me-widget">
                {/* who: the photo, the name, the level and the way to the next one */}
                <div className="me-widget-head">
                    <Avatar
                        image={player.profileImg ? resolvePlayerImg(player.profileImg) : undefined}
                        label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname, player.lastname)}
                        shape="circle"
                        className="avatar-md bg-surface-high flex-shrink-0"
                    />
                    <div className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                        <span className="text-default fw-semibold text-truncate">{player.nickname}</span>
                        {level && <LevelBadge level={level.level} />}
                        {level?.next &&
                            <div className="me-widget-next">
                                <ProgressBar value={level.progress} showValue={false} className="level-progress" style={{ '--level-color': nextColor }} />
                                <span className="text-faint fs-8">{t('Next:')}{' '}<span className="text-subtle">{level.next.name}</span>{needs && ` · ${needs}`}</span>
                            </div>
                        }
                    </div>
                </div>

                {!stats
                    ? <span className="text-faint fs-8">{t('Loading…')}</span>
                    : <>
                        {/* the three figures that matter most, side by side */}
                        <div className="me-widget-tiles">
                            <div className="me-widget-tile">
                                <span className="me-widget-label">{t('X01 average')}</span>
                                <span className="me-widget-value">{average > 0 ? average.toFixed(1) : '–'}</span>
                                {averageLevel &&
                                    <span className="me-widget-average-level" style={{ color: averageLevel.color }}>
                                        <averageLevel.icon aria-hidden="true" />
                                        {averageLevel.name}
                                    </span>
                                }
                            </div>
                            <div className="me-widget-tile">
                                <span className="me-widget-label">{t('Games')}</span>
                                <span className="me-widget-value">{formatNumber(games)}</span>
                                {games > 0 && <span className="text-faint fs-8">{tn(wins, '{{count}} won', '{{count}} won', { count: formatNumber(wins) })}</span>}
                            </div>
                            <div className="me-widget-tile">
                                <span className="me-widget-label">{t('Form')}</span>
                                <FormBadge form={form} color="var(--primary-color)" stacked />
                            </div>
                        </div>

                        {recentGames > 0 && <>
                            <p className="game-setup-section-title m-0">{t('Last {{count}} X01 games', { count: recentGames })}</p>
                            <FormFigures form={form} keys={['checkoutRate', 'tonPlus', 'dartsPerLeg', 'under30']} compact />
                        </>}
                    </>
                }

                <Button type="button" label={t('My statistics')} icon="pi pi-chart-bar" size="small" severity="secondary" className="align-self-start mt-auto" onClick={() => navigate(`/players/${player.id}`)} />
            </div>
        </Panel>
    );
};

export default MeWidget;
