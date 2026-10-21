import { Avatar } from 'primereact/avatar';
import { FaTrophy } from 'react-icons/fa6';

import { PLAYER_COLORS } from '../charts/chart.theme';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { t } from '../../../utils/i18n';

/**
 * The top of a finished game: what was played ("title", "subtitle"), the
 * players with their score and a line under it, their key figures side by
 * side ("rows" of figures, { [playerId]: { [key]: value } }) with the best
 * ones marked, and what to do next ("actions").
 * rows: [{ key, label, format?, detail?, lowerIsBetter?, neutral? }]
 */
const GameResultHeader = ({ game, players, title, subtitle, scoreOf, scoreDetailOf, rows, figures, actions }) => {
    const winner = players.find(player => game.playerModels?.[player.id]?.hasWonGame);
    const compare = players.length > 1;

    // the best value of a figure, to mark it; none when all are the same
    const bestOf = (figure) => {
        if (!compare || figure.neutral) return null;
        const values = players.map(player => figures[player.id]?.[figure.key]).filter(value => value != null);
        if (values.length < 2 || values.every(value => value === values[0])) return null;
        return figure.lowerIsBetter ? Math.min(...values) : Math.max(...values);
    };

    return (
        <header className="hero-header result-hero rounded-2 p-4 mb-4">
            <div className="result-hero-top">
                <div className="d-flex flex-column">
                    <span className="text-default fw-semibold">{title}</span>
                    <span className="text-faint fs-8">{subtitle}</span>
                </div>
                <div className="result-hero-actions">{actions}</div>
            </div>

            <div className={`result-hero-players count-${players.length}`}>
                {players.map((player, index) => (
                        <div key={player.id} className={`result-hero-player ${player === winner ? 'is-winner' : ''}`}>
                            <span className="result-hero-portrait">
                                {player === winner && <span className="result-hero-halo" aria-hidden="true" />}
                                <Avatar
                                    label={resolvePlayerInitials(player.firstname, player.lastname)}
                                    image={resolvePlayerImg(player.profileImg)}
                                    shape="circle"
                                    className="avatar-lg bg-surface-high result-hero-avatar"
                                    style={{ '--player-colour': PLAYER_COLORS[index] }}
                                />
                                {player === winner &&
                                    <span className="result-hero-trophy" aria-hidden="true"><FaTrophy /></span>
                                }
                            </span>
                            <span className="result-hero-name fw-semibold text-default text-center text-truncate" title={player.nickname}>{player.nickname}</span>
                            {/* the others keep the space, so every score stays at the same height */}
                            {winner &&
                                <span className={`result-hero-winner ${player === winner ? '' : 'is-placeholder'}`} aria-hidden={player !== winner}>{t('Winner')}</span>
                            }
                            <span className="result-hero-score">{scoreOf(player)}</span>
                            <span className="text-faint fs-8">{scoreDetailOf(player)}</span>
                        </div>
                ))}
            </div>

            <div className="result-hero-figures-wrap">
                <table className="result-hero-figures">
                    {compare &&
                        <thead>
                            <tr>
                                <th aria-label={t('Figure')} />
                                {players.map((player, index) => (
                                    <th key={player.id} scope="col">
                                        <span className="result-hero-dot" style={{ background: PLAYER_COLORS[index] }} aria-hidden="true" />
                                        {player.nickname}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    }
                    <tbody>
                        {rows.map(figure => {
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

export default GameResultHeader;
