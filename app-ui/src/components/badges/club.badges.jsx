import { Avatar } from 'primereact/avatar';

import ClubMedal from './club.medal';
import GoalProgress from '../elements/goal.progress';
import { formatDate } from '../../utils/dates';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { locale, t, tn } from '../../utils/i18n';

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);
const CATEGORIES = [
    { category: 'together', title: t('Together') },
    { category: 'clubLife', title: t('Club life') },
    { category: 'firsts', title: t('Club firsts') },
];

/**
 * The club's best medals next to its name on a card, and how many more.
 * badges: the best few ({ id, group, tier, tiers, title, description }); count: all of them
 */
export const ClubMedalRow = ({ badges = [], count = badges.length, size = 'xs' }) => {
    if (!badges.length) return null;
    return (
        <span className="club-medal-row" aria-label={tn(count, '{{count}} club badge', '{{count}} club badges')}>
            {badges.map(badge => <ClubMedal key={badge.id} badge={badge} size={size} />)}
            {count > badges.length && <span className="text-faint fs-9">+{count - badges.length}</span>}
        </span>
    );
};

// who made a club badge happen, with their picture, and when, small in the corner
const EarnedBy = ({ earned }) => {
    const player = earned.player;
    const nickname = player?.nickname ?? earned.nickname;
    return (
        <span className="club-badge-earned">
            {nickname
                ? <span className="d-inline-flex align-items-center gap-2 min-w-0 text-subtle fs-8" title={t('{{nickname}} made it happen', { nickname })}>
                    <Avatar
                        label={player ? resolvePlayerInitials(player.firstname ?? nickname, player.lastname ?? '') : nickname.charAt(0)}
                        image={player ? resolvePlayerImg(player.profileImg) : undefined}
                        shape="circle"
                        className="avatar-xs bg-surface-high flex-shrink-0"
                    />
                    <span className="text-truncate">{nickname}</span>
                </span>
                : <span />}
            <span className="text-faint fs-9 text-nowrap">{formatDate(earned.earnedAt)}</span>
        </span>
    );
};

// a step of a ladder as its tooltip says it: the badge, and when and by whom it was earned
const stepTitle = (badge) => [
    badge.title,
    badge.earned && formatDate(badge.earned.earnedAt),
    badge.earned && (badge.earned.player?.nickname ?? badge.earned.nickname) && t('{{nickname}} made it happen', { nickname: badge.earned.player?.nickname ?? badge.earned.nickname }),
].filter(Boolean).join(' · ');

/**
 * Every badge of the club by category, a tile per series: the step the club is
 * working on (or the top one once all are earned) with how far it is, under it
 * the whole ladder of the series (the earned steps in gold, the next outlined),
 * and who made the latest earned step happen, and when.
 */
export const ClubBadgeList = ({ badges = [] }) => {
    const series = [...new Set(badges.map(badge => badge.group))].map(group => badges.filter(badge => badge.group === group));
    return (
        <div className="d-flex flex-column gap-4">
            {CATEGORIES.map(({ category, title }) => {
                const entries = series.filter(steps => steps[0].category === category);
                if (!entries.length) return null;
                return (
                    <section key={category} className="d-flex flex-column gap-3">
                        <h3 className="game-setup-section-title m-0">{title}</h3>
                        <ul className="club-badges-grid">
                            {entries.map(steps => {
                                const next = steps.find(badge => !badge.earned);
                                const latest = [...steps].reverse().find(badge => badge.earned);
                                const badge = next ?? latest;
                                return (
                                    <li key={badge.group} className={`club-badge-card ${latest ? '' : 'is-locked'}`}>
                                        <ClubMedal badge={latest ?? badge} locked={!latest} size="sm" />
                                        <span className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                                            <span className="text-default fs-7 fw-semibold text-truncate">{badge.title}</span>
                                            <span className="text-faint fs-8">{badge.description}</span>
                                            {next && next.target > 1 &&
                                                <span className="d-flex flex-column gap-1">
                                                    <GoalProgress value={next.progress} target={next.target} label={next.title} />
                                                    <span className="text-faint fs-9 tabular-nums">{formatNumber(next.progress)} / {formatNumber(next.target)}</span>
                                                </span>}
                                            {steps.length > 1 &&
                                                <ol className="club-ladder list-unstyled m-0" aria-label={t('All steps')}>
                                                    {steps.map(step => (
                                                        <li key={step.id} className={step.earned ? 'is-earned' : step === next ? 'is-next' : ''} title={stepTitle(step)}>
                                                            <i className={`pi ${step.earned ? 'pi-check' : step === next ? 'pi-hourglass' : 'pi-lock'}`} aria-hidden="true" />
                                                            {formatNumber(step.target)}
                                                        </li>
                                                    ))}
                                                </ol>}
                                            {latest && <EarnedBy earned={latest.earned} />}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
};

/**
 * The club's goals with how far each is, and when it ends or was reached.
 * className: how they stand (one under the other, or a grid across a wide panel).
 */
export const ClubGoalList = ({ goals = [], className = 'd-flex flex-column gap-3' }) => (
    <ul className={`list-unstyled m-0 ${className}`}>
        {goals.map(goal => (
            <li key={goal.id} className="d-flex flex-column gap-1">
                <span className="d-flex align-items-baseline justify-content-between gap-2">
                    <span className="text-default fs-7 fw-semibold">{goal.description}</span>
                    <span className="text-subtle fs-8 tabular-nums text-nowrap">{formatNumber(goal.progress)} / {formatNumber(goal.target)}</span>
                </span>
                <GoalProgress value={goal.progress} target={goal.target} label={goal.description} />
                <span className="text-faint fs-8">
                    {goal.reachedAt
                        ? t('Reached on {{date}}', { date: formatDate(goal.reachedAt) })
                        : goal.until ? t('Until {{date}}', { date: formatDate(goal.until) }) : t('No end date')}
                </span>
            </li>
        ))}
    </ul>
);

/**
 * The club badges a game or training just tipped: "Your game made it".
 */
export const ClubBadgeNews = ({ badges = [], training = false }) => {
    if (!badges.length) return null;
    return (
        <div className="d-flex flex-column gap-2">
            <span className="text-subtle fs-7">{training ? t('Your training earned the club a badge:') : t('This game earned the club a badge:')}</span>
            <ul className="list-unstyled m-0 d-flex flex-wrap gap-3">
                {badges.map(badge => (
                    <li key={badge.id} className="d-flex align-items-center gap-2 game-badge-new">
                        <ClubMedal badge={badge} size="sm" animate />
                        <span className="d-flex flex-column">
                            <span className="text-default fs-7 fw-semibold">{badge.title}</span>
                            <span className="text-faint fs-8">{badge.description}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
