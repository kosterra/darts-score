import { LEVEL_STYLES } from '../../utils/levels';
import { t } from '../../utils/i18n';

/**
 * A player's level: its icon in the level's colour and its name.
 * level: { id, name, index }; size: 'sm' (lists) or 'md' (profile).
 */
const LevelBadge = ({ level, size = 'sm' }) => {
    if (!level) return null;
    const style = LEVEL_STYLES[level.id] ?? LEVEL_STYLES.rookie;
    const Icon = style.icon;
    return (
        <span className={`level-badge level-badge-${size}`} style={{ '--level-color': style.color }} title={t('Level {{index}}: {{name}}', { index: level.index, name: level.name })}>
            <span className="level-badge-icon" aria-hidden="true"><Icon /></span>
            <span className="level-badge-name">{level.name}</span>
        </span>
    );
};

export default LevelBadge;
