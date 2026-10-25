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
 * someone else takes it over or they wash it off.
 */
const HallOfShame = ({ shame }) => {
    if (!shame) return <Lines count={4} />;

    return (
        <ul className="hall-of-shame list-unstyled m-0">
            {shame.badges.map(badge => (
                <li key={badge.id} className="hall-of-shame-row">
                    <ShameMedal badge={badge} size="sm" washed={!badge.holder} />
                    <div className="d-flex flex-column min-w-0">
                        <span className="d-flex align-items-center gap-2 min-w-0">
                            <span className="text-default fw-semibold" title={badge.description}>{badge.title}</span>
                            {BADGE_TERMS[badge.id] &&
                                <Link to={termLink(BADGE_TERMS[badge.id])} className="shame-term-link" title={t('What does {{term}} mean?', { term: badge.title })} aria-label={t('What does {{term}} mean?', { term: badge.title })}>
                                    <i className="pi pi-question-circle" aria-hidden="true" />
                                </Link>}
                        </span>
                        {badge.holder
                            ? (
                                <span className="d-flex align-items-center gap-2 min-w-0">
                                    <Avatar
                                        label={resolvePlayerInitials(badge.holder.firstname, badge.holder.lastname)}
                                        image={resolvePlayerImg(badge.holder.profileImg)}
                                        shape="circle"
                                        className="avatar-xs bg-surface-high flex-shrink-0"
                                    />
                                    <Link to={`/players/${badge.holder.id}#badges`} className="text-default fs-8 fw-semibold text-truncate">{badge.holder.nickname}</Link>
                                    {(['x01', 'cricket', 'elimination', 'clock'].includes(badge.sourceType) || isRulesKind(badge.sourceType))
                                        ? <Link to={`/stats/games/${badge.sourceType}/${badge.sourceId}`} className="text-faint fs-9 text-nowrap">{dayjs(badge.since).fromNow()}</Link>
                                        : <span className="text-faint fs-9 text-nowrap">{dayjs(badge.since).fromNow()}</span>}
                                </span>
                            )
                            : <span className="text-faint fs-8">{t('Nobody holds it right now')}</span>}
                        <span className="text-faint fs-9">{t('Wash it off:')}{' '}{badge.wash.charAt(0).toLowerCase() + badge.wash.slice(1)}</span>
                    </div>
                </li>
            ))}
        </ul>
    );
};

export default HallOfShame;
