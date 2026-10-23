import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';

import LevelBadge from '../players/level.badge';
import PlayerRanking from '../elements/player.ranking';
import { KpiHero } from '../stats/players/kpi';
import { LEVEL_STYLES } from '../../utils/levels';
import { playersOverview } from '../../utils/players.overview';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { locale, t, tn } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { ACCENT } from '../../utils/palette';

const GREEN = ACCENT.green;
const CHIPS = 12;
const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

const PlayerAvatar = ({ player, className = 'avatar-sm' }) => (
    <Avatar
        label={player?.profileImg ? undefined : resolvePlayerInitials(player?.firstname ?? player?.nickname ?? '?', player?.lastname ?? '')}
        image={resolvePlayerImg(player?.profileImg)}
        shape="circle"
        className={`${className} bg-surface-high flex-shrink-0`}
    />
);

// when a birthday comes: today, tomorrow or its day
const birthdayText = ({ date, inDays }) => {
    if (inDays === 0) return t('Today');
    if (inDays === 1) return t('Tomorrow');
    return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'long' }).format(date);
};

// members still missing something, each leading to where it is completed
const ToComplete = ({ title, hint, players, hash = '' }) => players.length > 0 && (
    <div className="d-flex flex-column gap-2">
        <span className="d-flex flex-column">
            <span className="text-default fs-7 fw-semibold">{title}</span>
            <span className="text-faint fs-8">{hint}</span>
        </span>
        <div className="players-chips">
            {players.slice(0, CHIPS).map(player => (
                <Link key={player.id} to={`/players/${player.id}/edit${hash}`}>
                    <PlayerAvatar player={player} className="avatar-xs" />
                    {player.nickname}
                </Link>
            ))}
            {players.length > CHIPS && <span className="text-faint fs-8 align-self-center">{t('and {{count}} more', { count: players.length - CHIPS })}</span>}
        </div>
    </div>
);

/**
 * The players of the club at a glance, above the list: how many members,
 * guests and logins, the newcomers, the highest levels and how the levels
 * spread, the birthdays coming up and, for the club's admins, who still
 * misses a date of birth or a login.
 * players: the players of the list (with the guests); levels: { [playerId]: level }
 */
const PlayersOverview = ({ players, levels, canManage }) => {
    const overview = useMemo(() => playersOverview(players ?? [], levels), [players, levels]);

    if (!overview.members) return null;
    const most = Math.max(...overview.levels.map(level => level.count), 1);

    return (
        <div className="d-flex flex-column gap-4 mb-4">
            <Panel header={t('Players of the club')}>
                <div className="kpi-headline">
                    <KpiHero label={t('Members')} value={formatNumber(overview.members)} color={GREEN} />
                    <KpiHero label={t('New in the last 30 days')} value={formatNumber(overview.newLately)} color={GREEN} />
                    <KpiHero label={t('With a login')} value={formatNumber(overview.withLogin)} color={GREEN} />
                    <KpiHero label={t('Guests')} value={formatNumber(overview.guests)} color={GREEN} />
                </div>
            </Panel>

            {overview.ranking.length > 0 &&
                <div className="row g-4">
                    <div className="col-12 col-xl-7">
                        <Panel header={t('Highest levels')} className="h-100">
                            <PlayerRanking entries={overview.ranking.map(entry => ({
                                id: entry.playerId,
                                player: entry.player,
                                value: entry.xp,
                                label: <><strong className="text-default">{formatNumber(entry.xp)}</strong>{' '}{t('XP')}</>,
                                line: <LevelBadge level={entry.level} />,
                            }))} />
                        </Panel>
                    </div>
                    <div className="col-12 col-xl-5">
                        <Panel header={t('Levels of the club')} className="h-100">
                            <ul className="training-popular list-unstyled m-0">
                                {overview.levels.map(level => {
                                    const style = LEVEL_STYLES[level.id] ?? LEVEL_STYLES.rookie;
                                    const Icon = style.icon;
                                    return (
                                        <li key={level.id} style={{ '--level-color': style.color }}>
                                            <span className="players-level-mark" aria-hidden="true"><Icon /></span>
                                            <span className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                                                <span className="d-flex align-items-baseline justify-content-between gap-2">
                                                    <span className="text-default fs-7 fw-semibold text-truncate">{t('Level {{index}}: {{name}}', { index: level.index, name: level.name })}</span>
                                                    <span className="text-subtle fs-8 text-nowrap"><strong className="text-default">{level.count}</strong>{' '}{level.count === 1 ? t('player') : t('players')}</span>
                                                </span>
                                                <span className="badge-ranking-bar is-level" aria-hidden="true"><span style={{ width: `${level.count / most * 100}%` }} /></span>
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Panel>
                    </div>
                </div>
            }

            <div className="row g-4">
                <div className="col-12 col-lg-6">
                    <Panel header={t('New in the club')} className="h-100">
                        <ul className="training-popular list-unstyled m-0">
                            {overview.newest.map(player => (
                                <li key={player.id}>
                                    <Link to={`/players/${player.id}`} className="d-flex align-items-center gap-3 flex-grow-1 text-default text-decoration-none min-w-0">
                                        <PlayerAvatar player={player} className="avatar-md" />
                                        <span className="d-flex flex-column min-w-0">
                                            <span className="text-default fw-semibold text-truncate">{player.nickname}</span>
                                            <span className="text-faint fs-8 text-nowrap">{t('added {{date}}', { date: formatDate(player.createdAt) })}</span>
                                        </span>
                                        <span className="ms-auto"><LevelBadge level={levels?.[player.id]} /></span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>
                <div className="col-12 col-lg-6">
                    <Panel header={t('Birthdays coming up')} className="h-100">
                        {overview.birthdays.length === 0
                            ? <span className="text-faint fs-7">{t('No birthdays in the next 30 days.')}</span>
                            : <ul className="training-popular list-unstyled m-0">
                                {overview.birthdays.map(entry => (
                                    <li key={entry.player.id}>
                                        <Link to={`/players/${entry.player.id}`} className="d-flex align-items-center gap-3 flex-grow-1 text-default text-decoration-none min-w-0">
                                            <PlayerAvatar player={entry.player} className="avatar-md" />
                                            <span className="text-default fw-semibold text-truncate">{entry.player.nickname}</span>
                                            <span className={`ms-auto fs-7 text-nowrap ${entry.inDays === 0 ? 'text-warning fw-semibold' : 'text-subtle'}`}>
                                                {entry.inDays === 0 && <i className="pi pi-gift me-2" aria-hidden="true" />}
                                                {birthdayText(entry)}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>}
                    </Panel>
                </div>
            </div>

            {canManage && (overview.withoutBirth.length > 0 || overview.withoutLogin.length > 0) &&
                <Panel header={t('To complete')}>
                    <div className="d-flex flex-column gap-4">
                        <ToComplete
                            title={tn(overview.withoutBirth.length, '{{count}} member without a date of birth', '{{count}} members without a date of birth')}
                            hint={t('It is needed for the handicap suggestions.')}
                            players={overview.withoutBirth}
                        />
                        <ToComplete
                            title={tn(overview.withoutLogin.length, '{{count}} member without a login', '{{count}} members without a login')}
                            hint={t('With a login they play, see their statistics and collect their badges themselves.')}
                            players={overview.withoutLogin}
                            hash="#login"
                        />
                    </div>
                </Panel>
            }
        </div>
    );
};

export default PlayersOverview;
