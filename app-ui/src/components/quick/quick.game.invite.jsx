import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';

/**
 * Under the result of a quick game: what an account adds, with the way there.
 */
const QuickGameInvite = () => (
    <section className="quick-invite mb-4">
        <div className="d-flex flex-column gap-1">
            <span className="text-default fw-semibold">Keep every game, not just this one</span>
            <span className="text-subtle fs-7">
                With an account your club keeps all its games: statistics over time, leaderboards, badges, levels, trainings and your own darts.
                This quick game stays on this device for 30 days.
            </span>
        </div>
        <div className="d-flex flex-wrap gap-2">
            <Link to="/register"><Button label="Create an account" icon="pi pi-user-plus" size="small" /></Link>
            <Link to="/"><Button label="What Oche does" size="small" severity="secondary" text /></Link>
        </div>
    </section>
);

export default QuickGameInvite;
