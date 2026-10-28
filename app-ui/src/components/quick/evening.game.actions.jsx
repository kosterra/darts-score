import { Link } from 'react-router-dom';
import { t } from '../../utils/i18n';

/**
 * Under the result of a game of a darts evening (eveningId) or of a club
 * evening (clubNight: its day): back to the evening, where the table follows
 * and the next game starts (no rematch outside it).
 */
const EveningGameActions = ({ eveningId, clubNight }) => (
    <div className="d-flex justify-content-center">
        <Link to={clubNight ? `/club-night/${clubNight}` : `/evening/${eveningId}`} className="p-button p-button-sm text-decoration-none">
            <i className="pi pi-users me-2" aria-hidden="true" />{clubNight ? t('Back to the club evening') : t('Back to the evening')}
        </Link>
    </div>
);

export default EveningGameActions;
