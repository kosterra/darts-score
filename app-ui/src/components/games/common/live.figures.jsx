import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { t } from '../../../utils/i18n';

/**
 * The key figures of every player in a running game, side by side as on the
 * statistics page, the best value marked. rows: [{ label, value(playerId),
 * neutral (no best), lower (less is better) }].
 */
const LiveFigures = ({ players, rows }) => {
    const compare = players.length > 1;

    return (
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
                {rows.map(row => {
                    const values = players.map(player => row.value(player.id));
                    const numbers = values.map(Number).filter(value => Number.isFinite(value) && value > 0);
                    const differ = numbers.length > 1 && !numbers.every(value => value === numbers[0]);
                    const best = compare && !row.neutral && differ ? (row.lower ? Math.min(...numbers) : Math.max(...numbers)) : null;
                    return (
                        <tr key={row.label}>
                            <th scope="row">{row.label}</th>
                            {values.map((value, index) => (
                                <td key={players[index].id} className={best != null && Number(value) === best ? 'is-best' : ''}>{value ?? '–'}</td>
                            ))}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export default LiveFigures;
