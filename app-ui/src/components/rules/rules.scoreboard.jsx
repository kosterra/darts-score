import { TACTICS_TARGETS, scramNumbers } from '../../rules/games';
import { t } from '../../utils/i18n';

// the marks of a number in Tactics as on a cricket board: /, X, ⊗
const MARKS = ['', '/', '✕', '⊗'];

/**
 * The standings of a game while it is played: one row per player with the
 * game's own columns, the player at the oche marked and those out struck through.
 */
export const RulesScoreboard = ({ definition, replay, players }) => {
    const ctx = { settings: replay.settings, round: replay.round };
    const placeOf = Object.fromEntries(replay.standings.map(row => [row.id, row.place]));
    return (
        <table className="rules-scoreboard">
            <thead>
                <tr>
                    <th>{t('Player')}</th>
                    {definition.columns.map(column => <th key={column.key}>{column.label}</th>)}
                    <th>{t('Place')}</th>
                </tr>
            </thead>
            <tbody>
                {players.map(player => {
                    const playerState = replay.state.players[player.id];
                    const out = definition.active && !definition.active(replay.state, player.id);
                    return (
                        <tr key={player.id} className={`${player.id === replay.current ? 'is-current' : ''} ${out ? 'is-out' : ''}`}>
                            <td title={player.nickname}>{player.nickname}</td>
                            {definition.columns.map(column => <td key={column.key}>{column.value(playerState, replay.state, ctx)}</td>)}
                            <td>{placeOf[player.id]}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

/**
 * The numbers of Tactics with every player's marks, the closed ones as ⊗.
 */
export const TacticsMarks = ({ replay, players }) => (
    <table className="rules-scoreboard mt-3">
        <thead>
            <tr>
                <th>{t('Number')}</th>
                {players.map(player => <th key={player.id} title={player.nickname}>{player.nickname.slice(0, 8)}</th>)}
            </tr>
        </thead>
        <tbody>
            {TACTICS_TARGETS.map(number => (
                <tr key={number}>
                    <td>{number === 25 ? t('Bull') : number}</td>
                    {players.map(player => <td key={player.id}>{MARKS[Math.min(3, replay.state.players[player.id].marks[number])]}</td>)}
                </tr>
            ))}
        </tbody>
    </table>
);

/**
 * The numbers of Scram as on a cricket board: the closed ones crossed out with
 * chalk, those the stopper's darts being entered close in gold, the chalk drawn.
 */
export const ScramNumbers = ({ replay, players, darts }) => {
    const { state, settings } = replay;
    const numbers = scramNumbers(settings);
    const stopper = state.order[state.innings - 1];
    const closing = replay.current === stopper ? darts.map(dart => dart.number) : [];
    const nameOf = (id) => players.find(player => player.id === id)?.nickname ?? '';
    return (
        <div className="scram-numbers mb-3">
            <p className="text-faint fs-8 mb-2">
                {t('Innings {{innings}}: {{stopper}} closes, {{scorer}} scores on the open numbers', { innings: state.innings, stopper: nameOf(stopper), scorer: nameOf(state.order.find(id => id !== stopper)) })}
            </p>
            <ul className="scram-numbers-list list-unstyled m-0">
                {numbers.map(number => {
                    const closed = state.closed.includes(number);
                    const now = !closed && closing.includes(number);
                    return (
                        <li key={number} className={`scram-number ${closed ? 'is-closed' : ''} ${now ? 'is-new' : ''}`} title={closed || now ? t('Closed') : t('Still open')}>
                            <span className="cricket-strip-number">
                                {number === 25 ? t('Bull') : number}
                                {(closed || now) && <span key={now ? 'drawn' : 'there'} className={`cricket-chalk ${now ? 'is-drawn' : ''}`} aria-hidden="true" />}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
