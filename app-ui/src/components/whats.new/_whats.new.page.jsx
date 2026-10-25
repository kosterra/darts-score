import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';

import ReleaseNotes from '../about/release.notes';
import { useAuth } from '../../utils/auth.context';
import usePageTitle from '../../utils/use.page.title';
import { t } from '../../utils/i18n';
import { REPOSITORY } from '../../utils/project';
import { PageHeader, PublicFooter } from '../landing/public.frame';


/**
 * What's new, for everyone: the releases of Oche with their changes, as on
 * About in the app, so visitors see that it lives and grows.
 */
const WhatsNewPage = () => {
    const { user } = useAuth();
    usePageTitle(t('What\'s new'));

    return (
        <div className="terms-page">
            <PageHeader user={user} />
            <main className="container terms-main whats-new-main">
                <section className="terms-hero">
                    <span className="landing-eyebrow">{t('What\'s new')}</span>
                    <h1 className="landing-title m-0">{t('Oche keeps growing')}</h1>
                    <p className="terms-lead m-0">
                        {t('New games, features and fixes, release by release. Oche is made in the open:')}{' '}
                        <a href={REPOSITORY} target="_blank" rel="noopener noreferrer">{t('the code on GitHub')}</a>.
                    </p>
                </section>

                <ReleaseNotes />

                <section className="landing-cta terms-cta">
                    <h2 className="landing-heading m-0">{t('Ready for the oche?')}</h2>
                    <div className="d-flex flex-wrap justify-content-center gap-2">
                        <Link to="/register"><Button label={t('Create an account and your club')} icon="pi pi-arrow-right" iconPos="right" /></Link>
                        <Link to="/quick"><Button label={t('Play a quick game')} icon="pi pi-play" outlined /></Link>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
};

export default WhatsNewPage;
