import ClubLogo from '../elements/club.logo';
import CountryFlag from '../elements/country.flag';
import { RulesScoreboard } from '../rules/rules.scoreboard';
import { CRICKET_NUMBERS } from '../../utils/cricket.game.summary';
import { variantOf } from '../../utils/cricket.variants';
import { liveMarks } from '../games/cricket/cricket.live';
import { liveScores } from '../games/elimination/elimination.live';
import { replayClock } from '../../utils/clock.game';
import { targetLabel } from '../../utils/atc.darts';
import { gameOf } from '../../rules/games';
import { replayGame } from '../../rules/engine';
import { PLAYER_COLORS } from '../stats/charts/chart.theme';
import { t } from '../../utils/i18n';

/**
 * The big screen of the other games and of a darts evening between games:
 * Cricket as the marks on every number, Elimination as the race to the
 * target, Around the Clock with everybody's next number, the newer games
 * with their scoreboard, and the table of an evening.
 */

const initials = (name = '') => name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();

// the top of every big screen: the club (or the evening) and what is played
export const BigScreenTop = ({ club, title, detail }) => (
    <header className="big-screen-top">
        <span className="big-screen-club">
            {club && <ClubLogo club={club} size="sm" />}
            <span>{club?.name ?? title ?? 'Legmate'}</span>
        </span>
        {detail && <span className="big-screen-format">{detail}</span>}
    </header>
);

const Winner = ({ name }) => (
    <div className="big-screen-winner" role="status">
        <span className="big-screen-winner-label">{t('Game shot, and the match!')}</span>
        <span className="big-screen-winner-name">{name}</span>
    </div>
);

const PlayerHead = ({ player, index }) => (
    <div className="big-player-head" style={{ '--player-colour': PLAYER_COLORS[index] }}>
        <span className="big-player-avatar" aria-hidden="true">{initials(player.nickname)}</span>
        <span className="big-player-name">{player.nickname}</span>
        {player.country && <CountryFlag code={player.country} className="big-player-flag" />}
    </div>
);

const orderedPlayers = (game, players) => {
    const byId = new Map(players.map(player => [player.id, player]));
    return (game.players ?? []).map(id => byId.get(id) ?? { id, nickname: '?' });
};
const winnerOf = (game, ordered) => (game.hasWinner ? ordered.find(player => game.playerModels?.[player.id]?.hasWonGame) : null);

// a mark of Cricket: one, two, or closed
const MARKS = ['', '/', '✕', '⊗'];

export const BigScreenCricket = ({ game, players, club, title }) => {
    const ordered = orderedPlayers(game, players);
    const marks = liveMarks(game, []);
    const variant = variantOf(game);
    const winner = winnerOf(game, ordered);
    return (
        <div className="big-screen big-screen-cricket">
            <BigScreenTop club={club} title={title} detail={`${t('Cricket')} · ${t(variant)}`} />
            {winner && <Winner name={winner.nickname} />}
            <div className="big-cricket" style={{ '--players': ordered.length }}>
                <span />
                {ordered.map((player, index) => (
                    <div key={player.id} className={`big-cricket-player ${!game.hasWinner && game.currentPlayerTurn === player.id ? 'is-turn' : ''}`} style={{ '--player-colour': PLAYER_COLORS[index] }}>
                        <PlayerHead player={player} index={index} />
                        {variant !== 'No-score' && <span className="big-cricket-score">{game.playerModels?.[player.id]?.score ?? 0}</span>}
                    </div>
                ))}
                {CRICKET_NUMBERS.map(number => (
                    <div key={number} className="big-cricket-row">
                        <span className="big-cricket-number">{number === 25 ? t('Bull') : number}</span>
                        {ordered.map(player => {
                            const count = Math.min(3, marks[player.id]?.[number] ?? 0);
                            return <span key={player.id} className={`big-cricket-mark ${count >= 3 ? 'is-closed' : ''}`} aria-label={t('{{count}} marks', { count })}>{MARKS[count]}</span>;
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const BigScreenElimination = ({ game, players, club, title }) => {
    const ordered = orderedPlayers(game, players);
    const scores = liveScores(game, 0);
    const winner = winnerOf(game, ordered);
    const ranked = [...ordered].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
    return (
        <div className="big-screen big-screen-race">
            <BigScreenTop club={club} title={title} detail={`${t('Elimination')} · ${t('to {{target}}', { target: game.targetScore })}`} />
            {winner && <Winner name={winner.nickname} />}
            <ol className="big-race list-unstyled m-0">
                {ranked.map(player => {
                    const index = ordered.indexOf(player);
                    const score = scores[player.id] ?? 0;
                    return (
                        <li key={player.id} className={`big-race-row ${!game.hasWinner && game.currentPlayerTurn === player.id ? 'is-turn' : ''}`} style={{ '--player-colour': PLAYER_COLORS[index], '--share': `${Math.min(100, (score / game.targetScore) * 100)}%` }}>
                            <PlayerHead player={player} index={index} />
                            <span className="big-race-bar" aria-hidden="true"><span /></span>
                            <span className="big-race-score">{score}</span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};

export const BigScreenClock = ({ game, players, club, title }) => {
    const ordered = orderedPlayers(game, players);
    const state = replayClock(game);
    const current = state.done ? null : state.order[state.current];
    const winner = state.done ? ordered.find(player => player.id === state.finished[0]) : null;
    return (
        <div className={`big-screen big-screen-x01 is-${ordered.length}-players`}>
            <BigScreenTop club={club} title={title} detail={t('Around the Clock')} />
            {winner && <Winner name={winner.nickname} />}
            <div className="big-screen-players">
                {ordered.map((player, index) => {
                    const own = state.players[player.id];
                    return (
                        <section key={player.id} className={`big-player ${player.id === current ? 'is-turn' : ''}`} style={{ '--player-colour': PLAYER_COLORS[index] }}>
                            <PlayerHead player={player} index={index} />
                            <span className="big-player-score">{own.finished ? '✓' : targetLabel(own.target, state.mode)}</span>
                            <dl className="big-player-figures">
                                <div><dt>{t('Darts')}</dt><dd>{own.darts}</dd></div>
                                <div><dt>{t('Hits')}</dt><dd>{own.hits}</dd></div>
                            </dl>
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

export const BigScreenRules = ({ game, players, club, title }) => {
    const definition = gameOf(game.kind);
    if (!definition) return null;
    const replay = replayGame(definition, game);
    const ordered = orderedPlayers(game, players);
    return (
        <div className="big-screen big-screen-rules">
            <BigScreenTop club={club} title={title} detail={definition.title ?? game.kind} />
            <div className="big-rules">
                <RulesScoreboard definition={definition} replay={replay} players={ordered} />
            </div>
        </div>
    );
};

// a darts evening between its games: the table of the evening
export const BigScreenEveningTable = ({ evening }) => (
    <div className="big-screen big-screen-evening">
        <BigScreenTop title={evening.name || t('Darts evening')} detail={t('{{count}} games played', { count: evening.report?.played ?? 0 })} />
        <table className="big-evening-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>{t('Player')}</th>
                    <th>{t('Games')}</th>
                    <th>{t('Wins')}</th>
                    <th>{t('Average')}</th>
                </tr>
            </thead>
            <tbody>
                {(evening.report?.table ?? []).map((row, index) => (
                    <tr key={row.id} className={index === 0 && row.games > 0 ? 'is-leader' : undefined}>
                        <td>{index + 1}</td>
                        <td>{row.name}</td>
                        <td>{row.games}</td>
                        <td>{row.wins}</td>
                        <td>{row.average != null ? row.average.toFixed(1) : '–'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <p className="big-screen-hint">{t('The next game appears here as soon as it starts.')}</p>
    </div>
);
