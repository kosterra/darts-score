import { t } from '../../utils/i18n';
import { PublicFooter, PublicHeader } from '../landing/public.frame';
import usePageTitle from '../../utils/use.page.title';

/**
 * The frame of the quick games: the bar and the footer of the start page, with the page between them.
 * suffix: the word after the brand ("· Quick game" by default).
 */
const QuickLayout = ({ children, suffix = t('· Quick game') }) => {
    // the tab says what the page is: "Quick game – Oche"
    usePageTitle(suffix.replace(/^·\s*/, ''));
    return (
        <div className="quick-page">
            <PublicHeader suffix={suffix} />
            <div className="quick-page-content">{children}</div>
            <PublicFooter />
        </div>
    );
};

export default QuickLayout;
