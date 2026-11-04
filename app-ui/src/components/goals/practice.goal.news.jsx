import { Message } from 'primereact/message';
import { locale, t } from '../../utils/i18n';

const formatNumber = (value) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(value ?? 0);

/**
 * What a training just saved did for the player's own weekly goals (as the
 * API answers the save): a goal it reached as a success, the others it
 * counts for as a faint line with how far they are now. Nothing without.
 */
const PracticeGoalNews = ({ goals = [], reached = [], className = '' }) => {
    const open = goals.filter(goal => !goal.reached);
    if (!open.length && !reached.length) return null;
    return (
        <div className={`d-flex flex-column gap-2 ${className}`}>
            {reached.map(goal => (
                <Message key={goal.id} severity="success" className="w-100 justify-content-start" text={t('Goal reached: {{goal}}', { goal: goal.description })} />
            ))}
            {open.map(goal => (
                <span key={goal.id} className="text-faint fs-8">
                    {t('Counts for your goal: {{progress}} of {{target}}', { progress: goal.progress == null ? '–' : formatNumber(goal.progress), target: formatNumber(goal.target) })}
                    {' '}({goal.description})
                </span>
            ))}
        </div>
    );
};

export default PracticeGoalNews;
