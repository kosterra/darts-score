import { PublicFooter, PublicHeader, PublicNav } from '../landing/public.frame';
import usePageTitle from '../../utils/use.page.title';

/**
 * The frame of the login, registration and password pages, as the other
 * public pages: the bar with the sections of the start page, the title on
 * the board, the card below it, and the footer. heading: a headline under the
 * title, which then stands small above it (as on the privacy page); intro: a
 * line below. hide: 'login' or 'register', the page itself, left out of the
 * bar ('both' for a logged-in user, who gets no sections either).
 */
const AuthLayout = ({ title, heading, intro, hide, children }) => {
    usePageTitle(title);
    return (
        <div className="auth-page">
            <PublicHeader hide={hide} nav={hide === 'both' ? undefined : <PublicNav />} />
            <main className="auth-page-content container">
                <section className="terms-hero auth-hero">
                    {heading && <span className="landing-eyebrow">{title}</span>}
                    <h1 className={`${heading ? 'landing-title' : 'landing-heading'} m-0`}>{heading ?? title}</h1>
                    {intro && <p className="terms-lead m-0">{intro}</p>}
                </section>
                <div className="auth-card">
                    {children}
                </div>
            </main>
            <PublicFooter />
        </div>
    );
};

export default AuthLayout;
