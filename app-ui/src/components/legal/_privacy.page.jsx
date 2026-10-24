import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';

import PublicService from '../../services/public.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { PublicFooter, PublicHeader } from '../landing/public.frame';
import { Lines } from '../elements/skeletons';

/**
 * The privacy policy and the imprint of the installation: who runs it (as its
 * global admins entered it under System settings), what Oche stores and why,
 * the cookies, who else gets data, how long what is kept, and the rights of
 * the people in it. Open to everyone, logged in or not.
 */
const PrivacyPage = () => {
    const { user } = useAuth();
    const [legal, setLegal] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        PublicService.loadLegal().then(setLegal).catch(() => setFailed(true));
    }, []);

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

    return (
        <div className="auth-page">
            <PublicHeader hide={user ? 'both' : undefined} />
            <main className="container-fluid p-4">
                <div className="legal-page">
                    <Panel header={t('Privacy')}>
                        {!legal && !failed && <Lines count={8} />}
                        {failed && <p className="text-subtle m-0">{t('The privacy policy could not be loaded. Please try again later.')}</p>}
                        {legal &&
                            <div className="legal-text">
                                <p>{t('Oche is a scoreboard and statistics app for darts clubs. This page says which personal data this installation keeps, why, for how long and what your rights are.')}</p>

                                <h2>{t('Who is responsible')}</h2>
                                {operator}

                                <h2>{t('What is stored, and why')}</h2>
                                <ul>
                                    <li><strong>{t('Your account:')}</strong>{' '}{t('your name, your email address, your password (only as a hash, never readable), your language and settings, and when you last logged in. To log you in, run your clubs and send you the mails you chose.')}</li>
                                    <li><strong>{t('Players:')}</strong>{' '}{t('nickname, name, picture and country, the date of birth (entered by the club admins, also for children: for fair handicaps between ages, and to keep children out of the Hall of Shame), and the games, trainings, statistics, badges and levels. To keep score and show the statistics within the club.')}</li>
                                    <li><strong>{t('Clubs:')}</strong>{' '}{t('name, logo, description, country, admins and members, and what the club plays.')}</li>
                                    <li><strong>{t('Players without a login:')}</strong>{' '}{t('an email address only when a club admin enters it with the player\'s consent, for the mails chosen there; every mail has a link to get no more.')}</li>
                                    <li><strong>{t('Quick games without an account:')}</strong>{' '}{t('only the names typed in, kept {{days}} days.', { days: keep.quickGameDays })}</li>
                                    <li><strong>{t('Protection:')}</strong>{' '}{t('the internet address (IP) of requests, to stop spam and attacks (e.g. too many failed logins); alerts with it are kept for the global admins until they remove them. Errors of the app are kept {{days}} days.', { days: keep.errorLogDays })}</li>
                                </ul>
                                <p>{t('What a club makes public (its live games and results, and the nicknames of the players who allow it) is shown on the public start page; everything else only to the members of the club.')}</p>

                                <h2>{t('Cookies and storage on your device')}</h2>
                                <p>{t('Oche uses no tracking, no advertising, no analytics and no cookies of other companies. It only stores what is needed for what you use, which needs no consent:')}</p>
                                <ul>
                                    <li><code>ds_session</code>{' '}{t('keeps you logged in, until you log out or for {{hours}} hours.', { hours: keep.sessionHours })}</li>
                                    <li><code>ds_mfa</code>{' '}{t('holds a login for five minutes while it waits for the code of two-step login.')}</li>
                                    <li><code>ds_trust</code>{' '}{t('skips the code of two-step login on this device for {{days}} days, only when you choose it.', { days: keep.trustedDeviceDays })}</li>
                                    <li>{t('In the storage of your browser, only on your device: the language, the look, the club you use, the filters of lists and the key of a quick game.')}</li>
                                </ul>

                                <h2>{t('Who else receives data')}</h2>
                                <ul>
                                    {legal.mailEnabled && <li>{t('The mail server of this installation, for the mails you get (password reset, invitations, the notifications you chose).')}</li>}
                                    <li>{t('The provider that hosts this installation and carries its traffic.')}</li>
                                    <li>{t('Nothing is sold or used for advertising. The font, the icons and the pictures come from Oche itself, not from other companies.')}</li>
                                </ul>
                                {legal.notes && <p className="legal-notes">{legal.notes}</p>}

                                <h2>{t('How long')}</h2>
                                <ul>
                                    <li>{t('Your account and your players: until you delete your account or a club admin deletes the player.')}</li>
                                    <li>{t('Notifications: {{days}} days. Quick games: {{quick}} days. Notes of fair play: {{fair}} days. Links to take over a player: {{claim}} days.', { days: keep.notificationDays, quick: keep.quickGameDays, fair: keep.fairPlayDays, claim: keep.claimLinkDays })}</li>
                                </ul>

                                <h2>{t('Your rights')}</h2>
                                <ul>
                                    <li>{t('You see what is stored about you on your profile and your statistics, and correct it there or through your club admin.')}</li>
                                    <li>{t('You delete your account under Profile → Account → Delete account. Your players then stay in their clubs under an anonymous name, so the games and statistics of the others stay whole; your name, picture and date of birth are removed.')}</li>
                                    <li>{t('For information about your data, to object or for anything else, write to the operator above. You can also complain to a data protection authority: in Switzerland the FDPIC, in the EU the one of your country.')}</li>
                                </ul>

                                <h2 id="imprint">{t('Imprint')}</h2>
                                {operator}
                            </div>}
                    </Panel>
                    {user && <p className="mt-3"><Link to="/">{t('Back to Oche')}</Link></p>}
                </div>
            </main>
            <PublicFooter />
        </div>
    );
};

export default PrivacyPage;
