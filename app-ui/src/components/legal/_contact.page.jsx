import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';

import PublicService from '../../services/public.service';
import { useAuth } from '../../utils/auth.context';
import usePageTitle from '../../utils/use.page.title';
import { t } from '../../utils/i18n';
import { PageHeader, PublicFooter } from '../landing/public.frame';
import { Lines } from '../elements/skeletons';

const REPOSITORY = 'https://github.com/kosterra/darts-score';
const external = { target: '_blank', rel: 'noopener noreferrer' };
const MAX_MESSAGE = 3000;

/**
 * The form to write to the operator: name and address to answer to (taken
 * from the account when logged in) and the message; a hidden field only
 * bots fill. Thanks once it is sent.
 */
const ContactForm = ({ user }) => {
    const [form, setForm] = useState({ name: user ? `${user.firstname} ${user.lastname}`.trim() : '', email: user?.email ?? '', message: '', website: '' });
    const [state, setState] = useState({ busy: false, error: '', sent: false });
    const set = (field) => (event) => setForm(current => ({ ...current, [field]: event.target.value }));
    const ready = form.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && form.message.trim().length >= 10;

    const send = async (event) => {
        event.preventDefault();
        setState({ busy: true, error: '', sent: false });
        try {
            await PublicService.sendContact(form);
            setState({ busy: false, error: '', sent: true });
        } catch (err) {
            setState({ busy: false, error: err.message, sent: false });
        }
    };

    if (state.sent) {
        return (
            <div className="d-flex flex-column gap-3">
                <Message severity="success" className="w-100 justify-content-start" text={t('Thank you! Your message was sent; the answer comes to {{email}}.', { email: form.email.trim() })} />
                <Button type="button" label={t('Write another message')} size="small" severity="secondary" text className="align-self-start" onClick={() => { setForm(current => ({ ...current, message: '' })); setState({ busy: false, error: '', sent: false }); }} />
            </div>
        );
    }

    return (
        <form className="d-flex flex-column gap-3" onSubmit={send}>
            <div className="contact-fields">
                <label className="d-flex flex-column gap-1" htmlFor="contact-name">
                    <span className="fs-7 text-default fw-semibold">{t('Your name')}</span>
                    <InputText id="contact-name" value={form.name} onChange={set('name')} maxLength={80} autoComplete="name" required />
                </label>
                <label className="d-flex flex-column gap-1" htmlFor="contact-email">
                    <span className="fs-7 text-default fw-semibold">{t('Your email address')}</span>
                    <InputText id="contact-email" type="email" value={form.email} onChange={set('email')} maxLength={254} autoComplete="email" required />
                </label>
            </div>
            <label className="d-flex flex-column gap-1" htmlFor="contact-message">
                <span className="fs-7 text-default fw-semibold">{t('Your message')}</span>
                <InputTextarea id="contact-message" value={form.message} onChange={set('message')} maxLength={MAX_MESSAGE} rows={6} autoResize required />
                <span className="text-faint fs-8 align-self-end">{form.message.length} / {MAX_MESSAGE}</span>
            </label>
            {/* left empty by people; a bot fills in every field */}
            <input type="text" name="website" value={form.website} onChange={set('website')} className="contact-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {state.error && <Message severity="error" className="w-100 justify-content-start" text={state.error} />}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <span className="text-faint fs-8">{t('Your name, address and message go by mail to the operator, only to answer you.')}</span>
                <Button type="submit" label={t('Send')} icon="pi pi-send" loading={state.busy} disabled={!ready} />
            </div>
        </form>
    );
};

/**
 * Contact, for everyone: feedback and questions to the operator of this
 * installation through the form (when their address and a mail server are
 * set, else their address, if any), and problems, bugs and ideas as issues on
 * GitHub, where everyone sees them and Oche is made.
 */
const ContactPage = () => {
    const { user } = useAuth();
    usePageTitle(t('Contact'));
    const [legal, setLegal] = useState(null);

    useEffect(() => {
        PublicService.loadLegal().then(setLegal).catch(() => setLegal({}));
    }, []);

    const feedback = () => {
        if (!legal) return <Lines count={4} />;
        if (legal.contactForm) return <ContactForm user={user} />;
        if (legal.email) return <a href={`mailto:${legal.email}`} className="p-button p-button-secondary text-decoration-none align-self-start"><i className="pi pi-envelope me-2" aria-hidden="true" />{t('Write to {{email}}', { email: legal.email })}</a>;
        return <p className="text-subtle m-0">{t('This installation has no contact form. Please write on GitHub instead.')}</p>;
    };

    return (
        <div className="terms-page">
            <PageHeader user={user} />
            <main className="container terms-main contact-main">
                <section className="terms-hero">
                    <span className="landing-eyebrow">{t('Contact')}</span>
                    <h1 className="landing-title m-0">{t('Get in touch')}</h1>
                    <p className="terms-lead m-0">{t('Feedback, a question or just a hello: write to us. Problems and ideas belong on GitHub, where everyone sees them and they become part of Oche.')}</p>
                </section>

                <div className="contact-ways">
                    <section className="contact-way">
                        <span className="landing-feature-icon" aria-hidden="true"><i className="pi pi-comments" /></span>
                        <h2 className="contact-way-title m-0">{t('Feedback and questions')}</h2>
                        <p className="text-subtle m-0">{t('Tell us how Oche works for you, ask a question or say what you like. Your message goes to the people who run this installation, and they answer by mail.')}</p>
                        {feedback()}
                    </section>

                    <section className="contact-way">
                        <span className="landing-feature-icon" aria-hidden="true"><i className="pi pi-github" /></span>
                        <h2 className="contact-way-title m-0">{t('Problems, bugs and ideas')}</h2>
                        <p className="text-subtle m-0">{t('Something does not work, a feature is missing, or you have an idea for Oche? Open an issue on GitHub: everyone sees it there, others can add to it, and you follow how it gets done. It needs a free GitHub account; please look first whether it is there already.')}</p>
                        <div className="d-flex flex-wrap gap-2">
                            <a href={`${REPOSITORY}/issues/new?labels=bug`} {...external} className="p-button text-decoration-none"><i className="pi pi-exclamation-circle me-2" aria-hidden="true" />{t('Report a problem')}</a>
                            <a href={`${REPOSITORY}/issues/new?labels=enhancement`} {...external} className="p-button p-button-secondary text-decoration-none"><i className="pi pi-lightbulb me-2" aria-hidden="true" />{t('Suggest an idea')}</a>
                        </div>
                        <a href={`${REPOSITORY}/issues`} {...external} className="fs-7">{t('See the open issues')}</a>
                    </section>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
};

export default ContactPage;
