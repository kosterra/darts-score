import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import PublicService from '../../services/public.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { PageHeader, PublicFooter } from '../landing/public.frame';
import { Lines } from '../elements/skeletons';
import usePageTitle from '../../utils/use.page.title';

// what matters most, before the details
const GLANCE = [
    { icon: 'pi-eye-slash', title: t('No tracking'), text: t('No analytics, no advertising and no cookies of other companies.') },
    { icon: 'pi-lock', title: t('Nothing sold'), text: t('Your data stays in this installation and is never sold.') },
    { icon: 'pi-filter', title: t('Only what is needed'), text: t('Your name, your games and what makes the app work.') },
    { icon: 'pi-trash', title: t('Yours to delete'), text: t('Delete your account at any time; your games stay for the others, anonymously.') },
];

/**
 * The privacy policy and the imprint of the installation: who runs it (as its
 * global admins entered it under System settings), what Legmate stores and why,
 * the cookies, who else gets data, how long what is kept, and the rights of
 * the people in it. Open to everyone, logged in or not.
 */
const PrivacyPage = () => {
    usePageTitle(t('Privacy'));
    const { user } = useAuth();
    const [legal, setLegal] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        PublicService.loadLegal().then(setLegal).catch(() => setFailed(true));
    }, []);

    // the imprint has its own address (/privacy#imprint): there once the text is in
    const { hash } = useLocation();
    useEffect(() => {
        if (legal && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
    }, [legal, hash]);

    const keep = legal?.keep ?? {};
    const operator = legal && (legal.operator || legal.address || legal.email)
        ? (
            <address className="legal-operator m-0">
                {legal.operator && <strong className="d-block">{legal.operator}</strong>}
                {legal.address && <span className="d-block legal-address">{legal.address}</span>}
                {legal.email && <a href={`mailto:${legal.email}`}>{legal.email}</a>}
            </address>
        )
        : <p className="text-subtle m-0">{t('The operator of this installation has not entered their details yet.')}</p>;

    // the sections, each a tile of its own with its own address (/privacy#imprint)
    const sections = legal && [
        { id: 'responsible', icon: 'pi-user', title: t('Who is responsible'), body: operator },
        {
            id: 'stored', icon: 'pi-database', title: t('What is stored, and why'), body: (
                <>
                    <ul>
                        <li><strong>{t('Your account:')}</strong>{' '}{t('your name, your email address, your password (only as a hash, never readable), your language and settings, and when you last logged in. To log you in, run your clubs and send you the mails you chose.')}{' '}{t('While you are logged in, the login on each device (browser and system, when it started and was last used), which the global admins see and can end; and on which days you used the app, for the usage statistics of the global admins (numbers only, never what you did).')}</li>
                        <li><strong>{t('Players:')}</strong>{' '}{t('nickname, name, picture and country, the date of birth (entered by the club admins, also for children: for fair handicaps between ages, and to keep children out of the Hall of Shame), and the games, trainings, statistics, badges and levels. To keep score and show the statistics within the club.')}</li>
                        <li><strong>{t('Clubs and groups:')}</strong>{' '}{t('name, logo, description, country, admins and members, and what they play.')}</li>
                        <li><strong>{t('Calendar:')}</strong>{' '}{t('whether you come to a club night, seen by the members of the club; and, once you ask for it, your calendar link: a secret address that shows the calendar of your clubs to whoever has it, until you make a new one.')}</li>
                        <li><strong>{t('Players without a login:')}</strong>{' '}{t('an email address only when a club admin enters it with the player\'s consent, for the mails chosen there; every mail has a link to get no more.')}</li>
                        <li><strong>{t('Quick games without an account:')}</strong>{' '}{t('only the names typed in, kept {{days}} days; a game not finished {{unfinished}} days after its last visit.', { days: keep.quickGameDays, unfinished: keep.quickUnfinishedDays ?? 3 })}</li>
                        {legal.contactForm && <li><strong>{t('Messages of the contact form:')}</strong>{' '}{t('your name, your email address and your message go by mail to the operator above, to answer you; Legmate itself keeps nothing of them.')}</li>}
                        <li><strong>{t('Protection:')}</strong>{' '}{t('the internet address (IP) of requests, to stop spam and attacks (e.g. too many failed logins); alerts with it are kept for the global admins until they remove them. Errors of the app are kept {{days}} days.', { days: keep.errorLogDays })}</li>
                    </ul>
                    <p className="m-0">{t('What a club makes public (its live games and results, and the nicknames of the players who allow it) is shown on the public start page; everything else only to the members of the club.')}</p>
                </>
            ),
        },
        {
            id: 'cookies', icon: 'pi-desktop', title: t('Cookies and storage on your device'), body: (
                <>
                    <p>{t('Legmate uses no tracking, no advertising, no analytics and no cookies of other companies. It only stores what is needed for what you use, which needs no consent:')}</p>
                    <ul className="mb-0">
                        <li><code>ds_session</code>{' '}{t('keeps you logged in, until you log out or for {{hours}} hours.', { hours: keep.sessionHours })}</li>
                        <li><code>ds_mfa</code>{' '}{t('holds a login for five minutes while it waits for the code of two-step login.')}</li>
                        <li><code>ds_trust</code>{' '}{t('skips the code of two-step login on this device for {{days}} days, only when you choose it.', { days: keep.trustedDeviceDays })}</li>
                        <li>{t('In the storage of your browser, only on your device: the language, the look, the club you use, the filters of lists and the key of a quick game.')}</li>
                    </ul>
                </>
            ),
        },
        {
            id: 'recipients', icon: 'pi-share-alt', title: t('Who else receives data'), body: (
                <>
                    <ul className={legal.notes ? undefined : 'mb-0'}>
                        {legal.mailEnabled && <li>{t('The mail server of this installation, for the mails you get (password reset, invitations, the notifications you chose).')}</li>}
                        <li>{t('The provider that hosts this installation and carries its traffic.')}</li>
                        <li>{t('Nothing is sold or used for advertising. The font, the icons and the pictures come from Legmate itself, not from other companies.')}</li>
                        <li>{t('The donation pages linked on Support Legmate (e.g. TWINT, GitHub) belong to their providers and only learn about you when you open them.')}</li>
                    </ul>
                    {legal.notes && <p className="legal-notes m-0">{legal.notes}</p>}
                </>
            ),
        },
        {
            id: 'how-long', icon: 'pi-clock', title: t('How long'), body: (
                <ul className="mb-0">
                    <li>{t('Your account and your players: until you delete your account or a club admin deletes the player.')}</li>
                    <li>{t('Logins: until you log out or their time is up. The days you used the app: {{days}} days.', { days: keep.usageDays })}</li>
                    <li>{t('Notifications: {{days}} days. Quick games: {{quick}} days, not finished {{unfinished}} days after the last visit. Notes of fair play: {{fair}} days. Links to take over a player: {{claim}} days.', { days: keep.notificationDays, quick: keep.quickGameDays, unfinished: keep.quickUnfinishedDays ?? 3, fair: keep.fairPlayDays, claim: keep.claimLinkDays })}</li>
                </ul>
            ),
        },
        {
            id: 'rights', icon: 'pi-verified', title: t('Your rights'), body: (
                <ul className="mb-0">
                    <li>{t('You see what is stored about you on your profile and your statistics, and correct it there or through your club admin.')}</li>
                    <li>{t('You delete your account under Profile → Account → Delete account. Your players then stay in their clubs under an anonymous name, so the games and statistics of the others stay whole; your name, picture and date of birth are removed.')}</li>
                    <li>{t('For information about your data, to object or for anything else, write to the operator above. You can also complain to a data protection authority: in Switzerland the FDPIC, in the EU the one of your country.')}</li>
                </ul>
            ),
        },
        { id: 'imprint', icon: 'pi-building', title: t('Imprint'), body: operator },
    ];

    return (
        <div className="privacy-page">
            <PageHeader user={user} />
            <main className="container privacy-main">
                <section className="terms-hero">
                    <span className="landing-eyebrow">{t('Privacy')}</span>
                    <h1 className="landing-title m-0">{t('Your data in Legmate')}</h1>
                    <p className="terms-lead m-0">{t('Legmate is a scoreboard and statistics app for darts: for clubs and pub teams as well as for friends, flatshares and families. Every group plays in Legmate as a "club". This page says which personal data this installation keeps, why, for how long and what your rights are.')}</p>
                </section>

                <ul className="privacy-glance" aria-label={t('At a glance')}>
                    {GLANCE.map(item => (
                        <li key={item.title} className="privacy-glance-item">
                            <span className="landing-feature-icon" aria-hidden="true"><i className={`pi ${item.icon}`} /></span>
                            <span className="d-flex flex-column gap-1">
                                <strong className="text-default">{item.title}</strong>
                                <span className="text-subtle fs-7">{item.text}</span>
                            </span>
                        </li>
                    ))}
                </ul>

                {!legal && !failed && <Lines count={8} />}
                {failed && <p className="text-subtle m-0">{t('The privacy policy could not be loaded. Please try again later.')}</p>}
                {legal &&
                    <>
                        <nav className="terms-groups privacy-contents" aria-label={t('Contents')}>
                            {sections.map(section => <a key={section.id} href={`#${section.id}`} className="terms-group-pill">{section.title}</a>)}
                        </nav>
                        <div className="privacy-sections legal-text">
                            {sections.map(section => (
                                <section key={section.id} id={section.id} className="privacy-section">
                                    <h2 className="privacy-section-title">
                                        <span className="landing-feature-icon" aria-hidden="true"><i className={`pi ${section.icon}`} /></span>
                                        {section.title}
                                    </h2>
                                    {section.body}
                                </section>
                            ))}
                        </div>
                    </>}
            </main>
            <PublicFooter />
        </div>
    );
};

export default PrivacyPage;
