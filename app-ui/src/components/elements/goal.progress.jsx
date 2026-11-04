/**
 * How far towards a target, as a thin bar: gold on the way, green once it is
 * reached. value and target for a count (12 of 50); or share (0 to 1) where
 * the way there is not a count, e.g. a score where lower is better, with done
 * saying whether it is reached. label names it for screen readers.
 */
const GoalProgress = ({ value = 0, target = 0, share = null, done = null, label }) => {
    const part = share ?? (target ? value / target : 0);
    const reached = done ?? value >= target;
    return (
        <span className={`goal-progress ${reached ? 'is-done' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, part) * 100)} aria-label={label}>
            <span style={{ width: `${Math.max(0, Math.min(100, part * 100))}%` }} />
        </span>
    );
};

export default GoalProgress;
