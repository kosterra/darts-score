import ClubMedal from './club.medal';
import { formatDate } from '../../utils/dates';
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

// how far towards a target, as a thin bar
export const ClubProgress = ({ value, target, label }) => (
    <span className={`club-progress ${value >= target ? 'is-done' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={value} aria-label={label}>
        <span style={{ width: `${Math.min(100, target ? value / target * 100 : 0)}%` }} />
    </span>
);

// when and by whom a club badge was earned: "12.11.2026 · Anna made it happen"
const earnedLine = (earned) => [formatDate(earned.earnedAt), earned.nickname ? t('{{nickname}} made it happen', { nickname: earned.nickname }) : null].filter(Boolean).join(' · ');

/**
 * Every badge of the club by category: the earned ones with when and by whom,
 * the others with how far the club is (the next tier of a series only).
 */
export const ClubBadgeList = ({ badges = [] }) => {
    // of a series: the earned tiers and the next one to reach
    const shown = badges.filter((badge, index) => badge.earned || !badges.slice(0, index).some(other => other.group === badge.group && !other.earned));
    return (
        <div className="d-flex flex-column gap-4">
            {CATEGORIES.map(({ category, title }) => {
                const entries = shown.filter(badge => badge.category === category);
                if (!entries.length) return null;
                return (
                    <section key={category} className="d-flex flex-column gap-3">
                        <h3 className="game-setup-section-title m-0">{title}</h3>
                        <ul className="club-badges-grid">
                            {entries.map(badge => (
                                <li key={badge.id} className={`club-badge-card ${badge.earned ? '' : 'is-locked'}`}>
                                    <ClubMedal badge={badge} locked={!badge.earned} size="sm" />
                                    <span className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                                        <span className="text-default fs-7 fw-semibold text-truncate">{badge.title}</span>
                                        <span className="text-faint fs-8">{badge.description}</span>
                                        {badge.earned
                                            ? <span className="text-subtle fs-8">{earnedLine(badge.earned)}</span>
                                            : badge.target > 1 &&
                                                <span className="d-flex flex-column gap-1">
                                                    <ClubProgress value={badge.progress} target={badge.target} label={badge.title} />
                                                    <span className="text-faint fs-9 tabular-nums">{formatNumber(badge.progress)} / {formatNumber(badge.target)}</span>
                                                </span>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
};

/**
 * The club's goals with how far each is, and when it ends or was reached.
 */
export const ClubGoalList = ({ goals = [] }) => (
    <ul className="list-unstyled m-0 d-flex flex-column gap-3">
        {goals.map(goal => (
            <li key={goal.id} className="d-flex flex-column gap-1">
                <span className="d-flex align-items-baseline justify-content-between gap-2">
                    <span className="text-default fs-7 fw-semibold">{goal.description}</span>
                    <span className="text-subtle fs-8 tabular-nums text-nowrap">{formatNumber(goal.progress)} / {formatNumber(goal.target)}</span>
                </span>
                <ClubProgress value={goal.progress} target={goal.target} label={goal.description} />
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
