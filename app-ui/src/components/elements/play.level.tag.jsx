import { t } from '../../utils/i18n';
import { averageLevelByKey } from '../../utils/average.levels';

// the widest name, for the room a placeholder keeps
const WIDEST = 'worldClass';

/**
 * The level one game or training was played at, as an estimate ("≈ Pro"):
 * a quiet label, never clicked, that is not the player's level (LevelBadge).
 * It is a step of the average levels, shown as the statistics show them: the
 * level's icon and name in its colour. "estimate" is { level, by, value } of
 * judgeLevel (rules/levels.play.js); the tooltip says what it was judged by.
 * "compact": the icon and name alone ("Pro") for the lists, which know only
 * the level ({ level } is enough); the tooltip says it is an estimate.
 * "placeholder": keeps the room of a label, so the players beside line up.
 */
const PlayLevelTag = ({ estimate, compact = false, placeholder = false, className = '' }) => {
    const level = estimate ? averageLevelByKey(estimate.level) : null;
    const classes = `play-level-tag ${compact ? 'is-compact' : ''} ${className}`;
    const shown = level ?? (placeholder ? averageLevelByKey(WIDEST) : null);
    if (!shown) return null;
    const Icon = shown.icon;
    const words = (
        <>
            <Icon className="play-level-tag-icon" aria-hidden="true" />
            <span>{compact ? shown.name : `≈ ${shown.name}`}</span>
        </>
    );
    if (!level) return <span className={`${classes} is-placeholder`} aria-hidden="true"><span className="play-level-tag-words">{words}</span></span>;
    const sentence = compact
        ? t('Played at about {{level}} level: an estimate from this result alone.', { level: level.name })
        : t('Played at about {{level}} level, judged by {{measure}} ({{value}}).', { level: level.name, measure: estimate.by, value: estimate.value });
    return (
        <span className={classes} title={sentence} data-level={estimate.level} style={{ '--level-color': level.color }}>
            <span className="play-level-tag-words" aria-hidden="true">{words}</span>
            <span className="visually-hidden">{sentence}</span>
        </span>
    );
};

export default PlayLevelTag;
