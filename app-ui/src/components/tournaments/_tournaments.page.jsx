import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';

import TournamentService from '../../services/tournament.service';
import { useAuth } from '../../utils/auth.context';
import { formatDate } from '../../utils/dates';
import { t } from '../../utils/i18n';
import { STATUS_WORDS, nameOf } from './tournament.words';
import { Lines } from '../elements/skeletons';
import { FaSitemap, FaTrophy } from 'react-icons/fa6';

const CURRENT = ['draft', 'registration', 'closed', 'drawn', 'running'];

// one tournament in the list: its name, where it stands, and the line that matters now
const TournamentRow = ({ tournament }) => {
    const status = STATUS_WORDS[tournament.status];
    const first = tournament.rounds.find(round => !round.skipped && round.date);
    const line = {
        draft: t('Not open yet'),
        registration: t('Registration until {{date}} · {{count}} in', { date: formatDate(tournament.closesAt), count: tournament.counts.in }),
        closed: t('{{count}} players · the draw is next', { count: tournament.counts.in }),
        drawn: first ? t('{{count}} players · first round {{date}}', { count: tournament.counts.in, date: formatDate(first.date) }) : t('{{count}} players', { count: tournament.counts.in }),
        running: t('{{count}} players · running', { count: tournament.counts.in }),
        finished: t('Won by {{name}} · {{date}}', { name: nameOf(tournament, tournament.winner), date: formatDate(tournament.finishedAt) }),
        cancelled: t('Cancelled'),
    }[tournament.status];
    return (
        <li>
            <Link to={`/tournaments/${tournament.id}`} className="tournament-row">
                {/* as the type of a game in the lists: a round tile, the cup for a finished one */}
                <span className={`game-type-icon ${tournament.status === 'finished' ? 'game-type-won' : 'game-type-tournament'}`} aria-hidden="true">{tournament.status === 'finished' ? <FaTrophy /> : <FaSitemap />}</span>
                <span className="tournament-row-text">
                    <span className="text-default fw-semibold text-truncate">{tournament.name}</span>
                    <span className="text-subtle fs-8 text-truncate">{line}</span>
                </span>
                <span className="tournament-row-tags">
                    {tournament.me?.status === 'in' && !['finished', 'cancelled'].includes(tournament.status) && <Tag value={t('You are in')} severity="success" />}
                    <Tag value={status.label} severity={status.severity} />
                </span>
            </Link>
        </li>
    );
};

/**
 * The tournaments of the club: the current ones and the past ones, and for
 * the admins a new one (the club needs at least 4 members for it).
 */
const TournamentsPage = () => {
    const { isClubAdmin } = useAuth();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        TournamentService.loadTournaments().then(setData).catch(err => setError(err.message));
    }, []);

    if (!data) return <div className="container-fluid p-4">{error ? <Message severity="error" text={error} /> : <Lines count={6} />}</div>;
    const current = data.tournaments.filter(tournament => CURRENT.includes(tournament.status));
    const past = data.tournaments.filter(tournament => !CURRENT.includes(tournament.status));
    const newButton = isClubAdmin && (data.canCreate
        ? <Link to="/tournaments/new" className="p-button p-button-sm text-decoration-none"><i className="pi pi-plus me-2" />{t('New tournament')}</Link>
        : <span className="p-button p-button-sm p-disabled" aria-disabled="true"><i className="pi pi-plus me-2" />{t('New tournament')}</span>);

    return (
        <div className="container-fluid p-4 d-flex flex-column gap-4">
            <Panel header={t('Tournaments')} icons={newButton}>
                <div className="d-flex flex-column gap-3">
                    <span className="text-subtle fs-7">{t('Knockout tournaments of the club: the members enter, the draw makes the bracket, and every match is a game of X01 with the rules of its round.')}</span>
                    {isClubAdmin && !data.canCreate &&
                        <Message severity="info" className="w-100 justify-content-start" text={t('A tournament needs at least {{min}} members; the club has {{count}}. Add players under Players.', { min: data.min, count: data.eligible })} />}
                    {!current.length && <span className="text-faint">{t('No tournament right now.')}</span>}
                    <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                        {current.map(tournament => <TournamentRow key={tournament.id} tournament={tournament} />)}
                    </ul>
                    {/* the past ones below, in the same panel, under a title of their own */}
                    {past.length > 0 && <>
                        <p className="game-setup-section-title m-0 mt-2">{t('Past tournaments')}</p>
                        <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                            {past.map(tournament => <TournamentRow key={tournament.id} tournament={tournament} />)}
                        </ul>
                    </>}
                </div>
            </Panel>
        </div>
    );
};

export default TournamentsPage;
