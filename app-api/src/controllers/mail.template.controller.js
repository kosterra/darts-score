import logger from '../models/logger.model.js';
import { LIMITS, MAIL_LANGUAGES, MAIL_TEMPLATES, defaultsOf, effectiveTemplate, overrideKey, renderMail, sampleVars, templateError } from '../utils/mail.templates.js';
import { getTemplateOverrides, saveTemplateOverride } from '../utils/mail.service.js';
import { explainMailError, getAppUrl, isMailConfigured, mailSetup, sendMail } from '../utils/mail.utils.js';
import { mailDays, saveMailLimit } from '../utils/mail.limit.js';
import { TEST_MAIL } from '../utils/mail.languages.js';
import { dateTimeIn } from '../utils/notify.js';

// the language of the texts worked on (?language=de), English by default
const languageOf = (req) => (MAIL_LANGUAGES.includes(req.query.language) ? req.query.language : 'en');
const draftOf = (body) => ({ subject: String(body?.subject ?? ''), body: String(body?.body ?? ''), button: String(body?.button ?? '') });
const known = (req, res) => {
    if (MAIL_TEMPLATES.some(template => template.id === req.params.id)) return true;
    res.status(404).json({ message: 'There is no such mail.' });
    return false;
};

/**
 * The mails of the app for the global admins, in one language: each with
 * what it is for, its placeholders, the default and the text it has now.
 * Every user gets the mails in their own language.
 */
export const list = async (req, res) => {
    const language = languageOf(req);
    const overrides = await getTemplateOverrides();
    res.json({
        mailEnabled: isMailConfigured(),
        limits: LIMITS,
        language,
        languages: MAIL_LANGUAGES,
        templates: MAIL_TEMPLATES.map(({ id, title, description, placeholders }) => ({
            id, title, description,
            placeholders: placeholders.map(placeholder => (placeholder.key === 'validity' ? { ...placeholder, sample: sampleVars(id, language).validity } : placeholder)),
            defaults: defaultsOf(id, language),
            current: effectiveTemplate(id, overrides, language),
            customized: Boolean(overrides[overrideKey(id, language)]),
        })),
    });
};

export const save = async (req, res) => {
    if (!known(req, res)) return;
    const draft = draftOf(req.body);
    const error = templateError(req.params.id, draft);
    if (error) return res.status(422).json({ errors: [error] });
    await saveTemplateOverride(req.params.id, draft, languageOf(req));
    logger.info(`Mail template ${req.params.id} (${languageOf(req)}) changed by ${req.user.email}`);
    res.json({ current: draft, customized: true });
};

export const reset = async (req, res) => {
    if (!known(req, res)) return;
    await saveTemplateOverride(req.params.id, null, languageOf(req));
    logger.info(`Mail template ${req.params.id} (${languageOf(req)}) reset by ${req.user.email}`);
    res.json({ current: effectiveTemplate(req.params.id, {}, languageOf(req)), customized: false });
};

/**
 * The mail as it would look, from a draft, with sample values: { subject, text, html }.
 */
export const preview = async (req, res) => {
    if (!known(req, res)) return;
    const draft = draftOf(req.body);
    const error = templateError(req.params.id, draft);
    if (error) return res.status(422).json({ errors: [error] });
    const language = languageOf(req);
    res.json(renderMail(draft, { ...sampleVars(req.params.id, language), appUrl: getAppUrl() || sampleVars(req.params.id).appUrl }, language));
};

/**
 * Sends the draft with sample values to the global admin's own address.
 */
export const test = async (req, res) => {
    if (!known(req, res)) return;
    if (!isMailConfigured()) return res.status(409).json({ message: 'Mail is not set up on this installation.' });
    const draft = draftOf(req.body);
    const error = templateError(req.params.id, draft);
    if (error) return res.status(422).json({ errors: [error] });
    const language = languageOf(req);
    const mail = renderMail(draft, { ...sampleVars(req.params.id, language), firstname: req.user.firstname, appUrl: getAppUrl() }, language);
    try {
        await sendMail({ to: req.user.email, ...mail, subject: `[Test] ${mail.subject}` });
        res.json({ sentTo: req.user.email });
    } catch (err) {
        logger.error(err, 'Failed to send a test mail');
        res.status(424).json(explainMailError(err));
    }
};

/**
 * How mail is set up on this installation, without the password.
 */
export const setup = async (req, res) => res.json({ ...mailSetup(), limit: await mailDays(7) });

/**
 * The daily limit of the mail server ({ perDay }, null for none): close to it
 * the global admins hear it, at it no more mails are sent that day.
 */
export const saveLimit = async (req, res) => {
    const perDay = await saveMailLimit(req.body.perDay ?? null);
    logger.info(`Daily mail limit set to ${perDay ?? 'none'} by ${req.user.email}`);
    res.json({ ...mailSetup(), limit: await mailDays(7) });
};

/**
 * Sends a plain test mail to any address, in a language: whether mails get
 * through. Resolves to what the mail server answered, or why it failed.
 */
export const sendTest = async (req, res) => {
    if (!isMailConfigured()) return res.status(409).json({ message: 'Mail is not set up on this installation.' });
    const to = String(req.body.to).trim();
    const language = MAIL_LANGUAGES.includes(req.body.language) ? req.body.language : 'en';
    const { host, port } = mailSetup();
    const appUrl = getAppUrl();
    const mail = renderMail(TEST_MAIL[language], {
        firstname: req.user.firstname, date: dateTimeIn(language), server: `${host}:${port}`, link: appUrl, appUrl,
    }, language);
    const started = Date.now();
    try {
        const info = await sendMail({ to, ...mail });
        logger.info(`Test mail sent to ${to} by ${req.user.email}`);
        res.json({
            sentTo: to,
            response: info?.response ?? null,
            messageId: info?.messageId ?? null,
            rejected: info?.rejected ?? [],
            ms: Date.now() - started,
        });
    } catch (err) {
        logger.warn(`Test mail to ${to} by ${req.user.email} failed: ${err.code ?? ''} ${err.message}`);
        // 424, not 502: a proxy in front (e.g. Cloudflare) shows its own page for a 502, and the reason would be lost
        res.status(424).json({ ...explainMailError(err), ms: Date.now() - started });
    }
};
