import { TACTICS_TARGETS } from '../../rules/games';
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
