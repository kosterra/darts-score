import { Link, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { t } from '../../utils/i18n';
import { BRAND, LICENCE, REPOSITORY } from '../../utils/project';
import usePublicSite from '../../utils/use.public.site';
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
            <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none" aria-label={t('Legmate start page')}>
                <img alt="" src="/logo.svg" width="40" height="40" />
                <span className="fs-5 fw-semibold text-default landing-brand-name">{t('Legmate')}</span>
                {suffix && <span className="text-faint fs-8 d-none d-sm-inline">{suffix}</span>}
            </Link>
            {nav}
            <nav className="d-flex align-items-center gap-2" aria-label={t('Account')}>
                {/* the way to support Legmate, quiet: a heart, with its word on wider screens */}
                {pathname !== '/support' &&
                    <Link to="/support" className="landing-support-link" title={t('Support Legmate')} aria-label={t('Support Legmate')}>
                        <i className="pi pi-heart" aria-hidden="true" />
                        <span className="d-none d-xl-inline">{t('Support Legmate')}</span>
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
export const PageHeader = ({ user }) => {
    // an installation that opens with the login has no sections of a start page to go to
    const publicSite = usePublicSite();
    if (user) return <PublicHeader hide="both" action={<Link to="/"><Button label={t('Open Legmate')} size="small" /></Link>} />;
    return (
        <PublicHeader nav={
            <nav className="landing-nav" aria-label={t('Sections')}>
                {publicSite !== false && <><Link to="/#features">{t('Features')}</Link><Link to="/#faq">{t('FAQ')}</Link></>}
                <Link to="/darts-terms">{t('Darts A–Z')}</Link>
            </nav>} />
    );
};

/**
 * The line at the bottom of the public pages.
 */

/**
 * "Open source under the AGPLv3", the AGPLv3 a link to its official text (the
 * name stays the same in every language).
 */
export const Licence = ({ className = 'landing-footer-licence' }) => {
    const [before, after = ''] = t('Open source under the AGPLv3').split(LICENCE.name);
    return (
        <span className={className}>
            {before}<a href={LICENCE.url} target="_blank" rel="license noopener noreferrer">{LICENCE.name}</a>{after}
        </span>
    );
};

/**
 * The footer of the public pages: the brand with what Legmate is and its
 * licence, the ways to play or to an account, and Support Legmate, What's new,
 * Darts A–Z, Contact, the privacy policy, the imprint and the source code.
 */
export const PublicFooter = () => (
    <footer className="landing-footer">
        <div className="landing-footer-inner">
            <div className="landing-footer-brand">
                <img alt="" src="/logo.svg" width="32" height="32" />
                <div className="d-flex flex-column">
                    <span className="landing-footer-name">{BRAND}</span>
                    <span>
                        {t('The darts scoreboard for clubs, friends and flatshares')}
                        <Licence />
                    </span>
                </div>
            </div>
            <nav className="landing-footer-links" aria-label={t('Footer')}>
                <span className="landing-footer-group">
                    <Link to="/quick" className="landing-footer-icon-link"><i className="pi pi-bolt" aria-hidden="true" />{t('Quick game')}</Link>
                    <Link to="/evening/new" className="landing-footer-icon-link"><i className="pi pi-users" aria-hidden="true" />{t('Darts evening')}</Link>
                    <Link to="/login" className="landing-footer-icon-link"><i className="pi pi-sign-in" aria-hidden="true" />{t('Log in')}</Link>
                    <Link to="/register" className="landing-footer-icon-link"><i className="pi pi-user-plus" aria-hidden="true" />{t('Register')}</Link>
                </span>
                <span className="landing-footer-divider" aria-hidden="true">|</span>
                <span className="landing-footer-group">
                    <Link to="/support" className="landing-footer-icon-link"><i className="pi pi-heart-fill is-heart" aria-hidden="true" />{t('Support Legmate')}</Link>
                    <Link to="/whats-new" className="landing-footer-icon-link"><i className="pi pi-sparkles" aria-hidden="true" />{t('What\'s new')}</Link>
                    <Link to="/darts-terms" className="landing-footer-icon-link"><i className="pi pi-book" aria-hidden="true" />{t('Darts A–Z')}</Link>
                    <Link to="/contact" className="landing-footer-icon-link"><i className="pi pi-envelope" aria-hidden="true" />{t('Contact')}</Link>
                    <Link to="/privacy" className="landing-footer-icon-link"><i className="pi pi-shield" aria-hidden="true" />{t('Privacy')}</Link>
                    <Link to="/privacy#imprint" className="landing-footer-icon-link"><i className="pi pi-id-card" aria-hidden="true" />{t('Imprint')}</Link>
                    <a href={REPOSITORY} target="_blank" rel="noopener noreferrer" className="landing-footer-icon-link"><i className="pi pi-github" aria-hidden="true" />{t('Source code')}</a>
                </span>
            </nav>
        </div>
    </footer>
);
