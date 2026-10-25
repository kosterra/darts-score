import { Link } from 'react-router-dom';
import { t } from '../../utils/i18n';

/**
 * Under the result of a game of a darts evening: back to the evening, where
 * the table follows and the next game starts (no rematch outside it).
 */
const EveningGameActions = ({ eveningId }) => (
    <div className="d-flex justify-content-center">
        <Link to={`/evening/${eveningId}`} className="p-button p-button-sm text-decoration-none">
            <i className="pi pi-users me-2" aria-hidden="true" />{t('Back to the evening')}
        </Link>
    </div>
);

export default EveningGameActions;
