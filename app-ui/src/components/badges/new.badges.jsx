import BadgeMedal from './badge.medal';
import { t } from '../../utils/i18n';

/**
 * The badges just earned, right on the page after a training: per player
 * their medals with a short "New" mark. groups: [{ player, badges }];
 * heading false on a panel that says it already
 */
const NewBadges = ({ groups = [], className = '', heading = true }) => {
    const shown = groups.filter(group => group.badges?.length);
    if (!shown.length) return null;
    return (
        <div className={`d-flex flex-column gap-2 ${className}`}>
            {heading && <span className="text-subtle fs-8 fw-semibold text-uppercase" style={{ letterSpacing: '0.05em' }}>{t('New badges')}</span>}
            {shown.map(group => (
                <div key={group.player?.id ?? 'player'} className="d-flex flex-wrap align-items-center gap-3">
                    {shown.length > 1 && <span className="text-default fw-semibold fs-7">{group.player?.nickname}</span>}
                    <ul className="list-unstyled m-0 d-flex flex-wrap gap-3">
                        {group.badges.map((badge, index) => (
                            <li key={badge.id} className="d-flex align-items-center gap-2 game-badge-new" style={{ '--delay': `${600 + 150 * index}ms` }}>
                                <BadgeMedal badge={badge} size="sm" animate delay={600 + 150 * index} />
                                <span className="text-subtle fs-7">{badge.title}</span>
                                <span className="game-badge-new-tag">{t('New')}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default NewBadges;
