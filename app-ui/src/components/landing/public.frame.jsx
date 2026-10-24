import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { t } from '../../utils/i18n';
import LanguageSwitch from '../elements/language.switch';

/**
 * The bar on top of the public pages (the start page, the quick games, login
 * and registration): the brand back to the start page, the sections of the
 * page (nav), and on the right the language and the way to an account.
 * suffix: a word after the brand, e.g. "· Quick game"; hide: 'login' or 'register', the page itself ('both' for a logged-in user)
 */
export const PublicHeader = ({ suffix, nav, hide }) => (
    <header className="landing-bar">
        <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none" aria-label={t('Oche start page')}>
            <img alt="" src="/logo.svg" width="40" height="40" />
            <span className="fs-5 fw-semibold text-default landing-brand-name">{t('Oche')}</span>
            {suffix && <span className="text-faint fs-8 d-none d-sm-inline">{suffix}</span>}
        </Link>
        {nav}
        <nav className="d-flex align-items-center gap-2" aria-label={t('Account')}>
            <LanguageSwitch />
            {hide !== 'login' && hide !== 'both' && <Link to="/login"><Button label={t('Log in')} size="small" outlined /></Link>}
            {hide !== 'register' && hide !== 'both' && <Link to="/register"><Button label={t('Register')} size="small" /></Link>}
        </nav>
    </header>
);

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
                    <Link to="/quick">{t('Quick game')}</Link>
                    <Link to="/login">{t('Log in')}</Link>
                    <Link to="/register">{t('Register')}</Link>
                </span>
                <span className="landing-footer-group">
                    <Link to="/privacy">{t('Privacy')}</Link>
                    <Link to="/privacy#imprint">{t('Imprint')}</Link>
                    <a href={REPOSITORY} target="_blank" rel="noopener noreferrer">{t('Source code')}</a>
                </span>
            </nav>
        </div>
    </footer>
);
