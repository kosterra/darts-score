import logger from '../models/logger.model.js';
import { LIMITS, MAIL_TEMPLATES, effectiveTemplate, renderMail, sampleVars, templateError } from '../utils/mail.templates.js';
import { getTemplateOverrides, saveTemplateOverride } from '../utils/mail.service.js';
import { getAppUrl, isMailConfigured, sendMail } from '../utils/mail.utils.js';

const draftOf = (body) => ({ subject: String(body?.subject ?? ''), body: String(body?.body ?? ''), button: String(body?.button ?? '') });
const known = (req, res) => {
    if (MAIL_TEMPLATES.some(template => template.id === req.params.id)) return true;
    res.status(404).json({ message: 'There is no such mail.' });
    return false;
};

/**
 * The mails of the app for the global admins: each with what it is for, its
 * placeholders, the default and the text it has now.
 */
export const list = async (req, res) => {
    const overrides = await getTemplateOverrides();
    res.json({
        mailEnabled: isMailConfigured(),
        limits: LIMITS,
        templates: MAIL_TEMPLATES.map(({ id, title, description, placeholders, subject, body, button }) => ({
            id, title, description, placeholders,
            defaults: { subject, body, button },
            current: effectiveTemplate(id, overrides),
            customized: Boolean(overrides[id]),
        })),
    });
};

export const save = async (req, res) => {
    if (!known(req, res)) return;
    const draft = draftOf(req.body);
    const error = templateError(req.params.id, draft);
    if (error) return res.status(422).json({ errors: [error] });
    await saveTemplateOverride(req.params.id, draft);
    logger.info(`Mail template ${req.params.id} changed by ${req.user.email}`);
    res.json({ current: draft, customized: true });
};

export const reset = async (req, res) => {
    if (!known(req, res)) return;
    await saveTemplateOverride(req.params.id, null);
    logger.info(`Mail template ${req.params.id} reset by ${req.user.email}`);
    res.json({ current: effectiveTemplate(req.params.id), customized: false });
};

/**
 * The mail as it would look, from a draft, with sample values: { subject, text, html }.
 */
export const preview = async (req, res) => {
    if (!known(req, res)) return;
    const draft = draftOf(req.body);
    const error = templateError(req.params.id, draft);
    if (error) return res.status(422).json({ errors: [error] });
    res.json(renderMail(draft, { ...sampleVars(req.params.id), appUrl: getAppUrl() || sampleVars(req.params.id).appUrl }));
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
    const mail = renderMail(draft, { ...sampleVars(req.params.id), firstname: req.user.firstname, appUrl: getAppUrl() });
    try {
        await sendMail({ to: req.user.email, ...mail, subject: `[Test] ${mail.subject}` });
        res.json({ sentTo: req.user.email });
    } catch (err) {
        logger.error(err, 'Failed to send a test mail');
        res.status(502).json({ message: 'The mail could not be sent. Check the mail settings of the installation.' });
    }
};
