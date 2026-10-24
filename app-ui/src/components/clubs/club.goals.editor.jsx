import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Panel } from 'primereact/panel';

import ClubService from '../../services/club.service';
import StatsService from '../../services/stats.service';
import { ClubGoalList, ClubMedalRow } from '../badges/club.badges';
import { calendarFormat } from '../../utils/dates';
import { useAuth } from '../../utils/auth.context';
import { Lines } from '../elements/skeletons';
import { t } from '../../utils/i18n';

const MAX_GOALS = 3;
// what a goal can count, as the API knows it (club.badges.js GOAL_METRICS)
const METRICS = [
    { value: 'games', label: t('Games') },
    { value: 'num180s', label: t('180s') },
    { value: 'darts', label: t('Darts thrown') },
    { value: 'tonPlus', label: t('Ton-plus visits') },
    { value: 'highFinishes', label: t('High finishes (100 or more)') },
    { value: 'trainings', label: t('Trainings') },
];
const DEFAULT_TARGETS = { games: 100, num180s: 50, darts: 10000, tonPlus: 200, highFinishes: 20, trainings: 50 };

// a goal as the editor holds it
const draftOf = (goal) => ({ id: goal.id ?? null, metric: goal.metric, target: goal.target, until: goal.until ? new Date(goal.until) : null });

/**
 * The club's badges and its goals, on the Edit club page: the medals it
 * earned so far (all of them on the badges page), and the goals the admins
 * set, e.g. 100 × 180 until the end of the season. Saved with Save.
 */
const ClubGoalsEditor = ({ club, onError }) => {
    const { activeClub, selectClub } = useAuth();
    const [overview, setOverview] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        StatsService.loadClubOwnBadges(club.id)
            .then(data => {
                setOverview(data);
                setDrafts(data.goals.map(draftOf));
            })
            .catch(error => onError(t('Club goals'), error));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [club.id]);

    const change = (index, changes) => setDrafts(current => current.map((goal, at) => (at === index ? { ...goal, ...changes } : goal)));
    const add = () => setDrafts(current => [...current, { id: null, metric: 'num180s', target: DEFAULT_TARGETS.num180s, until: null }]);
    const remove = (index) => setDrafts(current => current.filter((_, at) => at !== index));

    const save = async () => {
        setSaving(true);
        try {
            const goals = await ClubService.updateGoals(club.id, drafts.map(goal => ({ ...goal, until: goal.until ? goal.until.toISOString() : null })));
            setOverview(current => ({ ...current, goals }));
            setDrafts(goals.map(draftOf));
        } catch (error) {
            onError(t('Club goals'), error);
        } finally {
            setSaving(false);
        }
    };

    const earned = (overview?.badges ?? []).filter(badge => badge.earned).sort((a, b) => b.tier - a.tier);
    const valid = drafts.every(goal => goal.metric && goal.target >= 1);

    return (
        <Panel header={t('Club badges and goals')} className="mt-4">
            <div className="row g-4">
                <div className="col-12 col-xl-6">
                    <p className="game-setup-section-title">{t('Club badges')}</p>
                    <p className="text-faint fs-8 mt-0">{t('Earned together: every game and training of the members adds to them. The members hear about each new one.')}</p>
                    {!overview
                        ? <Lines count={2} />
                        : earned.length
                            ? <div className="d-flex flex-column gap-2">
                                <ClubMedalRow badges={earned.slice(0, 8)} count={earned.length} size="sm" />
                                <span className="text-subtle fs-8">{t('{{earned}} of {{total}} club badges', { earned: overview.earnedCount, total: overview.total })}</span>
                            </div>
                            : <span className="text-faint fs-7">{t('No club badge yet: the first comes with the 100th game, the first 180 or eight players on one day.')}</span>}
                    <Link to="/badges#club" className="d-inline-block fs-8 mt-3" onClick={() => activeClub?.id !== club.id && selectClub(club.id)}>{t('All club badges')}</Link>
                </div>
                <div className="col-12 col-xl-6">
                    <p className="game-setup-section-title">{t('Club goals')}</p>
                    <p className="text-faint fs-8 mt-0">{t('Up to three goals for the whole club, e.g. 100 × 180 until the end of the season. They show on the badges page and the dashboard; the members hear when one is reached.')}</p>
                    {overview?.goals?.length > 0 && <div className="mb-4"><ClubGoalList goals={overview.goals} /></div>}
                    <div className="d-flex flex-column gap-3">
                        {drafts.map((goal, index) => (
                            <div key={goal.id ?? `new-${index}`} className="club-goal-row">
                                <Dropdown
                                    value={goal.metric}
                                    options={METRICS}
                                    onChange={(e) => change(index, { metric: e.value, ...(goal.id ? {} : { target: DEFAULT_TARGETS[e.value] }) })}
                                    aria-label={t('What the goal counts')}
                                    className="club-goal-metric"
                                />
                                <InputNumber
                                    value={goal.target}
                                    onValueChange={(e) => change(index, { target: e.value ?? 1 })}
                                    min={1}
                                    max={10000000}
                                    useGrouping
                                    aria-label={t('The number to reach')}
                                    inputClassName="club-goal-target"
                                />
                                <Calendar
                                    value={goal.until}
                                    onChange={(e) => change(index, { until: e.value ?? null })}
                                    dateFormat={calendarFormat()}
                                    minDate={new Date()}
                                    placeholder={t('No end date')}
                                    showIcon
                                    icon="pi pi-calendar"
                                    showButtonBar
                                    aria-label={t('Until')}
                                    className="club-goal-until"
                                />
                                <Button type="button" icon="pi pi-trash" text severity="danger" aria-label={t('Remove the goal')} onClick={() => remove(index)} />
                            </div>
                        ))}
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                            {drafts.length < MAX_GOALS
                                ? <Button type="button" label={t('Add a goal')} icon="pi pi-plus" size="small" outlined onClick={add} />
                                : <span className="text-faint fs-8">{t('A club has at most three goals.')}</span>}
                            <Button type="button" label={t('Save')} icon="pi pi-save" size="small" loading={saving} disabled={!overview || !valid} onClick={save} />
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    );
};

export default ClubGoalsEditor;
