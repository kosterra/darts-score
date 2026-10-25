import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

import PublicService from '../../services/public.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { PageHeader, PublicFooter } from '../landing/public.frame';
import { Lines } from '../elements/skeletons';
import usePageTitle from '../../utils/use.page.title';

// the name of the site a link goes to: "ko-fi.com"
const hostOf = (url) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

const external = { target: '_blank', rel: 'noopener noreferrer' };

// one way to give: its icon, what it is, and the button
const Option = ({ icon, title, text, children, primary = false }) => (
    <div className={`support-option ${primary ? 'is-primary' : ''}`}>
        <span className="landing-feature-icon" aria-hidden="true"><i className={`pi ${icon}`} /></span>
        <h2 className="support-option-title m-0">{title}</h2>
        <p className="text-subtle m-0">{text}</p>
        {children}
    </div>
);

/**
 * Supporting Legmate with a gift, for everyone, in the look of the start page:
 * why it helps, then TWINT (with a QR code to scan from a computer) and
 * another donation page of this installation, as its global admins set
 * them, and the sponsoring of the project on GitHub. Plain links only:
 * nothing of another company is loaded before one is opened.
 */
const SupportPage = () => {
    usePageTitle(t('Support Legmate'), { full: true });
    const { user } = useAuth();
    const [support, setSupport] = useState(null);
    const [qr, setQr] = useState('');

    useEffect(() => {
        PublicService.loadSupport().then(setSupport).catch(() => setSupport({ url: '', twint: '', project: '' }));
    }, []);
    useEffect(() => {
        if (support?.twint) QRCode.toDataURL(support.twint, { margin: 1, width: 280 }).then(setQr).catch(() => setQr(''));
    }, [support?.twint]);

    return (
        <div className="support-page">
            <PageHeader user={user} />
            <main className="container support-main">
                <section className="support-hero">
                    <span className="support-heart" aria-hidden="true"><i className="pi pi-heart-fill" /></span>
                    <span className="landing-eyebrow">{t('Support Legmate')}</span>
                    <h1 className="landing-title m-0">{t('Keep Legmate free – for everyone')}</h1>
                    <p className="support-lead m-0">{t('Legmate is free for everyone and without ads, and it stays that way. It costs time to make and money to run. If you enjoy it, you can give something back: entirely voluntary, any amount.')}</p>
                    <ul className="landing-points support-points">
                        <li><i className="pi pi-server" aria-hidden="true" />{t('The server and the domain')}</li>
                        <li><i className="pi pi-envelope" aria-hidden="true" />{t('The mails to every club')}</li>
                        <li><i className="pi pi-sparkles" aria-hidden="true" />{t('Time for new games and fixes')}</li>
                    </ul>
                </section>

                {!support && <Lines count={3} />}
                {support &&
                    <div className="support-options">
                        {support.twint &&
                            <Option icon="pi-mobile" title="TWINT" text={t('On your phone: tap the button. On a computer: scan the code with the TWINT app.')}>
                                {qr && <img src={qr} alt={t('QR code for TWINT')} className="support-qr d-none d-md-block" width="150" height="150" />}
                                <a href={support.twint} {...external} className="p-button text-decoration-none justify-content-center"><i className="pi pi-mobile me-2" />{t('Give with TWINT')}</a>
                            </Option>}
                        {support.url &&
                            <Option icon="pi-heart" title={t('Donate')} text={t('With a card or another way, on {{site}}.', { site: hostOf(support.url) })}>
                                <a href={support.url} {...external} className="p-button p-button-secondary text-decoration-none justify-content-center"><i className="pi pi-heart me-2" />{t('Donate on {{site}}', { site: hostOf(support.url) })}</a>
                            </Option>}
                        {support.project &&
                            <Option icon="pi-github" title={t('The development of Legmate')} text={t('Legmate is open source. Sponsoring on GitHub helps the app itself, on every installation: new games, features and fixes.')} primary={!support.twint && !support.url}>
                                <a href={support.project} {...external} className={`p-button ${support.twint || support.url ? 'p-button-secondary' : ''} text-decoration-none justify-content-center`}><i className="pi pi-github me-2" />{t('Sponsor on GitHub')}</a>
                            </Option>}
                    </div>}
                {support && <p className="support-note">{t('The donation pages belong to their providers (e.g. TWINT or GitHub); Legmate does not learn what you give. A gift is not tax-deductible, and it gives no claim to anything: Legmate stays the same for everyone.')}</p>}
            </main>
            <PublicFooter />
        </div>
    );
};

export default SupportPage;
