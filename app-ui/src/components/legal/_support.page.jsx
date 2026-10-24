import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import QRCode from 'qrcode';

import PublicService from '../../services/public.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { PublicFooter, PublicHeader } from '../landing/public.frame';
import { Lines } from '../elements/skeletons';

// the name of the site a link goes to: "ko-fi.com"
const hostOf = (url) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

const external = { target: '_blank', rel: 'noopener noreferrer' };

/**
 * Supporting Oche with a gift, for everyone: TWINT (with a QR code to scan
 * from a computer) and another donation page of this installation, as its
 * global admins set them, and the sponsoring page of the project. Plain
 * links only: nothing of another company is loaded before one is opened.
 */
const SupportPage = () => {
    const { user } = useAuth();
    const [support, setSupport] = useState(null);
    const [qr, setQr] = useState('');

    useEffect(() => {
        PublicService.loadSupport().then(setSupport).catch(() => setSupport({ url: '', twint: '', project: '' }));
    }, []);
    useEffect(() => {
        if (support?.twint) QRCode.toDataURL(support.twint, { margin: 1, width: 280 }).then(setQr).catch(() => setQr(''));
    }, [support?.twint]);

    const own = support && (support.twint || support.url);
    return (
        <div className="auth-page">
            <PublicHeader hide={user ? 'both' : undefined} />
            <main className="container-fluid p-4">
                <div className="legal-page d-flex flex-column gap-4">
                    <Panel header={t('Support Oche')}>
                        <div className="d-flex flex-column gap-3 legal-text">
                            <p className="m-0">{t('Oche is free for everyone and without ads, and it stays that way. It costs time to make and money to run. If you enjoy it, you can give something back: entirely voluntary, any amount.')}</p>
                            {!support && <Lines count={3} />}
                            {own &&
                                <div className="support-options">
                                    {support.twint &&
                                        <div className="support-option">
                                            <span className="support-option-title">TWINT</span>
                                            <span className="text-subtle fs-7">{t('On your phone: tap the button. On a computer: scan the code with the TWINT app.')}</span>
                                            {qr && <img src={qr} alt={t('QR code for TWINT')} className="support-qr d-none d-md-block" width="160" height="160" />}
                                            <a href={support.twint} {...external} className="p-button p-button-sm text-decoration-none justify-content-center support-twint"><i className="pi pi-mobile me-2" />{t('Give with TWINT')}</a>
                                        </div>}
                                    {support.url &&
                                        <div className="support-option">
                                            <span className="support-option-title">{t('Donate')}</span>
                                            <span className="text-subtle fs-7">{t('With a card or another way, on {{site}}.', { site: hostOf(support.url) })}</span>
                                            <a href={support.url} {...external} className="p-button p-button-sm p-button-secondary text-decoration-none justify-content-center"><i className="pi pi-heart me-2" />{t('Donate on {{site}}', { site: hostOf(support.url) })}</a>
                                        </div>}
                                </div>}
                            {support?.project &&
                                <div className="support-option">
                                    <span className="support-option-title">{t('The development of Oche')}</span>
                                    <span className="text-subtle fs-7">{t('Oche is open source. Sponsoring on GitHub helps the app itself, on every installation: new games, features and fixes.')}</span>
                                    <a href={support.project} {...external} className="p-button p-button-sm p-button-secondary text-decoration-none justify-content-center"><i className="pi pi-github me-2" />{t('Sponsor on GitHub')}</a>
                                </div>}
                            {support && <p className="text-faint fs-8 m-0">{t('The donation pages belong to their providers (e.g. TWINT or GitHub); Oche does not learn what you give. A gift is not tax-deductible, and it gives no claim to anything: Oche stays the same for everyone.')}</p>}
                        </div>
                    </Panel>
                    {user && <p className="m-0"><Link to="/">{t('Back to Oche')}</Link></p>}
                </div>
            </main>
            <PublicFooter />
        </div>
    );
};

export default SupportPage;
