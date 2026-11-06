import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import ShameMedal from './shame.medal';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { t } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';
import { isRulesKind } from '../../utils/game.paths';
import { BADGE_TERMS, termLink } from '../terms/darts.terms';

dayjs.extend(relativeTime);

/**
 * Who holds each shame badge in the club: the one who did it last, until
 * someone else takes it over or they wash it off. heldOnly: only the badges
 * someone holds (on the dashboard; all of them on the badges page).
 */
const HallOfShame = ({ shame, heldOnly = false }) => {
    if (!shame) return <Lines count={4} />;
    const badges = heldOnly ? shame.badges.filter(badge => badge.holder) : shame.badges;
    if (!badges.length) return <p className="text-subtle fs-7 m-0">{t('Nobody holds a shame badge right now.')}</p>;

    // the badges someone holds first, then the ones nobody has right now
    const sorted = [...badges.filter(badge => badge.holder), ...badges.filter(badge => !badge.holder)];
    const gameLink = (badge) => ['x01', 'cricket', 'elimination', 'clock'].includes(badge.sourceType) || isRulesKind(badge.sourceType);

    return (
        <ul className="hall-of-shame list-unstyled m-0">
            {sorted.map(badge => (
                <li key={badge.id} className={`hall-of-shame-row ${badge.holder ? 'is-held' : ''}`}>
                    <ShameMedal badge={badge} size="sm" washed={!badge.holder} />
                    <div className="d-flex flex-column flex-grow-1 min-w-0">
                        <span className="d-flex align-items-center gap-2 min-w-0">
                            <span className="hall-of-shame-title" title={badge.description}>{badge.title}</span>
                            {BADGE_TERMS[badge.id] &&
                                <Link to={termLink(BADGE_TERMS[badge.id])} className="shame-term-link" title={t('What does {{term}} mean?', { term: badge.title })} aria-label={t('What does {{term}} mean?', { term: badge.title })}>
                                    <i className="pi pi-question-circle" aria-hidden="true" />
                                </Link>}
                        </span>
                        <span className="text-faint fs-9">{t('Wash it off:')}{' '}{badge.wash.charAt(0).toLowerCase() + badge.wash.slice(1)}</span>
                    </div>
                    {/* who holds it, and since when (leading to the game it happened in) */}
                    {badge.holder
                        ? <span className="hall-of-shame-holder">
                            <Link to={`/players/${badge.holder.id}#badges`} className="d-inline-flex align-items-center gap-2 text-default fs-8 fw-semibold min-w-0">
                                <Avatar
                                    label={resolvePlayerInitials(badge.holder.firstname, badge.holder.lastname)}
                                    image={resolvePlayerImg(badge.holder.profileImg)}
                                    shape="circle"
                                    className="avatar-xs bg-surface-high flex-shrink-0"
                                />
                                <span className="text-truncate">{badge.holder.nickname}</span>
                            </Link>
                            {gameLink(badge)
                                ? <Link to={`/stats/games/${badge.sourceType}/${badge.sourceId}`} className="text-faint fs-9 text-nowrap">{dayjs(badge.since).fromNow()}</Link>
                                : <span className="text-faint fs-9 text-nowrap">{dayjs(badge.since).fromNow()}</span>}
                        </span>
                        : <span className="hall-of-shame-free">{t('Nobody')}</span>}
                </li>
            ))}
        </ul>
    );
};

export default HallOfShame;
