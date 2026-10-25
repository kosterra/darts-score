import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import ClubLogo from '../elements/club.logo';
import { locale, t } from '../../utils/i18n';
import { ClubMedalRow } from '../badges/club.badges';
import CountryFlag from '../elements/country.flag';

dayjs.extend(relativeTime);

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

/**
 * A public club on the start page: what it is, what it played (games, the
 * last 30 days, the X01 average, the 180s, the last game) and whether it
 * takes new members.
 */
const PublicClubCard = ({ club }) => {
    const figures = [
        [t('Players'), formatNumber(club.playerCount)],
        [t('Games'), formatNumber(club.gamesPlayed)],
        [t('Last 30 days'), formatNumber(club.gamesLast30Days)],
        [t('X01 average'), club.x01Average != null ? club.x01Average.toFixed(1) : '–'],
        ['180s', formatNumber(club.num180s)],
        [t('Last game'), club.lastGameAt ? dayjs(club.lastGameAt).fromNow() : '–'],
    ];
    const takesMembers = club.joinPolicy === 'open' || club.joinPolicy === 'approval';

    return (
        <article className="public-club">
            <div className="d-flex align-items-center gap-3 min-w-0">
                <ClubLogo club={club} size="md" />
                <div className="d-flex flex-column min-w-0">
                    <h3 className="fs-5 fw-semibold text-default m-0 text-break">{club.name}{' '}<CountryFlag code={club.country} /></h3>
                    {club.badges?.length > 0 && <span className="mt-1"><ClubMedalRow badges={club.badges} count={club.badgeCount} size="sm" /></span>}
                    <span className="text-faint fs-8">
                        {club.busiestDay ? t(`Plays mostly on ${club.busiestDay}s`) : t('With Legmate since {{format}}', { format: dayjs(club.createdAt).format('MMMM YYYY') })}
                    </span>
                </div>
            </div>
            {club.description && <p className="public-club-description text-subtle fs-7 m-0">{club.description}</p>}
            <dl className="public-club-figures">
                {figures.map(([label, value]) => (
                    <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
            {takesMembers &&
                <Link to="/register" className="public-club-join">
                    <i className="pi pi-user-plus" aria-hidden="true" />
                    {club.joinPolicy === 'open' ? t('Open to join: register and join') : t('Takes new members: register and ask to join')}
                </Link>
            }
        </article>
    );
};

export default PublicClubCard;
