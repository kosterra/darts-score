import { FaTrophy } from 'react-icons/fa6';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';

import TournamentService from '../../services/tournament.service';
import { currentRound } from '../../rules/tournaments';
import { formatDateTime } from '../../utils/dates';
import { t } from '../../utils/i18n';
import { nameOf, roundName } from './tournament.words';

// what the banner says about a tournament, by how far it is
const linesOf = (tournament) => {
    const mine = tournament.myPlayer && tournament.matches?.find(match => match.players.includes(tournament.myPlayer) && ['ready', 'running'].includes(match.status));
    const opponent = mine && mine.players.find(id => id && id !== tournament.myPlayer);
    switch (tournament.status) {
        case 'registration':
            return {
                title: t('{{name}}: registration open', { name: tournament.name }),
                detail: t('Until {{date}} · {{count}} in', { date: formatDateTime(tournament.closesAt), count: tournament.counts.in }),
            };
        case 'closed':
            return {
                title: t('{{name}}: registration closed', { name: tournament.name }),
                detail: t('{{count}} players · the draw is next', { count: tournament.counts.in }),
            };
        case 'drawn':
        case 'running': {
            const round = currentRound(tournament.matches);
            return {
                title: tournament.status === 'drawn' ? t('{{name}}: the draw is done', { name: tournament.name }) : t('{{name}}: {{round}}', { name: tournament.name, round: round ? roundName(round) : '' }),
                detail: mine ? t('Your match: against {{name}}', { name: nameOf(tournament, opponent) }) : t('{{count}} players', { count: tournament.counts.in }),
            };
        }
        case 'finished':
            return { title: t('{{name}} wins {{tournament}}', { name: nameOf(tournament, tournament.winner), tournament: tournament.name }), detail: t('Congratulations!') };
        default:
            return null;
    }
};

/**
 * On top of the club's dashboard: the tournaments going on, from the
 * registration (enter or decline right here) to a week after the final,
 * each with the way to its page or bracket.
 */
const TournamentBanner = () => {
    const [tournaments, setTournaments] = useState([]);
    const [busy, setBusy] = useState('');

    useEffect(() => {
        TournamentService.loadTournaments({ active: true }).then(data => setTournaments(data.tournaments)).catch(() => setTournaments([]));
    }, []);

    if (!tournaments.length) return null;
    const answer = async (tournament, status) => {
        setBusy(`${tournament.id}-${status}`);
        try {
            const updated = await TournamentService.answer(tournament.id, status);
            setTournaments(list => list.map(entry => (entry.id === updated.id ? updated : entry)));
        } catch {
            // the page of the tournament says why
        }
        setBusy('');
    };

    return (
        <div className="d-flex flex-column gap-3 mb-4">
            {tournaments.map(tournament => {
                const lines = linesOf(tournament);
                if (!lines) return null;
                const asked = tournament.status === 'registration' && tournament.me;
                const drawn = ['drawn', 'running', 'finished'].includes(tournament.status);
                return (
                    <section key={tournament.id} className={`tournament-banner is-${tournament.status}`} aria-label={tournament.name}>
                        {tournament.status === 'finished'
                            ? <span className="tournament-banner-icon" aria-hidden="true"><FaTrophy /></span>
                            : <i className="pi pi-sitemap tournament-banner-icon" aria-hidden="true" />}
                        <div className="d-flex flex-column min-w-0 flex-grow-1">
                            <span className="tournament-banner-title">{lines.title}</span>
                            <span className="text-subtle fs-7">{lines.detail}</span>
                        </div>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            {asked && tournament.me.status !== 'in' && <Button label={t('I\'m in')} icon="pi pi-check" size="small" loading={busy === `${tournament.id}-in`} onClick={() => answer(tournament, 'in')} />}
                            {asked && tournament.me.status === 'invited' && <Button label={t('Not this time')} size="small" severity="secondary" outlined loading={busy === `${tournament.id}-out`} onClick={() => answer(tournament, 'out')} />}
                            {asked && tournament.me.status === 'in' && <span className="text-subtle fs-7"><i className="pi pi-check me-1" />{t('You are in')}</span>}
                            <Link to={`/tournaments/${tournament.id}`} className="p-button p-button-sm p-button-text text-decoration-none">{drawn ? t('Bracket') : t('Details')}</Link>
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

export default TournamentBanner;
