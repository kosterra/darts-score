import { groupTable } from '../../rules/tournaments';
import { t } from '../../utils/i18n';
import { MatchCard } from './tournament.bracket';
import { groupName, nameOf } from './tournament.words';

/**
 * The group stage of a tournament: each group with its table (the places
 * that go on to the knockout stage marked) and its matches, to tap as in the
 * bracket. onSelect(match): a tap on a match.
 */
const TournamentGroups = ({ tournament, onSelect }) => {
    const groups = tournament.draw?.groups ?? [];
    const advance = tournament.draw?.advance ?? 2;
    const matches = (tournament.matches ?? []).filter(match => match.group != null);
    return (
        <div className="tournament-groups">
            {groups.map((players, group) => {
                const own = matches.filter(match => match.group === group).sort((a, b) => a.index - b.index);
                const table = groupTable(players, own);
                return (
                    <section key={group} className="tournament-group">
                        <h3 className="tournament-group-name">{groupName(group)}</h3>
                        <table className="tournament-group-table">
                            <thead>
                                <tr>
                                    <th aria-label={t('Place')} />
                                    <th className="text-start">{t('Player')}</th>
                                    <th title={t('Played')}>{t('P')}</th>
                                    <th title={t('Won')}>{t('W')}</th>
                                    <th title={t('Lost')}>{t('L')}</th>
                                    <th title={t('Leg difference')}>{t('+/−')}</th>
                                    <th title={t('Points')}>{t('Pts')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {table.map((row, index) => {
                                    const difference = row.legsFor - row.legsAgainst;
                                    return (
                                        <tr key={row.player} className={`${index < advance ? 'goes-on' : ''} ${row.player === tournament.myPlayer ? 'is-mine' : ''}`}>
                                            <td className="tournament-group-place">{index + 1}</td>
                                            <td className="text-start text-truncate tournament-group-player">{nameOf(tournament, row.player)}</td>
                                            <td>{row.played}</td>
                                            <td>{row.won}</td>
                                            <td>{row.lost}</td>
                                            <td>{difference > 0 ? `+${difference}` : difference}</td>
                                            <td className="fw-bold">{row.points}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="tournament-group-matches">
                            {own.map(match => <MatchCard key={match.id} tournament={tournament} match={match} onSelect={onSelect} />)}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

export default TournamentGroups;
