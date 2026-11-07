import { t } from '../../utils/i18n';

// the words of every level, short on the label and in a sentence for the tooltip
const WORDS = {
    pub: { label: () => t('≈ Pub level'), sentence: (values) => t('Played at about pub level, judged by {{measure}} ({{value}}).', values) },
    amateur: { label: () => t('≈ Amateur level'), sentence: (values) => t('Played at about amateur level, judged by {{measure}} ({{value}}).', values) },
    pro: { label: () => t('≈ Pro level'), sentence: (values) => t('Played at about pro level, judged by {{measure}} ({{value}}).', values) },
    worldClass: { label: () => t('≈ World-class level'), sentence: (values) => t('Played at about world-class level, judged by {{measure}} ({{value}}).', values) },
};

/**
 * The level one game or training was played at, as an estimate ("≈ Pro
 * level"): a quiet label, never clicked, that is not the player's level
 * (LevelBadge). "estimate" is { level, by, value } of judgeLevel
 * (rules/levels.play.js); the tooltip says what it was judged by.
 * "placeholder": keeps the room of a label, so the players beside line up.
 */
const PlayLevelTag = ({ estimate, placeholder = false, className = '' }) => {
    const words = estimate && WORDS[estimate.level];
    if (!words) return placeholder ? <span className={`play-level-tag is-placeholder ${className}`} aria-hidden="true">{t('≈ Pro level')}</span> : null;
    const sentence = words.sentence({ measure: estimate.by, value: estimate.value });
    return (
        <span className={`play-level-tag ${className}`} title={sentence} data-level={estimate.level}>
            <span aria-hidden="true">{words.label()}</span>
            <span className="visually-hidden">{sentence}</span>
        </span>
    );
};

export default PlayLevelTag;
