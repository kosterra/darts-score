import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { t } from '../../utils/i18n';

/**
 * The frame of the quick games: the brand back to the start page and the
 * way to an account, with the page below.
 */
const QuickLayout = ({ children }) => (
    <div className="quick-page">
        <header className="landing-bar">
            <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
                <img alt="" src="/logo.svg" width="36" height="36" />
                <span className="fs-5 fw-semibold text-default">{t('Oche')}</span>
                <span className="text-faint fs-8 d-none d-sm-inline">{t('· Quick game')}</span>
            </Link>
            <nav className="d-flex gap-2" aria-label={t('Account')}>
                <Link to="/login"><Button label={t('Log in')} size="small" outlined /></Link>
                <Link to="/register"><Button label={t('Register')} size="small" /></Link>
            </nav>
        </header>
        <div className="quick-page-content">{children}</div>
    </div>
);

export default QuickLayout;
