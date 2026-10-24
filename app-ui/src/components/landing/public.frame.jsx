import { Link, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { t } from '../../utils/i18n';
import LanguageSwitch from '../elements/language.switch';

/**
 * The bar on top of the public pages (the start page, the quick games, login
 * and registration): the brand back to the start page, the sections of the
 * page (nav), and on the right the language and the way to an account.
 * suffix: a word after the brand, e.g. "· Quick game"; hide: 'login' or 'register', the page itself ('both' for a logged-in user);
 * action: in place of them, e.g. the way back into the app
 */
export const PublicHeader = ({ suffix, nav, hide, action }) => {
    const { pathname } = useLocation();
    return (
        <header className="landing-bar">
            <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none" aria-label={t('Oche start page')}>
                <img alt="" src="/logo.svg" width="40" height="40" />
                <span className="fs-5 fw-semibold text-default landing-brand-name">{t('Oche')}</span>
                {suffix && <span className="text-faint fs-8 d-none d-sm-inline">{suffix}</span>}
            </Link>
            {nav}
            <nav className="d-flex align-items-center gap-2" aria-label={t('Account')}>
                {/* the way to support Oche, quiet: a heart, with its word on wider screens */}
                {pathname !== '/support' &&
                    <Link to="/support" className="landing-support-link" title={t('Support Oche')} aria-label={t('Support Oche')}>
                        <i className="pi pi-heart" aria-hidden="true" />
                        <span className="d-none d-xl-inline">{t('Support Oche')}</span>
                    </Link>}
                <LanguageSwitch />
                {hide !== 'login' && hide !== 'both' && <Link to="/login"><Button label={t('Log in')} size="small" outlined /></Link>}
                {hide !== 'register' && hide !== 'both' && <Link to="/register"><Button label={t('Register')} size="small" /></Link>}
                {action}
            </nav>
        </header>
    );
};

/**
 * The bar on top of a page of its own (privacy, support): logged out the
 * sections of the start page and the way to an account, logged in the way
 * back into the app (the start page is then the dashboard).
 */
export const PageHeader = ({ user }) => (user
    ? <PublicHeader hide="both" action={<Link to="/"><Button label={t('Open Oche')} size="small" /></Link>} />
    : <PublicHeader nav={<nav className="landing-nav" aria-label={t('Sections')}><Link to="/#features">{t('Features')}</Link><Link to="/#faq">{t('FAQ')}</Link></nav>} />);

/**
 * The line at the bottom of the public pages.
 */
// where the code of Oche lives
const REPOSITORY = 'https://github.com/kosterra/darts-score';

/**
 * The footer of the public pages: the brand with what Oche is, the ways to
 * play or to an account, and the privacy policy, imprint and source code.
 */
export const PublicFooter = () => (
    <footer className="landing-footer">
        <div className="landing-footer-inner">
            <div className="landing-footer-brand">
                <img alt="" src="/logo.svg" width="32" height="32" />
                <div className="d-flex flex-column">
                    <span className="landing-footer-name">Oche</span>
                    <span>{t('The darts scoreboard for clubs, friends and flatshares · open source under the GPLv3')}</span>
                </div>
            </div>
            <nav className="landing-footer-links" aria-label={t('Footer')}>
                <span className="landing-footer-group">
                    <Link to="/quick" className="landing-footer-icon-link"><i className="pi pi-bolt" aria-hidden="true" />{t('Quick game')}</Link>
                    <Link to="/login" className="landing-footer-icon-link"><i className="pi pi-sign-in" aria-hidden="true" />{t('Log in')}</Link>
                    <Link to="/register" className="landing-footer-icon-link"><i className="pi pi-user-plus" aria-hidden="true" />{t('Register')}</Link>
                </span>
                <span className="landing-footer-divider" aria-hidden="true">|</span>
                <span className="landing-footer-group">
                    <Link to="/support" className="landing-footer-icon-link"><i className="pi pi-heart-fill is-heart" aria-hidden="true" />{t('Support Oche')}</Link>
                    <Link to="/privacy" className="landing-footer-icon-link"><i className="pi pi-shield" aria-hidden="true" />{t('Privacy')}</Link>
                    <Link to="/privacy#imprint" className="landing-footer-icon-link"><i className="pi pi-id-card" aria-hidden="true" />{t('Imprint')}</Link>
                    <a href={REPOSITORY} target="_blank" rel="noopener noreferrer" className="landing-footer-icon-link"><i className="pi pi-github" aria-hidden="true" />{t('Source code')}</a>
                </span>
            </nav>
        </div>
    </footer>
);
