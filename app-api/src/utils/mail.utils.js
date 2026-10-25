import nodemailer from 'nodemailer';
import logger from '../models/logger.model.js';
import { checkMailLimit, countMail, noteLimitRefusal } from './mail.limit.js';

/**
 * Public address of the app, used for links in emails. It deliberately never
 * comes from request headers: those are attacker-controlled and would allow
 * sending a victim a reset link that points to a foreign site.
 */
export const getAppUrl = () => (process.env.APP_URL || process.env.UI_URL || '').replace(/\/+$/, '');

export const isMailConfigured = () => Boolean(process.env.SMTP_HOST && getAppUrl());

const DEFAULT_FROM = 'Legmate <no-reply@darts-score.local>';
const portOf = () => Number(process.env.SMTP_PORT) || 587;
const secureOf = () => (process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : portOf() === 465);

/**
 * How mail is set up, for the global admins: the server, port, encryption,
 * login and sender as the environment sets them, and what is missing. The
 * password never leaves the server, only whether there is one.
 */
export const mailSetup = () => {
    const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
    return {
        configured: isMailConfigured(),
        host: SMTP_HOST || null,
        port: portOf(),
        // SSL/TLS from the start (465) or STARTTLS once connected (587, 25)
        encryption: secureOf() ? 'tls' : 'starttls',
        user: SMTP_USER || null,
        password: Boolean(SMTP_PASSWORD),
        from: SMTP_FROM || DEFAULT_FROM,
        appUrl: getAppUrl() || null,
        missing: [!SMTP_HOST && 'SMTP_HOST', !getAppUrl() && 'APP_URL'].filter(Boolean),
    };
};

let transporter;

const getTransporter = () => {
    if (!transporter) {
        const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env;
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: portOf(),
            secure: secureOf(),
            ...(SMTP_USER && { auth: { user: SMTP_USER, pass: SMTP_PASSWORD } }),
            // a server that does not answer is reported within seconds, not after two minutes
            connectionTimeout: 15_000,
            greetingTimeout: 15_000,
            socketTimeout: 30_000,
        });
    }
    return transporter;
};

// never let the counting of mails get in the way of a mail
const quietly = (promise) => promise.catch(err => logger.warn(`Could not count a mail: ${err.message}`));

/**
 * Sends a mail, within the daily limit of the mail server (see mail.limit.js):
 * throws a MailLimitError once it is reached. Resolves to what the mail
 * server answered ({ response, messageId, accepted, rejected }).
 */
export const sendMail = async ({ to, subject, text, html, headers, replyTo }) => {
    await checkMailLimit();
    let info;
    try {
        info = await getTransporter().sendMail({
            from: process.env.SMTP_FROM || DEFAULT_FROM,
            to,
            subject,
            text,
            ...(html && { html }),
            ...(headers && { headers }),
            // a message of the contact form is answered to its sender
            ...(replyTo && { replyTo }),
        });
    } catch (err) {
        await quietly(noteLimitRefusal(err));
        throw err;
    }
    logger.info(`Sent "${subject}" mail to ${to}`);
    await quietly(countMail());
    return info;
};

/**
 * What a failed mail means, in words a global admin can act on, from the
 * error of nodemailer: the setting to look at. The server's own answer
 * goes along as the detail.
 */
export const explainMailError = (err) => {
    const code = err?.code ?? '';
    const said = `${err?.message ?? ''} ${err?.response ?? ''}`;
    const reason = (() => {
        if (code === 'ELIMIT') return 'The daily mail limit of this installation is reached: no more mails are sent today. Raise the limit under System settings → Mail server if your mail server allows more.';
        if (code === 'EAUTH') return 'The mail server refused the login. Check SMTP_USER and SMTP_PASSWORD.';
        if (code === 'EDNS' || /ENOTFOUND|EAI_AGAIN/.test(said)) return 'The name of the mail server was not found. Check SMTP_HOST.';
        if (/certificate|self[- ]signed|CERT_/i.test(said)) return 'The certificate of the mail server is not trusted. Check SMTP_HOST: use the name the certificate is for.';
        if (code === 'ETLS' || /wrong version number|ssl|tls/i.test(said)) return 'The encrypted connection failed. Check SMTP_SECURE: true for port 465, false for 587 (STARTTLS).';
        if (code === 'ETIMEDOUT' || /timeout|timed out/i.test(said)) return 'The mail server did not answer in time. Check SMTP_HOST and SMTP_PORT, and whether a firewall blocks the port.';
        if (code === 'ECONNECTION' || code === 'ESOCKET' || /ECONNREFUSED|ECONNRESET|EHOSTUNREACH/.test(said)) return 'The mail server could not be reached. Check SMTP_HOST and SMTP_PORT.';
        if (code === 'EENVELOPE' || [550, 551, 553, 554].includes(err?.responseCode)) return 'The mail server refused the sender or the recipient. Check SMTP_FROM: many servers only send from the address of the login.';
        return 'The mail could not be sent. Check the mail settings of the installation.';
    })();
    return { message: reason, code: code || null, detail: String(err?.response || err?.message || '').slice(0, 300) || null };
};
