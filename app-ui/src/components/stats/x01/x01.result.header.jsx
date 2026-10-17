import dayjs from 'dayjs';
import { Avatar } from 'primereact/avatar';
import { FaTrophy } from 'react-icons/fa6';

import { PLAYER_COLORS } from '../charts/chart.theme';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// the key figures, in the order shown; lowerIsBetter marks the one where less wins
const FIGURES = [
    { key: 'average', label: '3-dart average' },
    { key: 'firstNine', label: 'First 9 average' },
    { key: 'checkoutRate', label: 'Checkout', format: (value) => `${value} %`, detail: (figures) => figures.checkoutDetail },
    { key: 'highestCheckout', label: 'Highest checkout' },
    { key: 'bestLeg', label: 'Best leg', format: (value) => `${value} darts`, lowerIsBetter: true },
    { key: 'highestVisit', label: 'Highest visit' },
    { key: 'oneEighties', label: '180s' },
    { key: 'dartsThrown', label: 'Darts thrown', neutral: true },
];

const duration = (from, to) => {
    const minutes = Math.max(1, Math.round(dayjs(to).diff(dayjs(from), 'minute', true)));
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

/**
 * The top of a finished X01 game: format, when it ended and how long it took,
 * the players with the result, their key figures side by side and what to do
 * next ("actions"). figures: { [playerId]: playerFigures(...) }
 */
const X01ResultHeader = ({ game, players, figures, actions }) => {
    // sets decide when more than one could be played, otherwise legs
    const bySets = game.numberOfSets > 1;
    const score = (player) => bySets ? game.playerModels[player.id]?.setsWon ?? 0 : figures[player.id]?.legsWon ?? 0;
    const winner = players.find(player => game.playerModels[player.id]?.hasWonGame);
    const compare = players.length > 1;

    // the best value of a figure, to mark it; none when all are the same
    const bestOf = (figure) => {
        if (!compare || figure.neutral) return null;
        const values = players.map(player => figures[player.id]?.[figure.key]).filter(value => value != null);
        if (values.length < 2 || values.every(value => value === values[0])) return null;
        return figure.lowerIsBetter ? Math.min(...values) : Math.max(...values);
    };

    return (
        <header className="hero-header x01-result rounded-2 p-4 mb-4">
            <div className="x01-result-top">
                <div className="d-flex flex-column">
                    <span className="text-default fw-semibold">
                        {game.startingScore} · {game.setMode} {plural(game.numberOfSets, 'set')} · {game.legMode} {plural(game.numberOfLegs, 'leg')}
                    </span>
                    <span className="text-faint fs-8">
                        {game.legInMode} / {game.legOutMode}
                        {' · '}
                        {game.gameIsRunning
                            ? `started ${dayjs(game.createdAt).format('DD.MM.YYYY HH:mm')}`
                            : `finished ${dayjs(game.updatedAt).format('DD.MM.YYYY HH:mm')} after ${duration(game.createdAt, game.updatedAt)}`}
                    </span>
                </div>
                <div className="x01-result-actions">{actions}</div>
            </div>

            <div className={`x01-result-players count-${players.length}`}>
                {players.map((player, index) => (
                        <div key={player.id} className={`x01-result-player ${player === winner ? 'is-winner' : ''}`}>
                            <span className="position-relative">
                                <Avatar
                                    label={resolvePlayerInitials(player.firstname, player.lastname)}
                                    image={resolvePlayerImg(player.profileImg)}
                                    shape="circle"
                                    className="avatar-lg bg-surface-high x01-result-avatar"
                                    style={{ '--player-colour': PLAYER_COLORS[index] }}
                                />
                                {player === winner && <FaTrophy className="x01-result-trophy text-gold" aria-label="Winner" />}
                            </span>
                            <span className="x01-result-name fw-semibold text-default text-center text-truncate" title={player.nickname}>{player.nickname}</span>
                            <span className="x01-result-score">{score(player)}</span>
                            <span className="text-faint fs-8">
                                {bySets
                                    ? `${plural(score(player), 'set')} · ${plural(figures[player.id]?.legsWon ?? 0, 'leg')}`
                                    : plural(score(player), 'leg')}
                            </span>
                        </div>
                ))}
            </div>

            <div className="x01-result-figures-wrap">
                <table className="x01-result-figures">
                    {compare &&
                        <thead>
                            <tr>
                                <th aria-label="Figure" />
                                {players.map((player, index) => (
                                    <th key={player.id} scope="col">
                                        <span className="x01-result-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />
                                        {player.nickname}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    }
                    <tbody>
                        {FIGURES.map(figure => {
                            const best = bestOf(figure);
                            return (
                                <tr key={figure.key}>
                                    <th scope="row">{figure.label}</th>
                                    {players.map(player => {
                                        const playerFigures = figures[player.id] ?? {};
                                        const value = playerFigures[figure.key];
                                        return (
                                            <td key={player.id} className={best != null && value === best ? 'is-best' : ''}>
                                                {value == null ? '–' : figure.format ? figure.format(value, playerFigures) : value}
                                                {value != null && figure.detail?.(playerFigures) &&
                                                    <span className="text-faint fs-8 ms-1">({figure.detail(playerFigures)})</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </header>
    );
};

export default X01ResultHeader;
