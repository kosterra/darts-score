import { PLAYER_COLORS } from '../../stats/charts/chart.theme';
import { t } from '../../../utils/i18n';

const TON_PLUS = ['180', '160-179', '140-159', '120-139', '100-119'];

const nested = (obj, path) => path.reduce((acc, key) => acc?.[key], obj);
const oneDecimal = (value) => value ? value.toFixed(1) : null;

/**
 * The key figures of every player in the running game, side by side as on the
 * statistics page, the best value marked.
 */
const X01LiveFigures = ({ game, players }) => {
    const set = `set-${game.currentSet}`;
    const leg = `leg-${game.currentSetLeg}`;
    const ranges = (model, names) => names.reduce((sum, name) => sum + (Number(model?.scoreRanges?.game?.[name]) || 0), 0);
    const rows = [
        { label: t('Average'), value: (m) => oneDecimal(nested(m, ['averages', 'game', 'overall'])) },
        ...(game.numberOfSets > 1 ? [{ label: t('This set'), value: (m) => oneDecimal(nested(m, ['averages', set, 'overall'])) }] : []),
        { label: t('This leg'), value: (m) => oneDecimal(nested(m, ['averages', set, leg, 'overall'])) },
        { label: t('Best visit'), value: (m) => nested(m, ['bestThreeDarts', 'game', 'value']) || null },
        { label: '100+', value: (m) => ranges(m, TON_PLUS) },
        { label: t('180s'), value: (m) => ranges(m, ['180']) },
        { label: t('Highest checkout'), value: (m) => Math.max(0, ...Object.keys(m?.checkoutScores?.game ?? {}).map(Number).filter(Number.isFinite)) || null },
        { label: t('Darts thrown'), value: (m) => nested(m, ['totalThrow', 'game', 'darts']) ?? 0, neutral: true },
    ];
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
                    const values = players.map(player => row.value(game.playerModels[player.id]));
                    const numbers = values.map(Number).filter(value => value > 0);
                    const best = compare && !row.neutral && numbers.length > 1 && !numbers.every(value => value === numbers[0]) ? Math.max(...numbers) : null;
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

export default X01LiveFigures;
