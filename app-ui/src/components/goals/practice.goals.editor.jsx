import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { InputNumber } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';

import SectionTitle from '../elements/section.title';
import SettingSwitch from '../elements/setting.switch';
import useAutoSave from '../../utils/use.auto.save';
import GoalsService from '../../services/goals.service';
import { PracticeGoalList, WeekDots } from './practice.goal.list';
import { ALL_TRAININGS, COUNT_TRAININGS, GOAL_KINDS, SCORE_TRAININGS, draftOf, figureOf, goalSettings, goalsValid, kindOf, newGoal, weekLeftText } from './goal.kinds';
import { trainingOf } from '../../rules/trainings';
import { addDays } from '../../rules/calendar';
import { formatDate } from '../../utils/dates';
import { Lines } from '../elements/skeletons';
import { t } from '../../utils/i18n';

const MAX_GOALS = 3;

/**
 * The user's own goals for each week, on the profile (Playing): up to three,
 * each what it counts (trainings, a score in a training, an X01 average,
 * games, 180s, days played), the training where it needs one and the number
 * to reach. They count in all the user's clubs and start again every Monday.
 * Above them how far each is this week, below them the past weeks. Saved as
 * you go: a choice at once, a number a moment after typing.
 */
const PracticeGoalsEditor = ({ onError }) => {
    const [overview, setOverview] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [past, setPast] = useState(null);
    // the whole list each time; the server keeps a goal that stays the same by its id
    const goalsSave = useAutoSave(async (list) => {
        const data = await GoalsService.saveGoals(list);
        setOverview(data);
        // a new goal keeps the id it got, so the next save keeps it too
        setDrafts(current => (current.length === data.goals.length ? current.map((goal, at) => ({ ...goal, id: data.goals[at].id })) : current));
    }, { valid: goalsValid });

    useEffect(() => {
        GoalsService.loadGoals()
            .then(data => {
                setOverview(data);
                setDrafts(data.goals.map(draftOf));
            })
            .catch(error => onError?.(t('Weekly goals'), error));
        GoalsService.loadHistory(12).then(data => setPast(data.weeks)).catch(() => setPast([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // a change shown at once and saved: a choice at once, a number a moment after typing
    const update = (next, options = { now: true }) => {
        setDrafts(next);
        goalsSave.change(next, options);
    };
    const change = (index, changes, options) => update(drafts.map((goal, at) => (at === index ? { ...goal, ...changes } : goal)), options);
    // another kind starts with its own number (and training)
    const changeKind = (index, kind) => change(index, { ...newGoal(kind), id: drafts[index].id });
    const changeTraining = (index, training) => {
        const goal = drafts[index];
        // a score: the number to start from and the settings of that training
        const fits = goal.kind === 'trainingScore' ? { target: SCORE_TRAININGS.find(entry => entry.value === training)?.target ?? goal.target, settings: goalSettings(goal.kind, training) } : {};
        change(index, { training, ...fits });
    };
    const add = () => update([...drafts, newGoal('trainings')]);
    const remove = (index) => update(drafts.filter((_, at) => at !== index));

    return (
        <div>
            <SectionTitle saves={[goalsSave]}>{t('Weekly goals')}</SectionTitle>
            <p className="text-faint fs-8 mt-0">{t('Set goals of your own for each week. They count in all your clubs and start again every Monday. Saved as you go.')}</p>
            {!overview
                ? <Lines count={3} />
                : <>
                    {overview.goals.length > 0 &&
                        <div className="setting-box mb-4 d-flex flex-column gap-3">
                            <PracticeGoalList goals={overview.goals} />
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-faint fs-8">{weekLeftText(overview.week)}</span>
                                <WeekDots recent={overview.recent} streak={overview.streak} />
                            </div>
                        </div>}
                    <div className="d-flex flex-column gap-3">
                        {drafts.map((goal, index) => {
                            const kind = kindOf(goal.kind);
                            const invalid = !Number.isInteger(goal.target) || goal.target < 1 || goal.target > kind.max;
                            return (
                                <div key={goal.id ?? `new-${index}`} className="practice-goal-row">
                                    <Dropdown
                                        value={goal.kind}
                                        options={GOAL_KINDS}
                                        onChange={(e) => changeKind(index, e.value)}
                                        aria-label={t('Goal')}
                                        className="practice-goal-kind"
                                    />
                                    {kind.training &&
                                        <Dropdown
                                            value={goal.training ?? ALL_TRAININGS}
                                            options={kind.training === 'required' ? SCORE_TRAININGS : COUNT_TRAININGS}
                                            onChange={(e) => changeTraining(index, e.value === ALL_TRAININGS ? null : e.value)}
                                            aria-label={t('Training')}
                                            className="practice-goal-training"
                                        />}
                                    <InputNumber
                                        value={goal.target}
                                        // the field also answers when it shows its value: only a new number is a change
                                        onValueChange={(e) => (e.value ?? 0) !== goal.target && change(index, { target: e.value ?? 0 }, { now: false })}
                                        onBlur={goalsSave.flush}
                                        min={1}
                                        max={kind.max}
                                        useGrouping={false}
                                        invalid={invalid}
                                        aria-label={t('Target')}
                                        inputClassName="practice-goal-target"
                                    />
                                    <Button type="button" icon="pi pi-trash" text severity="danger" aria-label={t('Remove the goal')} onClick={() => remove(index)} />
                                    {/* a score counts with the settings that change what it means (121 Checkout: the attempts and the darts) */}
                                    {goal.kind === 'trainingScore' && (trainingOf(goal.training)?.boards ?? []).length > 0 &&
                                        <div className="practice-goal-board">
                                            {trainingOf(goal.training).boards.map(key => {
                                                const option = trainingOf(goal.training).options.find(entry => entry.key === key);
                                                return (
                                                    <SelectButton
                                                        key={key}
                                                        value={goal.settings?.[key] ?? option.default}
                                                        options={option.values}
                                                        onChange={(e) => e.value !== null && e.value !== undefined && change(index, { settings: { ...goalSettings(goal.kind, goal.training, goal.settings), [key]: e.value } })}
                                                        className="p-selectbutton-pills pills-inline flex-wrap"
                                                        aria-label={option.label}
                                                    />
                                                );
                                            })}
                                        </div>}
                                    {goal.kind === 'x01Average' &&
                                        <div className="practice-goal-bot">
                                            <SettingSwitch id={`practice-goal-bot-${index}`} title={t('Count trainings against the bot')} checked={goal.withBot} onChange={(withBot) => change(index, { withBot })} />
                                        </div>}
                                </div>
                            );
                        })}
                        {drafts.length === 0 && <span className="text-faint fs-7">{t('No goals yet. Set a few for the week, e.g. three trainings, and see how far you are here.')}</span>}
                        <div>
                            {drafts.length < MAX_GOALS
                                ? <Button type="button" label={t('Add a goal')} icon="pi pi-plus" size="small" outlined onClick={add} />
                                : <span className="text-faint fs-8">{t('You can set at most three goals.')}</span>}
                        </div>
                    </div>
                </>}
            {past?.length > 0 &&
                <>
                    <p className="game-setup-section-title mt-4">{t('Past weeks')}</p>
                    <ul className="list-unstyled m-0 d-flex flex-column gap-3">
                        {past.map(week => (
                            <li key={week.week} className="d-flex align-items-start justify-content-between gap-3">
                                <span className="d-flex flex-column min-w-0">
                                    <span className="text-default fs-7 fw-semibold tabular-nums">{formatDate(week.week, { year: 'none' })}{' – '}{formatDate(addDays(week.week, 6), { year: 'none' })}</span>
                                    {week.goals.map(goal => <span key={goal.id} className="text-faint fs-8">{goal.description} <span className="tabular-nums">{figureOf(goal)}</span></span>)}
                                </span>
                                <Tag value={week.allReached ? t('Reached') : t('Not reached')} severity={week.allReached ? 'success' : 'secondary'} className="flex-shrink-0" />
                            </li>
                        ))}
                    </ul>
                </>}
        </div>
    );
};

export default PracticeGoalsEditor;
