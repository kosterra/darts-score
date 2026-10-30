import { useState } from 'react';
import { Button } from 'primereact/button';

import { groupTable } from '../../rules/tournaments';
import { t } from '../../utils/i18n';
import { MatchCard } from './tournament.bracket';
import { groupName, nameOf } from './tournament.words';

/**
 * The group stage of a tournament: each group with its table (the places
 * that go on to the knockout stage marked) and its matches, to tap as in the
 * bracket. A tap on a player in the table keeps their matches and greys the
 * others; a tap again shows all. onSelect(match): a tap on a match.
 */
const TournamentGroups = ({ tournament, onSelect }) => {
    const [picked, setPicked] = useState(null);
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
                        <div className="tournament-group-head">
                            <h3 className="tournament-group-name">{groupName(group)}</h3>
                            {/* a player picked in the table: only their matches show; the way back to all of them */}
                            {picked && players.includes(picked)
                                ? <Button type="button" label={t('Show all matches')} icon="pi pi-times" size="small" text onClick={() => setPicked(null)} />
                                : <span className="text-faint fs-8">{t('Tap a player for their matches')}</span>}
                        </div>
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
                                        <tr
                                            key={row.player}
                                            className={`${index < advance ? 'goes-on' : ''} ${row.player === tournament.myPlayer ? 'is-mine' : ''} ${picked === row.player ? 'is-picked' : ''} tournament-group-row`}
                                            onClick={() => setPicked(picked === row.player ? null : row.player)}
                                            aria-pressed={picked === row.player}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPicked(picked === row.player ? null : row.player); } }}
                                            title={picked === row.player ? t('Show all matches') : t('Show the matches of {{name}}', { name: nameOf(tournament, row.player) })}
                                        >
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
                            {own.map(match => (
                                <div key={match.id} className={picked && !match.players.includes(picked) ? 'tournament-match-dimmed' : ''}>
                                    <MatchCard tournament={tournament} match={match} onSelect={onSelect} />
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

export default TournamentGroups;
