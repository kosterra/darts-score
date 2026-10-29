import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { FaListOl, FaTrophy } from 'react-icons/fa6';

import LeagueService from '../../services/league.service';
import { useAuth } from '../../utils/auth.context';
import { formatDate } from '../../utils/dates';
import { t, tn } from '../../utils/i18n';
import { isDecided } from '../../rules/tournaments';
import { LEAGUE_STATUS_WORDS, leagueName } from './league.words';
import { Lines } from '../elements/skeletons';

// one league in the list: its name, where it stands, and the line that matters now
const LeagueRow = ({ league }) => {
    const status = LEAGUE_STATUS_WORDS[league.status];
    const played = league.matches.filter(isDecided).length;
    const line = {
        draft: tn(league.players.length, 'Not started · {{count}} player', 'Not started · {{count}} players'),
        running: t('{{played}} of {{count}} matches played', { played, count: league.matches.length }),
        finished: t('Won by {{name}} · {{date}}', { name: leagueName(league, league.winner), date: formatDate(league.finishedAt) }),
        cancelled: t('Cancelled'),
    }[league.status];
    return (
        <li>
            <Link to={`/leagues/${league.id}`} className="tournament-row">
                <span className={`game-type-icon ${league.status === 'finished' ? 'game-type-won' : 'game-type-league'}`} aria-hidden="true">{league.status === 'finished' ? <FaTrophy /> : <FaListOl />}</span>
                <span className="tournament-row-text">
                    <span className="text-default fw-semibold text-truncate">{league.name}</span>
                    <span className="text-subtle fs-8 text-truncate">{line}</span>
                </span>
                <span className="tournament-row-tags">
                    {league.myPlayer && league.players.includes(league.myPlayer) && league.status === 'running' && <Tag value={t('You play')} severity="success" />}
                    <Tag value={status.label} severity={status.severity} />
                </span>
            </Link>
        </li>
    );
};

/**
 * The leagues of the club: everyone against everyone in matchdays, the
 * table from the matches. Its admins set up new ones.
 */
const LeaguesPage = () => {
    const { isClubAdmin } = useAuth();
    const [leagues, setLeagues] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => { LeagueService.loadLeagues().then(data => setLeagues(data.leagues)).catch(err => setError(err.message)); }, []);

    return (
        <div className="container-fluid p-4">
            <Panel header={t('Leagues')} icons={isClubAdmin && <Link to="/leagues/new" className="p-button p-button-sm text-decoration-none"><i className="pi pi-plus me-2" aria-hidden="true" />{t('New league')}</Link>}>
                <p className="text-subtle fs-7 mt-0">{t('A season where everyone plays everyone, once or twice, in matchdays with dates. Each match is played any time up to its day; the table counts 2 points a win.')}</p>
                {error && <Message severity="error" text={error} />}
                {!leagues && !error && <Lines count={4} />}
                {leagues && leagues.length === 0 && <p className="text-faint fs-7 m-0">{isClubAdmin ? t('No league yet: set up the first one.') : t('No league yet.')}</p>}
                {leagues && leagues.length > 0 && <ul className="list-unstyled m-0 d-flex flex-column gap-2">{leagues.map(league => <LeagueRow key={league.id} league={league} />)}</ul>}
            </Panel>
        </div>
    );
};

export default LeaguesPage;
