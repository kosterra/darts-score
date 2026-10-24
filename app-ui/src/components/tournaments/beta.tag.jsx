import { Tag } from 'primereact/tag';
import { t } from '../../utils/i18n';

/**
 * Tournaments are new: a "Beta" label wherever they are, with what that
 * means when pointed at.
 */
const BetaTag = ({ className = '' }) => (
    <Tag value={t('Beta')} severity="info" className={`beta-tag ${className}`} title={t('Tournaments are new and still growing. Something not working as it should? Tell your club admin or report it on GitHub.')} />
);

export default BetaTag;
