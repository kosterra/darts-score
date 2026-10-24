import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';

import AdminService from '../../services/admin.service';
import { useAuth } from '../../utils/auth.context';
import { LANGUAGES, currentLanguage, t, tn } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';

/**
 * The mail server, for the global admins: how the installation is set up to
 * send mails (from its environment, without the password), its daily limit
 * with the mails of the last seven days, and a test mail to any address, with
 * what the server answered or what to check when it fails.
 */
const MailServer = ({ onSaved }) => {
    const { user } = useAuth();
    const [setup, setSetup] = useState(null);
    const [error, setError] = useState('');
    const [to, setTo] = useState(user?.email ?? '');
    const [language, setLanguage] = useState(currentLanguage());
    const [sending, setSending] = useState(false);
    // the last test: { ok, sentTo, response, ms } or { ok: false, message, code, detail }
    const [result, setResult] = useState(null);

    const [perDay, setPerDay] = useState(null);
    const [savingLimit, setSavingLimit] = useState(false);
    const panel = useRef(null);
    const { hash } = useLocation();

    useEffect(() => {
        AdminService.loadMailServer()
            .then(loaded => { setSetup(loaded); setPerDay(loaded.limit.limit); })
            .catch(err => setError(err.message));
    }, []);

    // the notifications about the limit link here (/system-settings#mail-server)
    useEffect(() => {
        if (setup && hash === '#mail-server') panel.current?.scrollIntoView({ block: 'start' });
    }, [setup, hash]);

    if (!setup) return error ? <Message severity="error" text={error} /> : null;

    const saveLimit = async () => {
        setSavingLimit(true);
        try {
            const saved = await AdminService.saveMailLimit(perDay || null);
            setSetup(saved);
            setPerDay(saved.limit.limit);
            onSaved?.(saved.limit.limit ? t('At most {{count}} mails a day.', { count: saved.limit.limit }) : t('No daily mail limit.'));
        } catch (err) {
            setError(err.message);
        }
        setSavingLimit(false);
    };
    const { days, limit } = setup.limit;
    const today = days[0];
    const reachedDays = days.filter(entry => entry.reached).length;
    const most = Math.max(1, limit ?? 0, ...days.map(entry => entry.mails));

    const send = async () => {
        setSending(true);
        setResult(null);
        try {
            setResult({ ok: true, ...(await AdminService.sendTestMail(to.trim(), language)) });
        } catch (err) {
            setResult({ ok: false, message: err.message, code: err.data?.code, detail: err.data?.detail });
        }
        setSending(false);
    };

    const rows = [
        [t('Server'), setup.host ? `${setup.host}:${setup.port}` : null],
        [t('Encryption'), setup.encryption === 'tls' ? t('SSL/TLS') : t('STARTTLS')],
        [t('Login'), setup.user ? `${setup.user}${setup.password ? '' : ` (${t('no password')})`}` : t('None')],
        [t('Sender'), setup.from],
        [t('Address of the app'), setup.appUrl],
    ];

    return (
        <div ref={panel} id="mail-server" className="scroll-anchor">
        <Panel header={t('Mail server')}>
            <div className="d-flex flex-column gap-3">
                <span className="text-subtle fs-7">
                    {t('How this installation sends mails. The settings come from its environment (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM and APP_URL); after a change the API has to be restarted.')}
                </span>
                <div className="d-flex align-items-center gap-2">
                    <Tag value={setup.configured ? t('Configured') : t('Not configured')} severity={setup.configured ? 'success' : 'warning'} />
                    {!!setup.missing.length && <span className="text-faint fs-8">{t('Missing: {{settings}}', { settings: setup.missing.join(', ') })}</span>}
                </div>
                <dl className="m-0 d-grid gap-2 mail-server-setup">
                    {rows.map(([label, value]) => (
                        <div key={label} style={{ display: 'contents' }}>
                            <dt className="text-subtle fw-normal fs-7">{label}</dt>
                            <dd className="text-default m-0 fs-7 text-break">{value ?? <span className="text-faint">{t('Not set')}</span>}</dd>
                        </div>
                    ))}
                </dl>

                <span className="text-default fw-semibold fs-7 mt-2">{t('Daily limit')}</span>
                <span className="text-subtle fs-8">
                    {t('Many mail providers send only so many mails a day (e.g. 300). Close to the limit the global admins hear it; once it is reached, no more mails are sent that day (not later either). A mail server that refuses mails for its own limit counts as reached too.')}
                </span>
                <div className="d-flex flex-wrap align-items-center gap-3">
                    <InputNumber
                        inputId="mail-limit"
                        value={perDay}
                        onValueChange={(event) => setPerDay(event.value)}
                        min={1}
                        max={1000000}
                        placeholder={t('No limit')}
                        suffix={` ${t('mails a day')}`}
                        aria-label={t('Daily limit')}
                        inputClassName="mail-limit-input"
                    />
                    <Button label={t('Save')} icon="pi pi-save" size="small" loading={savingLimit} disabled={(perDay || null) === (limit || null)} onClick={saveLimit} />
                </div>
                <div className="d-flex flex-column gap-2">
                    <span className="text-default fs-7">
                        {limit ? t('Today: {{count}} of {{limit}} mails', { count: today.mails, limit }) : tn(today.mails, 'Today: {{count}} mail', 'Today: {{count}} mails')}
                        {today.reached && <Tag value={t('Limit reached')} severity="danger" className="ms-2" />}
                    </span>
                    <div className="mail-days" aria-label={t('Mails of the last 7 days')}>
                        {[...days].reverse().map(entry => (
                            <span key={entry.day} className={`mail-day ${entry.reached ? 'is-reached' : ''}`} title={`${formatDate(entry.day)}: ${tn(entry.mails, '{{count}} mail', '{{count}} mails')}${entry.heldBack ? ` · ${t('{{count}} not sent', { count: entry.heldBack })}` : ''}`}>
                                <span className="mail-day-bar"><span style={{ height: `${(entry.mails / most) * 100}%` }} /></span>
                                <span className="mail-day-count">{entry.mails}</span>
                                <span className="mail-day-label">{formatDate(entry.day, { year: 'none' })}</span>
                            </span>
                        ))}
                    </div>
                    <span className="text-faint fs-8">
                        {reachedDays
                            ? t('The limit was reached on {{count}} of the last 7 days; {{held}} mails were not sent.', { count: reachedDays, held: days.reduce((sum, entry) => sum + entry.heldBack, 0) })
                            : t('The limit was not reached in the last 7 days.')}
                    </span>
                </div>

                <span className="text-default fw-semibold fs-7 mt-2">{t('Send a test mail')}</span>
                <div className="d-flex flex-column gap-1">
                    <label htmlFor="test-mail-to" className="text-subtle fs-8">{t('To')}</label>
                    <InputText id="test-mail-to" type="email" value={to} onChange={(event) => setTo(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && setup.configured && to.trim() && send()} placeholder={t('name@example.com')} />
                </div>
                <div className="d-flex flex-column gap-1">
                    <span className="text-subtle fs-8">{t('Language')}</span>
                    <SelectButton
                        value={language}
                        options={LANGUAGES}
                        optionLabel="label"
                        optionValue="code"
                        onChange={(event) => event.value && setLanguage(event.value)}
                        className="p-selectbutton-pills flex-wrap"
                        aria-label={t('Language of the test mail')}
                    />
                </div>
                {result?.ok &&
                    <Message
                        severity="success"
                        className="w-100 justify-content-start"
                        content={(
                            <div className="d-flex flex-column gap-1">
                                <span>{t('The mail server took the test mail for {{to}} ({{ms}} ms). Check the inbox, and the spam folder.', { to: result.sentTo, ms: result.ms })}</span>
                                {result.response && <span className="fs-8 text-subtle mail-server-answer">{t('Answer of the server:')}{' '}<code>{result.response}</code></span>}
                            </div>
                        )}
                    />}
                {result && !result.ok &&
                    <Message
                        severity="error"
                        className="w-100 justify-content-start"
                        content={(
                            <div className="d-flex flex-column gap-1">
                                <span>{result.message}</span>
                                {(result.detail || result.code) && <span className="fs-8 mail-server-answer">{t('Answer of the server:')}{' '}<code>{[result.code, result.detail].filter(Boolean).join(' · ')}</code></span>}
                            </div>
                        )}
                    />}
                {!setup.configured && <Message severity="info" className="w-100 justify-content-start" text={t('Mail is not set up on this installation: no mails are sent. You can still prepare the texts.')} />}
                <div className="d-flex justify-content-end">
                    <Button label={t('Send test mail')} icon="pi pi-send" size="small" loading={sending} disabled={!setup.configured || !to.trim()} onClick={send} />
                </div>
            </div>
        </Panel>
        </div>
    );
};

export default MailServer;
