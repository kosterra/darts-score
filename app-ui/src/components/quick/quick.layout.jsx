import { t } from '../../utils/i18n';
import { PublicHeader } from '../landing/public.frame';

/**
 * The frame of the quick games: the bar of the start page, with the page below.
 */
const QuickLayout = ({ children }) => (
    <div className="quick-page">
        <PublicHeader suffix={t('· Quick game')} />
        <div className="quick-page-content">{children}</div>
    </div>
);

export default QuickLayout;
