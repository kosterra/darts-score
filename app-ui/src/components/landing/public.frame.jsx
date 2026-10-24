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
export const PublicFooter = () => (
    <footer className="landing-footer">
        <span>{t('Oche · open source under the GPLv3')}</span>
        <span className="d-flex gap-3">
            <Link to="/">{t('Start page')}</Link>
            <Link to="/login">{t('Log in')}</Link>
            <Link to="/register">{t('Register')}</Link>
            <Link to="/privacy">{t('Privacy')}</Link>
        </span>
    </footer>
);
