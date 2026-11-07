import { t } from '../../utils/i18n';

// the words of every level: on the label, in a sentence for the tooltip, and in lists the short name
// with a sentence that needs no figure (the lists only know the level)
const WORDS = {
    pub: {
        label: () => t('≈ Pub level'),
        sentence: (values) => t('Played at about pub level, judged by {{measure}} ({{value}}).', values),
        short: () => t('Pub'),
        estimate: () => t('Played at about pub level: an estimate from this result alone.'),
    },
    amateur: {
        label: () => t('≈ Amateur level'),
        sentence: (values) => t('Played at about amateur level, judged by {{measure}} ({{value}}).', values),
        short: () => t('Amateur'),
        estimate: () => t('Played at about amateur level: an estimate from this result alone.'),
    },
    pro: {
        label: () => t('≈ Pro level'),
        sentence: (values) => t('Played at about pro level, judged by {{measure}} ({{value}}).', values),
        short: () => t('Pro'),
        estimate: () => t('Played at about pro level: an estimate from this result alone.'),
    },
    worldClass: {
        label: () => t('≈ World-class level'),
        sentence: (values) => t('Played at about world-class level, judged by {{measure}} ({{value}}).', values),
        short: () => t('World class'),
        estimate: () => t('Played at about world-class level: an estimate from this result alone.'),
    },
};

/**
 * The level one game or training was played at, as an estimate ("≈ Pro
 * level"): a quiet label, never clicked, that is not the player's level
 * (LevelBadge). "estimate" is { level, by, value } of judgeLevel
 * (rules/levels.play.js); the tooltip says what it was judged by.
 * "compact": the short name alone ("Pro") for the lists, which know only the
 * level ({ level } is enough); the tooltip says it is an estimate.
 * "placeholder": keeps the room of a label, so the players beside line up.
 */
const PlayLevelTag = ({ estimate, compact = false, placeholder = false, className = '' }) => {
    const words = estimate && WORDS[estimate.level];
    const classes = `play-level-tag ${compact ? 'is-compact' : ''} ${className}`;
    if (!words) return placeholder ? <span className={`${classes} is-placeholder`} aria-hidden="true">{compact ? t('Amateur') : t('≈ Pro level')}</span> : null;
    const sentence = compact ? words.estimate() : words.sentence({ measure: estimate.by, value: estimate.value });
    return (
        <span className={classes} title={sentence} data-level={estimate.level}>
            <span aria-hidden="true">{compact ? words.short() : words.label()}</span>
            <span className="visually-hidden">{sentence}</span>
        </span>
    );
};

export default PlayLevelTag;
