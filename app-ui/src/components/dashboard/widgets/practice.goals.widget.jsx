import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';

import GoalsService from '../../../services/goals.service';
import { PracticeGoalList, WeekDots } from '../../goals/practice.goal.list';
import { weekLeftText } from '../../goals/goal.kinds';
import { Lines } from '../../elements/skeletons';
import { t } from '../../../utils/i18n';

/**
 * The user's own goals for the week, in all their clubs, with how far each
 * is, how long the week still runs and the last weeks as dots; without
 * goals, the way to set some.
 */
const PracticeGoalsWidget = ({ widget }) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        GoalsService.loadGoals().then(setData).catch(error => console.error('Failed to load the weekly goals', error));
    }, []);

    return (
        <Panel header={widget.title} className="h-100">
            {!data
                ? <Lines count={3} />
                : data.goals.length > 0
                    ? <div className="d-flex flex-column gap-3">
                        <PracticeGoalList goals={data.goals} compact />
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            <span className="text-faint fs-8">{weekLeftText(data.week)}</span>
                            <WeekDots recent={data.recent} streak={data.streak} />
                        </div>
                        <Link to="/profile#playing" className="fs-8">{t('Set your goals')}</Link>
                    </div>
                    : <div className="d-flex flex-column align-items-start gap-3">
                        <span className="text-faint fs-7">{t('No goals yet. Set a few for the week, e.g. three trainings, and see how far you are here.')}</span>
                        <Link to="/profile#playing" className="p-button p-button-sm p-button-outlined text-decoration-none">
                            <i className="pi pi-flag me-2" aria-hidden="true" />{t('Set your goals')}
                        </Link>
                    </div>}
        </Panel>
    );
};

export default PracticeGoalsWidget;
