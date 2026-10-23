import { t } from '../../utils/i18n';
import { PublicFooter, PublicHeader } from '../landing/public.frame';

/**
 * The frame of the quick games: the bar and the footer of the start page, with the page between them.
 */
const QuickLayout = ({ children }) => (
    <div className="quick-page">
        <PublicHeader suffix={t('· Quick game')} />
        <div className="quick-page-content">{children}</div>
        <PublicFooter />
    </div>
);

export default QuickLayout;
