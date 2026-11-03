import { addDays, weekdayOf } from '../../rules/calendar';
import { locale, t } from '../../utils/i18n';

/**
 * What a weekly goal can count, as the API knows it (utils/practice.goals.js
 * GOAL_KINDS): the label, the number it starts with, its largest and whether
 * it is about a training (needed, or only if chosen).
 */
export const GOAL_KINDS = [
    { value: 'trainings', label: t('Trainings'), target: 3, max: 50, training: 'optional' },
    { value: 'trainingScore', label: t('Best score in a training'), target: 100, max: 10000, training: 'required' },
    { value: 'x01Average', label: t('X01 average in a game'), target: 50, max: 180 },
    { value: 'games', label: t('Games'), target: 5, max: 100 },
    { value: 'num180s', label: t('180s'), target: 1, max: 100 },
    { value: 'playDays', label: t('Days played'), target: 3, max: 7 },
];
export const kindOf = (value) => GOAL_KINDS.find(kind => kind.value === value) ?? GOAL_KINDS[0];

// the trainings with a score, with a number to start from that fits each
export const SCORE_TRAININGS = [
    { value: 'bobs27', label: t('Bob\'s 27'), target: 100 },
    { value: 'checkout121', label: t('121 Checkout'), target: 100 },
    { value: 'randomcheckouts', label: t('Random checkouts'), target: 30 },
    { value: 'scoring', label: t('Scoring'), target: 50 },
    { value: 'doublesaround', label: t('Doubles around the board'), target: 60 },
    { value: 'catch40', label: t('Catch 40'), target: 40 },
];
// the trainings to count: all of them ('all' here, none kept), or one
export const ALL_TRAININGS = 'all';
export const COUNT_TRAININGS = [
    { value: ALL_TRAININGS, label: t('All trainings') },
    { value: 'atc', label: t('Around the Clock') },
    { value: 'bot', label: t('X01 against the bot') },
    ...SCORE_TRAININGS.map(({ value, label }) => ({ value, label })),
];

// a goal as the editor holds it
export const draftOf = (goal) => ({ id: goal.id ?? null, kind: goal.kind, target: goal.target, training: goal.training ?? null, withBot: Boolean(goal.withBot) });

// a new goal of a kind, with the number it starts with
export const newGoal = (kind = 'trainings', training = null) => {
    const definition = kindOf(kind);
    const chosen = definition.training === 'required' ? training ?? SCORE_TRAININGS[0].value : definition.training ? training : null;
    const target = definition.training === 'required' ? SCORE_TRAININGS.find(entry => entry.value === chosen).target : definition.target;
    return { id: null, kind, target, training: chosen, withBot: false };
};

// whether the editor's goals can be saved: each a number within its kind's range, with its training
export const goalsValid = (goals) => goals.every(goal => {
    const kind = kindOf(goal.kind);
    return Number.isInteger(goal.target) && goal.target >= 1 && goal.target <= kind.max && (kind.training !== 'required' || Boolean(goal.training));
});

const formatNumber = (value) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(value);
// how far a goal is, as a figure: "2 / 3", "87 / 100", "– / 100" before the first training
export const figureOf = (goal) => `${goal.progress == null ? '–' : formatNumber(goal.progress)} / ${formatNumber(goal.target)}`;

/**
 * How long the week still runs, in words: a few days in, when it ends; then
 * the days left (today included); on Sunday, that it is the last day.
 */
export const weekLeftText = (week, now = new Date()) => {
    if (!week?.key) return '';
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const sunday = addDays(week.key, 6);
    if (today >= sunday || weekdayOf(today) === 0) return t('Last day');
    let left = 1;
    while (addDays(today, left) <= sunday) left += 1;
    return left >= 5 ? t('Ends Sunday') : t('{{count}} days left', { count: left });
};
