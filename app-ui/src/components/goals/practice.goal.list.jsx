import GoalProgress from '../elements/goal.progress';
import { figureOf } from './goal.kinds';
import { formatDate } from '../../utils/dates';
import { t } from '../../utils/i18n';
import FigureValue from '../elements/figure.value';

/**
 * The user's weekly goals with how far each is: what it is, the figure
 * ("2 / 3") and a bar; a goal reached has a check and the bar in green.
 * compact: the rows a little tighter, for the dashboard.
 */
export const PracticeGoalList = ({ goals = [], compact = false }) => (
    <ul className={`list-unstyled m-0 d-flex flex-column ${compact ? 'gap-2' : 'gap-3'}`}>
        {goals.map(goal => (
            <li key={goal.id} className={`practice-goal ${goal.reached ? 'is-reached' : ''}`}>
                <span className="d-flex align-items-baseline justify-content-between gap-2">
                    <span className="text-default fs-7 fw-semibold">
                        {goal.reached && <i className="pi pi-check practice-goal-check me-1" aria-hidden="true" />}
                        {goal.description}
                    </span>
                    <span className="practice-goal-figure fs-8 tabular-nums text-nowrap">
                        {goal.reached && <span className="visually-hidden">{t('Reached')}{': '}</span>}
                        <FigureValue value={figureOf(goal)} />
                    </span>
                </span>
                <GoalProgress share={goal.share} done={goal.reached} label={goal.description} />
            </li>
        ))}
    </ul>
);

// what each dot of a week says (for screen readers, and as its tooltip)
const DOT_TITLES = { reached: t('Reached'), missed: t('Not reached'), none: t('No goals'), running: t('This week') };

/**
 * The last weeks as dots, oldest first, as the streak's flames: green when
 * all goals were reached, a ring for the week running; with the weeks in a
 * row beside them from two on.
 */
export const WeekDots = ({ recent = [], streak = 0 }) => (
    <span className="d-inline-flex align-items-center gap-2">
        <span className="practice-week-dots">
            {recent.map(entry => (
                <span key={entry.week} className={`is-${entry.state}`} title={`${formatDate(entry.week, { year: 'none' })} · ${DOT_TITLES[entry.state]}`} />
            ))}
        </span>
        {streak >= 2 && <span className="text-subtle fs-8 text-nowrap">{t('{{count}} weeks in a row', { count: streak })}</span>}
    </span>
);
