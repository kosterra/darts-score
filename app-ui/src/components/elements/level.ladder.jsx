import { AVERAGE_LEVELS } from '../../utils/average.levels';
import { t } from '../../utils/i18n';

/**
 * What a level of play takes in one game or training: the level reached and what it was judged
 * by, what the next one needs, then every step with where it starts, the one reached marked.
 * levelDefinition: a level definition of rules/levels.play.js; estimate: judgeLevel's
 * { level, by, value }; args: what its "of" and "bands" take (result, settings).
 */
const LevelLadder = ({ levelDefinition, estimate, args = [] }) => {
    if (!levelDefinition || !estimate) return null;
    const bands = typeof levelDefinition.bands === 'function' ? levelDefinition.bands(...args) : levelDefinition.bands;
    if (!Array.isArray(bands) || bands.length !== AVERAGE_LEVELS.length - 1) return null;
    const shown = (value) => (levelDefinition.format ? levelDefinition.format(value) : String(value));
    const lower = Boolean(levelDefinition.lowerIsBetter);
    const reached = AVERAGE_LEVELS.findIndex(level => level.key === estimate.level);
    const next = AVERAGE_LEVELS[reached + 1];
    const from = (index) => (lower ? t('at most {{value}}', { value: shown(bands[index - 1]) }) : t('from {{value}}', { value: shown(bands[index - 1]) }));
    return (
        <div className="level-ladder">
            <p className="level-ladder-line">
                {t('Judged by {{measure}}: {{value}}.', { measure: estimate.by, value: estimate.value })}
                {next && <> {t('{{level}} {{from}}.', { level: next.name, from: from(reached + 1) })}</>}
            </p>
            <ol className="level-ladder-steps list-unstyled" aria-label={t('Levels')}>
                {AVERAGE_LEVELS.map((level, index) => {
                    const Icon = level.icon;
                    return (
                        <li key={level.key} className={`level-ladder-step ${index === reached ? 'is-reached' : ''}`} style={{ '--level-color': level.color }} aria-current={index === reached ? 'true' : undefined}>
                            <Icon aria-hidden="true" />
                            <span className="level-ladder-name">{level.name}</span>
                            {index > 0 && <span className="level-ladder-from tabular-nums">{from(index)}</span>}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};

export default LevelLadder;
